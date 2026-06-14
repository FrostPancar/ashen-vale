// ASHEN VALE — Map Builder.
// Interactive editor for game maps & interiors: paint terrain, place props /
// NPCs / enemies / portals / buildings, author interactable dialog, preview in
// top-down 2D or 2.5D, and export to the importable ashen-vale-map@1 format.
import { Art } from '@/art.js';
import { buildAllMaps } from '@/maps.js';
import { DIALOGS } from '@/quests.js';
import {
  TILES, OBJECTS, OBJECT_CATEGORIES,
  previewCanvas, tileCanvas, entryFor, sprinkleEntries,
} from './catalog.js';
import {
  blankDoc, mapToDoc, exportJSON, importJSON, exportJS, gridSet, gridGet,
} from './serialize.js';
import { MapRenderer } from './render.js';

Art.init();

const $ = (s) => document.querySelector(s);
function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c);
  return n;
}

const GAME_MAPS = buildAllMaps();

const app = {
  doc: null,
  renderer: null,
  brush: null,            // {kind:'tile', ch} | {kind:'object', entry}
  tool: 'brush',
  selected: null,         // object | portal | building ref
  selKind: null,          // 'object' | 'portal' | 'building'
  hover: { x: -1, y: -1 },
  history: [],
  future: [],
  gesture: null,          // active pointer gesture state
};

/* ===================== boot ===================== */
function boot() {
  const saved = localStorage.getItem('mb_doc');
  app.doc = saved ? JSON.parse(saved) : blankDoc();
  const canvas = $('#canvas');
  app.renderer = new MapRenderer(canvas);
  sizeCanvas();
  app.renderer.fit(app.doc);

  buildTools();
  buildLibrary();
  buildMapList();
  wireTopbar();
  wireCanvas();
  wireExport();
  renderInspector();
  render();

  new ResizeObserver(() => { sizeCanvas(); render(); }).observe($('#stage'));
  window.addEventListener('keydown', onKey);
}

function sizeCanvas() {
  const stage = $('#stage');
  const c = $('#canvas');
  c.width = stage.clientWidth;
  c.height = stage.clientHeight;
  c.getContext('2d').imageSmoothingEnabled = false;
}

/* ===================== tools ===================== */
const TOOLS = [
  { id: 'brush', ico: '✎', name: 'Brush' },
  { id: 'select', ico: '➤', name: 'Select' },
  { id: 'erase', ico: '⌫', name: 'Erase' },
  { id: 'pick', ico: '⊙', name: 'Pick' },
  { id: 'building', ico: '⌂', name: 'Building' },
  { id: 'portal', ico: '⬡', name: 'Portal' },
];
function buildTools() {
  const root = $('#tools'); root.innerHTML = '';
  for (const t of TOOLS) {
    root.append(el('button', {
      class: 'btn' + (app.tool === t.id ? ' active' : ''),
      'data-tool': t.id,
      onclick: () => setTool(t.id),
    }, [el('span', { class: 'ico', text: t.ico }), el('span', { text: t.name })]));
  }
}
function setTool(id) {
  app.tool = id;
  if (id !== 'select') { app.selected = null; app.selKind = null; renderInspector(); }
  buildTools(); render(); status(`Tool: ${id}`);
}

/* ===================== asset library ===================== */
let libTab = 'Terrain';
function buildLibrary() {
  const tabs = $('#lib-tabs'); tabs.innerHTML = '';
  for (const name of ['Terrain', ...OBJECT_CATEGORIES, 'Sprinkles']) {
    tabs.append(el('button', {
      class: libTab === name ? 'active' : '',
      text: name,
      onclick: () => { libTab = name; buildLibrary(); },
    }));
  }
  const grid = $('#lib-grid'); grid.innerHTML = '';
  if (libTab === 'Terrain') {
    for (const t of TILES) grid.append(tileAsset(t));
  } else if (libTab === 'Sprinkles') {
    const list = sprinkleEntries();
    if (!list.length) grid.append(el('p', { class: 'hint', text: 'No sprinkles loaded.' }));
    for (const o of list) grid.append(objAsset(o));
  } else {
    for (const o of OBJECTS.filter(o => o.category === libTab)) grid.append(objAsset(o));
  }
}
function tileAsset(t) {
  const active = app.brush?.kind === 'tile' && app.brush.ch === t.ch;
  const node = el('div', { class: 'asset' + (active ? ' active' : ''), title: `${t.label} (${t.ch})`,
    onclick: () => { app.brush = { kind: 'tile', ch: t.ch }; setTool('brush'); buildLibrary(); } });
  const cv = tileCanvas(t.tex);
  if (cv) node.append(cloneCanvas(cv));
  node.append(el('span', { class: 'nm', text: t.label }));
  return node;
}
function objAsset(o) {
  const active = app.brush?.kind === 'object' && app.brush.entry.type === o.type;
  const node = el('div', { class: 'asset' + (active ? ' active' : ''), title: o.label,
    onclick: () => { app.brush = { kind: 'object', entry: o }; setTool('brush'); buildLibrary(); } });
  const cv = previewCanvas(o);
  if (cv) node.append(cloneCanvas(cv));
  node.append(el('span', { class: 'nm', text: o.label }));
  if (o.interactable) node.append(el('span', { class: 'b', text: '!', style: `color:var(--accent);border-color:var(--accent)` }));
  return node;
}
function cloneCanvas(src) {
  const c = el('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/* ===================== map library ===================== */
function buildMapList() {
  const list = $('#map-list'); list.innerHTML = '';
  for (const m of Object.values(GAME_MAPS)) {
    const active = app.doc.id === m.id;
    list.append(el('div', { class: 'map-item' + (active ? ' active' : ''),
      onclick: () => loadGameMap(m.id) }, [
      el('span', { class: 'nm', text: m.name || m.id }),
      el('span', { class: 'tag' + (m.interior ? ' int' : ''), text: m.interior ? 'INT' : 'MAP' }),
    ]));
  }
}
function loadGameMap(id) {
  if (!confirm(`Load "${GAME_MAPS[id].name}" into the editor? Unsaved work in the canvas is replaced.`)) return;
  app.doc = mapToDoc(structuredClone(GAME_MAPS[id]));
  app.selected = null; app.selKind = null; app.history = []; app.future = [];
  app.renderer.fit(app.doc);
  buildMapList(); renderInspector(); render(); persist();
  status(`Loaded ${app.doc.name}. Rename the id before exporting to avoid clobbering the original.`);
}

/* ===================== topbar / view ===================== */
function wireTopbar() {
  $('#mode-seg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    app.renderer.cam.mode = b.dataset.mode;
    $('#mode-seg').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    render();
  }));
  $('#opt-grid').onchange = e => { app.renderer.opts.grid = e.target.checked; render(); };
  $('#opt-badges').onchange = e => { app.renderer.opts.badges = e.target.checked; render(); };
  $('#opt-structures').onchange = e => { app.renderer.opts.structures = e.target.checked; render(); };
  $('#opt-solids').onchange = e => { app.renderer.opts.solids = e.target.checked; render(); };
  $('#zoom-in').onclick = () => { app.renderer.cam.zoom = Math.min(2.5, app.renderer.cam.zoom * 1.2); render(); };
  $('#zoom-out').onclick = () => { app.renderer.cam.zoom = Math.max(0.3, app.renderer.cam.zoom / 1.2); render(); };
  $('#zoom-fit').onclick = () => { app.renderer.fit(app.doc); render(); };
  $('#undo').onclick = undo; $('#redo').onclick = redo;
  $('#reload-maps').onclick = buildMapList;
  $('#new-map').onclick = () => newDoc(false);
  $('#new-interior').onclick = () => newDoc(true);
}
function newDoc(interior) {
  const id = prompt(`New ${interior ? 'interior' : 'map'} id (a-z, _):`, interior ? 'my_interior' : 'my_map');
  if (!id) return;
  app.doc = blankDoc({ id: id.trim(), name: id.trim().toUpperCase().replace(/_/g, ' '), interior });
  app.selected = null; app.selKind = null; app.history = []; app.future = [];
  app.renderer.fit(app.doc);
  buildMapList(); renderInspector(); render(); persist();
}

/* ===================== canvas interaction ===================== */
function wireCanvas() {
  const c = $('#canvas');
  c.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  c.addEventListener('contextmenu', e => e.preventDefault());
  c.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    app.renderer.cam.zoom = Math.max(0.3, Math.min(2.5, app.renderer.cam.zoom * f));
    render();
  }, { passive: false });
}
function evtTile(e) {
  const r = $('#canvas').getBoundingClientRect();
  return app.renderer.toTile(e.clientX - r.left, e.clientY - r.top);
}
function onDown(e) {
  const { x, y } = evtTile(e);
  // middle / right drag = pan
  if (e.button === 1 || e.button === 2) {
    app.gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, px: app.renderer.cam.panX, py: app.renderer.cam.panY };
    return;
  }
  if (app.tool === 'brush') {
    if (!app.brush) { status('Pick an asset from the library first.'); return; }
    pushUndo();
    if (app.brush.kind === 'tile') { app.gesture = { type: 'paint' }; paintTile(x, y); }
    else { placeObject(x, y); app.gesture = { type: 'placed' }; }
  } else if (app.tool === 'erase') {
    pushUndo(); app.gesture = { type: 'erase' }; eraseAt(x, y);
  } else if (app.tool === 'pick') {
    pickAt(x, y);
  } else if (app.tool === 'select') {
    const hit = hitTest(x, y);
    selectRef(hit);
    if (hit) { // drag any non-terrain object: prop / npc / enemy / portal / building
      pushUndo();
      const g = { type: 'move', hit };
      const [ox, oy] = originOf(hit);
      g.offX = x - Math.floor(ox); g.offY = y - Math.floor(oy);
      if (hit.kind === 'building') { g.doorOffX = (hit.ref.door?.x ?? hit.ref.x) - hit.ref.x; g.doorOffY = (hit.ref.door?.y ?? hit.ref.y) - hit.ref.y; }
      app.gesture = g;
    }
  } else if (app.tool === 'building' || app.tool === 'portal') {
    app.gesture = { type: 'rect', kind: app.tool, x0: x, y0: y, x, y };
  }
  render();
}
function onMove(e) {
  const { x, y } = evtTile(e);
  app.hover = { x, y };
  const g = app.gesture;
  if (g) {
    if (g.type === 'pan') {
      app.renderer.cam.panX = g.px + (e.clientX - g.sx);
      app.renderer.cam.panY = g.py + (e.clientY - g.sy);
    } else if (g.type === 'paint') paintTile(x, y);
    else if (g.type === 'erase') eraseAt(x, y);
    else if (g.type === 'move') { moveRef(g, x, y); renderInspector(); }
    else if (g.type === 'rect') { g.x = x; g.y = y; }
  }
  render();
}
function onUp() {
  const g = app.gesture; app.gesture = null;
  if (g && g.type === 'rect') finalizeRect(g);
  if (g && g.type !== 'pan') { persist(); }
  render();
}

function paintTile(x, y) {
  if (gridGet(app.doc, x, y) === app.brush.ch) return;
  gridSet(app.doc, x, y, app.brush.ch);
}
function placeObject(x, y) {
  const o = app.brush.entry;
  const float = o.kind === 'npc' || o.kind === 'enemy';
  const obj = { kind: o.kind, type: o.type, x: float ? x + 0.5 : x, y: float ? y + 0.5 : y };
  if (o.kind === 'npc') { obj.sprite = o.sprite; obj.id = uniqueId(o.type); obj.dir = 'down'; obj.dialog = ''; obj.__dialogPages = []; }
  if (o.type === 'sign' || o.type === 'bookshelf') obj.text = '';
  if (o.type === 'chest') { obj.id = uniqueId('chest'); obj.loot = ''; }
  if (o.type === 'lever') { obj.id = uniqueId('lever'); obj.on = false; }
  if (o.type === 'gate' || o.type === 'gateBig') { obj.id = uniqueId('gate'); obj.w = 2; obj.openIf = ''; }
  app.doc.objects.push(obj);
  selectRef({ kind: 'object', ref: obj });
}
function uniqueId(base) {
  let i = 1, id;
  const used = new Set(app.doc.objects.map(o => o.id).filter(Boolean));
  do { id = `${base}_${i++}`; } while (used.has(id));
  return id;
}
function eraseAt(x, y) {
  const obj = app.renderer.objectAt(app.doc, x, y);
  if (obj) { app.doc.objects.splice(app.doc.objects.indexOf(obj), 1); if (app.selected === obj) selectRef(null); return; }
  const port = app.doc.portals.find(p => inRect(p, x, y));
  if (port) { app.doc.portals.splice(app.doc.portals.indexOf(port), 1); return; }
  gridSet(app.doc, x, y, app.doc.floor);
}
function pickAt(x, y) {
  const obj = app.renderer.objectAt(app.doc, x, y);
  if (obj) { const e = entryFor(obj); if (e) { app.brush = { kind: 'object', entry: e }; setTool('brush'); buildLibrary(); } return; }
  const ch = gridGet(app.doc, x, y);
  if (ch) { app.brush = { kind: 'tile', ch }; setTool('brush'); buildLibrary(); }
}
function hitTest(x, y) {
  const obj = app.renderer.objectAt(app.doc, x, y);
  if (obj) return { kind: 'object', ref: obj };
  const port = app.doc.portals.find(p => inRect(p, x, y));
  if (port) return { kind: 'portal', ref: port };
  const b = app.doc.buildings.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  if (b) return { kind: 'building', ref: b };
  return null;
}
function inRect(p, x, y) { return x >= p.x && x < p.x + (p.w || 1) && y >= p.y && y < p.y + (p.h || 1); }
function originOf(hit) {
  const r = hit.ref;
  if (hit.kind === 'object') return [r.x, r.y];
  return [r.x, r.y]; // portal / building: top-left
}
function moveRef(g, x, y) {
  const { hit } = g, r = hit.ref;
  const nx = x - g.offX, ny = y - g.offY;
  if (hit.kind === 'object') {
    const float = r.kind === 'npc' || r.kind === 'enemy';
    r.x = float ? nx + 0.5 : nx; r.y = float ? ny + 0.5 : ny;
  } else if (hit.kind === 'portal') {
    r.x = nx; r.y = ny;
  } else if (hit.kind === 'building') {
    r.x = nx; r.y = ny;
    if (r.door) { r.door.x = nx + g.doorOffX; r.door.y = ny + g.doorOffY; }
  }
}
function finalizeRect(g) {
  const x = Math.min(g.x0, g.x), y = Math.min(g.y0, g.y);
  const w = Math.abs(g.x - g.x0) + 1, h = Math.abs(g.y - g.y0) + 1;
  pushUndo();
  if (g.kind === 'building') {
    const b = { x, y, w, h, door: { x: x + (w >> 1), y: y + h - 1 }, label: 'BUILDING', to: '' };
    app.doc.buildings.push(b); selectRef({ kind: 'building', ref: b });
  } else {
    const p = { x, y, w, h, to: '', tx: 0, ty: 0 };
    app.doc.portals.push(p); selectRef({ kind: 'portal', ref: p });
  }
}
function selectRef(hit) {
  app.selected = hit ? hit.ref : null;
  app.selKind = hit ? hit.kind : null;
  renderInspector();
}

/* ===================== history ===================== */
function snapshot() { return structuredClone(app.doc); }
function pushUndo() { app.history.push(snapshot()); if (app.history.length > 60) app.history.shift(); app.future = []; }
function undo() {
  if (!app.history.length) return status('Nothing to undo.');
  app.future.push(snapshot()); app.doc = app.history.pop();
  app.selected = null; app.selKind = null; afterStructural();
}
function redo() {
  if (!app.future.length) return status('Nothing to redo.');
  app.history.push(snapshot()); app.doc = app.future.pop();
  app.selected = null; app.selKind = null; afterStructural();
}
function afterStructural() { buildMapList(); renderInspector(); render(); persist(); }

/* ===================== inspector ===================== */
function renderInspector() {
  const root = $('#inspector'); root.innerHTML = '';
  if (app.selKind === 'object') return inspectObject(root, app.selected);
  if (app.selKind === 'portal') return inspectPortal(root, app.selected);
  if (app.selKind === 'building') return inspectBuilding(root, app.selected);
  return inspectMap(root);
}
function setTitle(t) { $('#insp-title').textContent = t; }

function inspectMap(root) {
  setTitle('Map Settings');
  const d = app.doc;
  root.append(
    textField('id', 'Map id', d.id, v => { d.id = v; buildMapList(); }),
    textField('name', 'Display name', d.name, v => { d.name = v; }),
    boolField('Interior', d.interior, v => { d.interior = v; d.floor = v ? 'o' : '.'; d.ambient = v ? 'interior' : 'day'; render(); }),
    selectField('Ambient', d.ambient, ['day', 'dusk', 'night', 'interior', 'cave'], v => { d.ambient = v; }),
    textField('music', 'Music track', d.music, v => { d.music = v; }),
  );
  // size + resize
  const wIn = el('input', { type: 'number', value: d.w, min: 4, max: 120 });
  const hIn = el('input', { type: 'number', value: d.h, min: 4, max: 120 });
  root.append(
    el('div', { class: 'subhead', text: 'Dimensions' }),
    el('div', { class: 'field' }, [el('label', { text: 'Width × Height (tiles)' }),
      el('div', { class: 'row gap' }, [wIn, hIn,
        el('button', { class: 'btn sm', text: 'Resize', onclick: () => resizeDoc(+wIn.value, +hIn.value) })])]),
    el('p', { class: 'hint', text: `${d.objects.length} objects · ${d.portals.length} portals · ${d.buildings.length} buildings` }),
  );
  if (d.id && GAME_MAPS[d.id]) root.append(el('p', { class: 'hint', text: `↺ id "${d.id}" matches a built-in map — saving will OVERRIDE it in game. Rename to make a separate map.` }));
}
function resizeDoc(w, h) {
  w = Math.max(4, Math.min(120, w | 0)); h = Math.max(4, Math.min(120, h | 0));
  pushUndo();
  const ng = new Array(w * h).fill(app.doc.floor);
  for (let y = 0; y < Math.min(h, app.doc.h); y++)
    for (let x = 0; x < Math.min(w, app.doc.w); x++)
      ng[y * w + x] = app.doc.grid[y * app.doc.w + x];
  app.doc.grid = ng; app.doc.w = w; app.doc.h = h;
  app.renderer.fit(app.doc); afterStructural();
}

function inspectObject(root, obj) {
  const entry = entryFor(obj) || { label: obj.type, fields: [], interactable: false };
  setTitle(entry.label + (entry.interactable ? '  •  interactable' : ''));
  root.append(posFields(obj));
  for (const f of entry.fields) root.append(fieldFor(obj, f));
  // Current in-game dialog for NPCs whose `dialog` resolves to a quests.js entry.
  if (obj.kind === 'npc' && obj.dialog) {
    const pages = inGameDialog(obj.dialog);
    if (pages) root.append(dialogPreview(`In-game dialog · "${obj.dialog}"`, pages));
  }
  root.append(deleteBtn(() => removeFromList(app.doc.objects, obj)));
}

// Resolve a quests.js DIALOGS entry to its opening pages (read-only). These are
// functions that branch on game state, so we feed a permissive stub and take a
// best-effort snapshot; returns null if it isn't a static/previewable dialog.
const stubGame = () => {
  const noop = () => {};
  const flags = new Proxy({ stage: 0 }, { get: (t, p) => (p in t ? t[p] : 0) });
  const base = { flags, player: { klassName: 'Hero', name: 'Hero', klass: 'knight' }, party: [] };
  return new Proxy(base, { get: (t, p) => (p in t ? t[p] : noop) });
};
function inGameDialog(key) {
  const fn = DIALOGS[key];
  if (typeof fn !== 'function') return null;
  try {
    const conv = fn(stubGame());
    const pages = conv?.pages;
    return Array.isArray(pages) && pages.length ? pages : null;
  } catch { return null; }
}
function dialogPreview(title, pages) {
  return el('div', { class: 'dlg-preview' }, [
    el('div', { class: 'subhead', text: title },),
    ...pages.map(p => el('div', { class: 'dlg-line' }, [
      p.name ? el('b', { text: p.name + ': ' }) : null,
      el('span', { text: p.text || '' }),
    ])),
    el('p', { class: 'hint', text: 'Defined in quests.js — edit it there. Author override below to replace it on export.' }),
  ]);
}
function inspectPortal(root, p) {
  setTitle('Portal  •  interactable');
  root.append(
    el('div', { class: 'subhead', text: 'Destination' }),
    textField('to', 'Target map id', p.to, v => p.to = v),
    numField('Spawn X (tx)', p.tx, v => p.tx = v),
    numField('Spawn Y (ty)', p.ty, v => p.ty = v),
    el('div', { class: 'subhead', text: 'Footprint' }),
    numField('Width', p.w || 1, v => { p.w = v; render(); }),
    numField('Height', p.h || 1, v => { p.h = v; render(); }),
    el('div', { class: 'subhead', text: 'Lock (optional)' }),
    textField('requires', 'Requires flag', p.requires || '', v => p.requires = v || undefined),
    areaField('Lock message', p.lockMsg || '', v => p.lockMsg = v || undefined),
    deleteBtn(() => removeFromList(app.doc.portals, p)),
  );
}
function inspectBuilding(root, b) {
  setTitle('Building');
  root.append(
    textField('label', 'Label', b.label || '', v => { b.label = v; render(); }),
    textField('to', 'Interior map id (door → )', b.to || '', v => b.to = v),
    el('div', { class: 'subhead', text: 'Door tile' }),
    numField('Door X', b.door?.x ?? b.x, v => { b.door = { ...(b.door || {}), x: v }; render(); }),
    numField('Door Y', b.door?.y ?? b.y, v => { b.door = { ...(b.door || {}), y: v }; render(); }),
    deleteBtn(() => removeFromList(app.doc.buildings, b)),
  );
}
function removeFromList(list, ref) {
  pushUndo(); list.splice(list.indexOf(ref), 1); selectRef(null); render(); persist();
}

/* --- field widgets --- */
function posFields(obj) {
  return el('div', { class: 'row gap' }, [
    numField('X', obj.x, v => { obj.x = v; render(); }),
    numField('Y', obj.y, v => { obj.y = v; render(); }),
  ]);
}
function fieldFor(obj, f) {
  if (f.type === 'dialog') return dialogEditor(obj);
  if (f.type === 'textarea') return areaField(f.label, obj[f.key] || '', v => { obj[f.key] = v; render(); });
  if (f.type === 'bool') return boolField(f.label, !!obj[f.key], v => { obj[f.key] = v; render(); });
  if (f.type === 'number') return numField(f.label, obj[f.key] ?? '', v => { obj[f.key] = v; render(); });
  if (f.type === 'select') return selectField(f.label, obj[f.key] || '', f.options, v => { obj[f.key] = v; render(); });
  return textField(f.key, f.label, obj[f.key] || '', v => { obj[f.key] = v; render(); }, f.placeholder);
}
function textField(key, label, val, on, ph = '') {
  const i = el('input', { type: 'text', value: val, placeholder: ph });
  i.oninput = () => { on(i.value); persist(); };
  return el('div', { class: 'field' }, [el('label', { text: label }), i]);
}
function areaField(label, val, on) {
  const t = el('textarea', {}, val); t.value = val;
  t.oninput = () => { on(t.value); persist(); };
  return el('div', { class: 'field' }, [el('label', { text: label }), t]);
}
function numField(label, val, on) {
  const i = el('input', { type: 'number', value: val });
  i.oninput = () => { on(i.value === '' ? undefined : +i.value); persist(); };
  return el('div', { class: 'field' }, [el('label', { text: label }), i]);
}
function boolField(label, val, on) {
  const i = el('input', { type: 'checkbox' }); i.checked = val;
  i.onchange = () => { on(i.checked); persist(); };
  return el('div', { class: 'field inline' }, [i, el('label', { text: label })]);
}
function selectField(label, val, options, on) {
  const s = el('select', {}, options.map(o => el('option', { value: o, text: o || '(none)' })));
  s.value = val;
  s.onchange = () => { on(s.value); persist(); };
  return el('div', { class: 'field' }, [el('label', { text: label }), s]);
}

function dialogEditor(obj) {
  if (!Array.isArray(obj.__dialogPages)) obj.__dialogPages = [];
  const wrap = el('div', {}, [el('div', { class: 'subhead', text: 'Dialog box' })]);
  const pages = el('div');
  const redraw = () => {
    pages.innerHTML = '';
    obj.__dialogPages.forEach((pg, i) => {
      const name = el('input', { type: 'text', value: pg.name || '', placeholder: 'SPEAKER' });
      const txt = el('textarea', {}); txt.value = pg.text || ''; txt.placeholder = 'Line of dialog…';
      name.oninput = () => { pg.name = name.value; persist(); };
      txt.oninput = () => { pg.text = txt.value; persist(); };
      pages.append(el('div', { class: 'dlg-page' }, [
        el('div', { class: 'row' }, [name, el('button', { class: 'del', text: '✕', title: 'remove page',
          onclick: () => { obj.__dialogPages.splice(i, 1); redraw(); persist(); } })]),
        txt,
      ]));
    });
  };
  redraw();
  wrap.append(pages, el('button', { class: 'btn sm', text: '+ Add page',
    onclick: () => { obj.__dialogPages.push({ name: (obj.id || 'NPC').toUpperCase(), text: '' }); redraw(); persist(); } }));
  return wrap;
}
function deleteBtn(on) {
  return el('button', { class: 'btn', style: 'margin-top:14px;width:100%', text: '🗑 Delete', onclick: on });
}

/* ===================== export / import ===================== */
function wireExport() {
  $('#ex-download').onclick = () => {
    const json = exportJSON(app.doc);
    download(`${app.doc.id}.json`, JSON.stringify(json, null, 2));
    status(`Downloaded ${app.doc.id}.json`);
  };
  $('#ex-js').onclick = async () => {
    await navigator.clipboard.writeText(exportJS(app.doc));
    status('buildXxx() copied — paste into src/maps.js + register in buildAllMaps().');
  };
  $('#ex-save').onclick = saveToProject;
  $('#ex-import').onclick = () => $('#file-input').click();
  $('#file-input').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        app.doc = importJSON(JSON.parse(r.result));
        app.selected = null; app.selKind = null; app.history = []; app.future = [];
        app.renderer.fit(app.doc); afterStructural();
        status(`Imported ${app.doc.id}.`);
      } catch (err) { status('Import failed: ' + err.message); }
    };
    r.readAsText(file);
    e.target.value = '';
  };
}
async function saveToProject() {
  const json = exportJSON(app.doc);
  if (GAME_MAPS[app.doc.id]) {
    if (!confirm(`"${app.doc.id}" is a built-in map id. Saving writes src/maps/custom/${app.doc.id}.json, which will OVERRIDE the built-in map in game. Continue?`)) return;
  }
  try {
    const res = await fetch('/api/map-builder/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.doc.id, json }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || res.statusText);
    status(`Saved → ${out.path} (auto-loads in game).`);
  } catch (err) {
    status('Save failed (dev server only): ' + err.message + ' — use Download JSON instead.');
  }
}
function download(name, text) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a); a.click(); a.remove();
}

/* ===================== misc ===================== */
function persist() { localStorage.setItem('mb_doc', JSON.stringify(app.doc)); }
function status(msg) { $('#status').textContent = msg; }
function render() {
  app.renderer.draw(app.doc, { hover: app.hover, selected: app.selected });
  // live rect preview
  const g = app.gesture;
  if (g && g.type === 'rect') {
    const ctx = app.renderer.ctx, r = app.renderer;
    const x = Math.min(g.x0, g.x), y = Math.min(g.y0, g.y);
    const w = Math.abs(g.x - g.x0) + 1, h = Math.abs(g.y - g.y0) + 1;
    const [sx, sy] = r.s(x, y);
    ctx.strokeStyle = g.kind === 'portal' ? '#8effe6' : '#cdd0cb';
    ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.strokeRect(sx, sy, w * r.ts, h * r.ts * r.yScale);
    ctx.setLineDash([]);
  }
}
function onKey(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
  else if (e.key === 'Delete' && app.selected) { e.preventDefault();
    const list = app.selKind === 'object' ? app.doc.objects : app.selKind === 'portal' ? app.doc.portals : app.doc.buildings;
    removeFromList(list, app.selected);
  }
  else { const t = { b: 'brush', v: 'select', e: 'erase', i: 'pick' }[e.key.toLowerCase()]; if (t) setTool(t); }
}

boot();
