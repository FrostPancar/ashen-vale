// Audit MAP_SPRINKLES placements against real map geometry.
// Usage: node tools/audit-sprinkles.mjs
import { buildAllMaps } from '../src/maps.js';
import { TILDEF } from '../src/maps.js';
import { PATCH_DEFS, SPRINKLE_SPRITES } from '../src/areaArt.js';
import { MAP_SPRINKLES, SOLID_CHARS } from '../src/worldSprinkles.js';

const PATCH_BY_ID = Object.fromEntries(PATCH_DEFS.map(p => [p.id, p]));
const maps = buildAllMaps();
let issues = 0;
const warn = (map, msg) => { console.log(`  [${map}] ${msg}`); issues++; };

function cellOf(g, x, y) { return g.d[y * g.w + x]; }

function solidGrid(def) {
  const { w, h, d } = def.grid;
  const s = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = TILDEF[d[i]]?.solid ? 1 : 0;
  // gates/boulders block too
  for (const p of def.props || []) {
    if (p.type === 'gate' || p.type === 'gateBig') {
      for (let k = 0; k < (p.w || 1); k++) s[p.y * w + p.x + k] = 1;
    }
    if (p.type === 'boulder') s[p.y * w + p.x] = 1;
  }
  return s;
}

function bfs(s, w, h, sx, sy) {
  const seen = new Set();
  if (sx < 0 || sy < 0 || sx >= w || sy >= h || s[sy * w + sx]) return seen;
  const q = [[sx, sy]]; seen.add(sy * w + sx);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const i = ny * w + nx;
      if (s[i] || seen.has(i)) continue;
      seen.add(i); q.push([nx, ny]);
    }
  }
  return seen;
}

// solid prop types (block a tile when spawned)
const SOLID_PROPS = new Set(['sign','chest','dummy','grave','fountain','table','bed','bookshelf','fireplace','plant','lamp','anvil','rack','bench','shrine','stall']);

for (const [mapId, plan] of Object.entries(MAP_SPRINKLES)) {
  console.log(`-- ${mapId}`);
  const def = maps[mapId];
  if (!def) { warn(mapId, 'unknown map id'); continue; }
  const g = def.grid;
  const solidBefore = solidGrid(def);
  const solid = new Uint8Array(solidBefore);

  // occupied cells from map content
  const occupied = new Map(); // idx -> label
  for (const b of def.buildings || []) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) occupied.set(y * g.w + x, `building ${b.label}`);
    occupied.set(b.door.y * g.w + b.door.x, `door ${b.label}`);
    occupied.set((b.door.y + 1) * g.w + b.door.x, `door apron ${b.label}`);
  }
  for (const p of def.portals || []) {
    for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) occupied.set(y * g.w + x, 'portal');
  }
  for (const p of def.props || []) occupied.set(Math.floor(p.y) * g.w + Math.floor(p.x), `prop ${p.type}`);
  for (const n of def.npcs || []) occupied.set(Math.floor(n.y) * g.w + Math.floor(n.x), `npc ${n.id}`);
  for (const e of def.enemies || []) occupied.set(Math.floor(e.y) * g.w + Math.floor(e.x), `enemy ${e.type}`);

  const patchCells = new Map(); // idx -> patch id (cross-patch overlap)
  for (const pl of plan.patches || []) {
    const pd = PATCH_BY_ID[pl.id];
    if (!pd) { warn(mapId, `${pl.id}: unknown patch`); continue; }
    const pw = pd.rows[0].length, ph = pd.rows.length;
    if (pl.x < 0 || pl.y < 0 || pl.x + pw > g.w || pl.y + ph > g.h) {
      warn(mapId, `${pl.id} at ${pl.x},${pl.y}: out of bounds (${pw}x${ph} in ${g.w}x${g.h})`);
      continue;
    }
    // stamped tiles
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const ch = pd.rows[y][x];
      const tx = pl.x + x, ty = pl.y + y, idx = ty * g.w + tx;
      if (ch !== '.' && ch !== ' ') {
        const under = cellOf(g, tx, ty);
        if (occupied.has(idx)) warn(mapId, `${pl.id}: tile '${ch}' at ${tx},${ty} overlaps ${occupied.get(idx)}`);
        if (SOLID_CHARS.has(ch) && (under === 'p' || under === 't' || under === 'b' || under === 'S')) warn(mapId, `${pl.id}: solid '${ch}' stamps over walk tile '${under}' at ${tx},${ty}`);
        if (TILDEF[under]?.solid && !SOLID_CHARS.has(ch)) warn(mapId, `${pl.id}: floor '${ch}' stamps over solid '${under}' at ${tx},${ty}`);
        if (SOLID_CHARS.has(ch)) solid[idx] = 1;
      }
      if (patchCells.has(idx) && ch !== '.' && ch !== ' ') warn(mapId, `${pl.id}: overlaps patch ${patchCells.get(idx)} at ${tx},${ty}`);
      if (ch !== '.' && ch !== ' ') patchCells.set(idx, pl.id);
    }
    // props
    for (const pr of pd.props) {
      const tx = pl.x + pr.x, ty = pl.y + pr.y, idx = ty * g.w + tx;
      const under = cellOf(g, tx, ty);
      const stamped = pd.rows[pr.y]?.[pr.x];
      const floorStamped = stamped && stamped !== '.' && stamped !== ' ' && !SOLID_CHARS.has(stamped);
      if (TILDEF[under]?.solid && !floorStamped && !['lilyPad','duck','frog','fishspot','reedCluster'].includes(pr.type)) {
        warn(mapId, `${pl.id}: prop ${pr.type} at ${tx},${ty} sits on solid '${under}'`);
      }
      if (occupied.has(idx)) warn(mapId, `${pl.id}: prop ${pr.type} at ${tx},${ty} overlaps ${occupied.get(idx)}`);
      if (SOLID_PROPS.has(pr.type) || SPRINKLE_SPRITES[pr.type]) {
        // fine; solidity handled in engine
      }
    }
  }
  const WATER_OK = new Set(['lilyPad', 'duck', 'frog', 'fishspot', 'reedCluster']);
  for (const e of plan.extras || []) {
    const idx = Math.floor(e.y) * g.w + Math.floor(e.x);
    const under = cellOf(g, Math.floor(e.x), Math.floor(e.y));
    if (TILDEF[under]?.solid && !(under === 'w' && WATER_OK.has(e.type))) warn(mapId, `extra ${e.type} at ${e.x},${e.y} on solid '${under}'`);
    if (occupied.has(idx)) warn(mapId, `extra ${e.type} at ${e.x},${e.y} overlaps ${occupied.get(idx)}`);
  }

  // reachability: all portals + doors mutually reachable after stamps
  const seeds = [];
  for (const p of def.portals || []) seeds.push([Math.floor(p.x + (p.w || 1) / 2), Math.floor(p.y + (p.h || 1) / 2)]);
  for (const b of def.buildings || []) seeds.push([b.door.x, b.door.y + 1]);
  if (seeds.length >= 2) {
    const reachBefore = bfs(solidBefore, g.w, g.h, seeds[0][0], seeds[0][1]);
    const reach = bfs(solid, g.w, g.h, seeds[0][0], seeds[0][1]);
    for (const [sx, sy] of seeds.slice(1)) {
      const i = sy * g.w + sx;
      if (reachBefore.has(i) && !reach.has(i)) warn(mapId, `seed ${sx},${sy} unreachable after stamps`);
    }
  }
}
console.log(issues ? `\n${issues} issues` : '\nALL CLEAN');
