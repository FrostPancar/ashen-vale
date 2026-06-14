// ASHEN VALE — Map Builder serialization.
// Converts between three representations:
//   doc   — the editor's working model (flat char grid + unified objects list)
//   map   — the runtime shape buildAllMaps() produces (used for live preview)
//   json  — the exported ashen-vale-map@1 artifact (rows + split arrays + dialogs)
import { CUSTOM_MAP_SCHEMA } from '@/customMaps.js';

const FLOAT_KINDS = new Set(['npc', 'enemy']); // centered on tile in game coords

/* ---------- empty doc ---------- */
export function blankDoc({ id = 'new_map', name = 'NEW MAP', w = 24, h = 18, interior = false } = {}) {
  const floor = interior ? 'o' : '.';
  const grid = new Array(w * h).fill(floor);
  if (interior) { // frame walls like interior() does
    for (let x = 0; x < w; x++) { grid[x] = 'W'; grid[(h - 1) * w + x] = 'W'; }
    for (let y = 0; y < h; y++) { grid[y * w] = 'W'; grid[y * w + w - 1] = 'W'; }
  }
  return {
    id, name, w, h, interior, floor,
    ambient: interior ? 'interior' : 'day',
    music: 'town',
    grid,
    objects: [],
    buildings: [],
    portals: [],
  };
}

export function gridGet(doc, x, y) {
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return null;
  return doc.grid[y * doc.w + x];
}
export function gridSet(doc, x, y, ch) {
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return;
  doc.grid[y * doc.w + x] = ch;
}

/* ---------- doc -> map (runtime/preview) ---------- */
export function docToMap(doc) {
  const props = [], npcs = [], enemies = [];
  for (const obj of doc.objects) {
    if (obj.kind === 'npc') npcs.push(stripNpc(obj));
    else if (obj.kind === 'enemy') enemies.push({ type: obj.type, x: obj.x, y: obj.y });
    else props.push(stripProp(obj));
  }
  return {
    id: doc.id, name: doc.name,
    grid: { w: doc.w, h: doc.h, d: doc.grid.slice() },
    ambient: doc.ambient, music: doc.music, interior: !!doc.interior,
    buildings: doc.buildings.map(b => ({ ...b })),
    portals: doc.portals.map(p => clean(p)),
    props, npcs, enemies,
  };
}

function stripProp(obj) {
  const out = { type: obj.type, x: obj.x, y: obj.y };
  for (const k of ['id', 'text', 'loot', 'on', 'ifFlag', 'w', 'h', 'openIf']) if (obj[k] != null && obj[k] !== '') out[k] = obj[k];
  return out;
}
function stripNpc(obj) {
  const out = { id: obj.id || obj.type, sprite: obj.sprite || obj.type, x: obj.x, y: obj.y, dir: obj.dir || 'down' };
  if (obj.wander) out.wander = Number(obj.wander);
  if (obj.service) out.service = obj.service;
  out.dialog = obj.dialog || obj.id || obj.type;
  return out;
}
function clean(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v != null && v !== '') out[k] = v;
  return out;
}

/* ---------- map -> doc (load existing game map into editor) ---------- */
export function mapToDoc(map) {
  const objects = [];
  for (const p of map.props || []) objects.push({ kind: 'prop', ...p });
  for (const n of map.npcs || []) objects.push({ kind: 'npc', sprite: n.sprite, ...n });
  for (const e of map.enemies || []) objects.push({ kind: 'enemy', ...e });
  return {
    id: map.id, name: map.name,
    w: map.grid.w, h: map.grid.h,
    interior: !!map.interior,
    floor: map.interior ? 'o' : '.',
    ambient: map.ambient || (map.interior ? 'interior' : 'day'),
    music: map.music || 'town',
    grid: map.grid.d.slice(),
    objects,
    buildings: (map.buildings || []).map(b => ({ ...b })),
    portals: (map.portals || []).map(p => ({ ...p })),
  };
}

/* ---------- doc -> rows (string per row) ---------- */
export function docToRows(doc) {
  const rows = [];
  for (let y = 0; y < doc.h; y++) rows.push(doc.grid.slice(y * doc.w, y * doc.w + doc.w).join(''));
  return rows;
}

/* ---------- doc -> exported JSON ---------- */
export function exportJSON(doc) {
  const map = docToMap(doc);
  const dialogs = {};
  // Authored NPC conversations -> dialogs table; rewrite npc.dialog to the key.
  for (const obj of doc.objects) {
    if (obj.kind !== 'npc') continue;
    const pages = obj.__dialogPages;
    if (Array.isArray(pages) && pages.length) {
      const key = obj.dialog || `${doc.id}_${obj.id || obj.type}`;
      const entry = { pages: pages.map(p => ({ name: p.name || '', text: p.text || '' })) };
      if (obj.service) entry.shop = obj.service;
      dialogs[key] = entry;
      const target = map.npcs.find(n => (n.id === (obj.id || obj.type)) && n.x === obj.x && n.y === obj.y);
      if (target) target.dialog = key;
    }
  }
  return {
    schema: CUSTOM_MAP_SCHEMA,
    id: doc.id,
    name: doc.name,
    interior: !!doc.interior,
    floor: doc.floor,
    ambient: doc.ambient,
    music: doc.music,
    w: doc.w,
    h: doc.h,
    rows: docToRows(doc),
    buildings: map.buildings,
    portals: map.portals,
    props: map.props,
    npcs: map.npcs,
    enemies: map.enemies,
    dialogs,
  };
}

/* ---------- exported JSON -> doc (import) ---------- */
export function importJSON(json) {
  const w = json.w || (json.rows ? Math.max(...json.rows.map(r => r.length)) : 0);
  const h = json.h || (json.rows ? json.rows.length : 0);
  const fill = json.interior ? (json.floor || 'o') : '.';
  const grid = new Array(w * h).fill(fill);
  (json.rows || []).forEach((row, y) => {
    for (let x = 0; x < w; x++) grid[y * w + x] = row[x] || fill;
  });
  const objects = [];
  for (const p of json.props || []) objects.push({ kind: 'prop', ...p });
  for (const n of json.npcs || []) {
    const obj = { kind: 'npc', sprite: n.sprite, ...n };
    const dlg = json.dialogs?.[n.dialog];
    if (dlg) obj.__dialogPages = dlg.pages;
    objects.push(obj);
  }
  for (const e of json.enemies || []) objects.push({ kind: 'enemy', ...e });
  return {
    id: json.id, name: json.name || json.id,
    w, h, interior: !!json.interior, floor: fill,
    ambient: json.ambient || (json.interior ? 'interior' : 'day'),
    music: json.music || 'town',
    grid, objects,
    buildings: (json.buildings || []).map(b => ({ ...b })),
    portals: (json.portals || []).map(p => ({ ...p })),
  };
}

/* ---------- doc -> paste-ready buildXxx() JS for maps.js ---------- */
export function exportJS(doc) {
  const rows = docToRows(doc);
  const fnName = 'build' + doc.id.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
  const lit = (v) => JSON.stringify(v);
  const json = exportJSON(doc);
  const lines = [];
  lines.push(`function ${fnName}() {`);
  lines.push(`  const rows = [`);
  for (const r of rows) lines.push(`    ${lit(r)},`);
  lines.push(`  ];`);
  lines.push(`  const g = { w: ${doc.w}, h: ${doc.h}, d: rows.join('').split('') };`);
  lines.push(`  return {`);
  lines.push(`    id: ${lit(doc.id)}, name: ${lit(doc.name)}, grid: g,`);
  lines.push(`    ambient: ${lit(doc.ambient)}, music: ${lit(doc.music)}, interior: ${!!doc.interior},`);
  lines.push(`    buildings: ${lit(json.buildings)},`);
  lines.push(`    portals: ${lit(json.portals)},`);
  lines.push(`    props: ${lit(json.props)},`);
  lines.push(`    npcs: ${lit(json.npcs)},`);
  lines.push(`    enemies: ${lit(json.enemies)},`);
  lines.push(`  };`);
  lines.push(`}`);
  if (Object.keys(json.dialogs).length) {
    lines.push('');
    lines.push('// Add to DIALOGS in quests.js:');
    for (const [k, v] of Object.entries(json.dialogs)) {
      lines.push(`//   ${lit(k)}: (g) => (${lit(v)}),`);
    }
  }
  return lines.join('\n');
}
