// ASHEN VALE — map definitions. Terrain built with a tiny grid DSL.
// Tile chars: . grass : grass2 , tallgrass f flower p path s sand w water b bridge
// # tree ^ pine h bush F fence = cliff r cavewall c cavefloor _ void
// o wood t stonefloor m carpet W interior-wall S stairs C counter X citywall

export const TILDEF = {
  '.': { tex: 'grass', solid: false },
  ':': { tex: 'grass2', solid: false },
  ',': { tex: 'tallgrass', solid: false, grass: true },
  'f': { tex: 'flower', solid: false },
  'p': { tex: 'path', solid: false },
  's': { tex: 'sand', solid: false },
  'w': { tex: 'water', solid: true, water: true },
  'b': { tex: 'bridge', solid: false },
  '#': { tex: 'grass', solid: true, prop: 'tree' },
  '^': { tex: 'grass', solid: true, prop: 'pine' },
  'h': { tex: 'bush', solid: true },
  'F': { tex: 'fence', solid: true },
  '=': { tex: 'cliff', solid: true, tall: true },
  'r': { tex: 'cavewall', solid: true, tall: true },
  'c': { tex: 'cavefloor', solid: false },
  '_': { tex: 'void', solid: true },
  'o': { tex: 'wood', solid: false },
  't': { tex: 'stonefloor', solid: false },
  'm': { tex: 'carpet', solid: false },
  'W': { tex: 'iwall', solid: true, tall: true },
  'S': { tex: 'stairs', solid: false },
  'C': { tex: 'counter', solid: true, tall: true },
  'X': { tex: 'citywall', solid: true, tall: true },
};

// Biome scatter tables — density fractions applied to open ground tiles.
// Procedural generators and the sprinkle system import this to stay consistent.
export const BIOME_SCATTER = {
  vale_meadow:      { '#': 0.04, '^': 0.01, 'f': 0.02, ',': 0.01, 'h': 0.008 },
  hollow_thornwood: { '#': 0.06, '^': 0.03, ',': 0.03, 'h': 0.02 },
  ash_scrub:        { 's': 0.15, ':': 0.08, 'h': 0.01, '#': 0.005 },
  cave:             {}, // manual carving only
};

/* ---------- grid DSL ---------- */
function G(w, h, fill) {
  const d = [];
  for (let i = 0; i < w * h; i++) d.push(fill);
  return { w, h, d };
}
function set(g, x, y, ch) { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = ch; }
function get(g, x, y) { return g.d[y * g.w + x]; }
function rect(g, x, y, w, h, ch) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(g, i, j, ch); }
function frame(g, x, y, w, h, ch) {
  for (let i = x; i < x + w; i++) { set(g, i, y, ch); set(g, i, y + h - 1, ch); }
  for (let j = y; j < y + h; j++) { set(g, x, j, ch); set(g, x + w - 1, j, ch); }
}
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function scatter(g, ch, n, seed, onlyOn = '.') {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (r() * g.w) | 0, y = (r() * g.h) | 0;
    if (onlyOn.includes(get(g, x, y))) set(g, x, y, ch);
  }
}
function pathLine(g, x0, y0, x1, y1, wid = 2, ch = 'p') {
  // L-shaped path
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  for (let x = xa; x <= xb; x++) for (let k = 0; k < wid; k++) set(g, x, y0 + k, ch);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y++) for (let k = 0; k < wid; k++) set(g, x1 + k, y, ch);
}

/* =========================================================
   ELDERMOOR — starting town  (46 x 38)
   ========================================================= */
function buildTown() {
  const g = G(46, 38, '.');
  scatter(g, ':', 130, 5, '.');
  // tree border (double)
  rect(g, 0, 0, 46, 2, '#'); rect(g, 0, 36, 46, 2, '#');
  rect(g, 0, 0, 2, 38, '#'); rect(g, 44, 0, 2, 38, '#');
  scatter(g, '#', 22, 9, '.:');
  scatter(g, 'f', 14, 15, '.:');
  // north exit gap (to route1) at x=21..24
  rect(g, 21, 0, 4, 2, 'p');
  // plaza + paths
  rect(g, 18, 14, 10, 8, 'p');
  pathLine(g, 22, 2, 22, 14, 2, 'p');       // north road
  pathLine(g, 10, 12, 22, 16, 2, 'p');      // to elder
  pathLine(g, 22, 17, 33, 12, 2, 'p');      // to inn
  pathLine(g, 11, 27, 22, 21, 2, 'p');      // to shop
  pathLine(g, 22, 21, 33, 27, 2, 'p');      // to smithy
  // door aprons — every door opens onto path, no road dead-ends
  set(g, 9, 12, 'p'); set(g, 34, 11, 'p');
  set(g, 10, 27, 'p'); set(g, 35, 26, 'p');
  // hedges framing the north road
  rect(g, 19, 4, 1, 6, 'h'); rect(g, 26, 4, 1, 6, 'h');
  // flower beds at the plaza corners
  rect(g, 16, 13, 2, 2, 'f'); rect(g, 28, 13, 2, 2, 'f');
  rect(g, 16, 21, 2, 2, 'f'); rect(g, 28, 21, 2, 2, 'f');
  // pond bottom-left, fenced on the town side, sandy south shore
  rect(g, 4, 29, 9, 6, 'w');
  rect(g, 4, 28, 9, 1, 'F');
  rect(g, 4, 35, 9, 1, 's');
  // tall grass patch by the pond (cuttable)
  rect(g, 14, 31, 4, 3, ',');
  // training yard bottom-right
  rect(g, 35, 30, 8, 6, 's');
  frame(g, 34, 29, 10, 8, 'F');
  set(g, 36, 29, 's'); set(g, 37, 29, 's'); // yard opening
  // clear building footprints (no stray trees poking through roofs)
  const buildings = [
    { x: 5, y: 5, w: 9, h: 7, door: { x: 9, y: 11 }, label: 'ELDER HALL', to: 'elder_house' },
    { x: 30, y: 4, w: 10, h: 7, door: { x: 34, y: 10 }, label: 'INN', to: 'inn' },
    { x: 6, y: 21, w: 8, h: 6, door: { x: 10, y: 26 }, label: 'SHOP', to: 'shop' },
    { x: 32, y: 20, w: 8, h: 6, door: { x: 35, y: 25 }, label: 'SMITHY', to: 'smithy' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, '.');
  return {
    id: 'town', name: 'ELDERMOOR', grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [
      { x: 21, y: 0, w: 4, h: 1, to: 'route1', tx: 20, ty: 69, requires: 'tut_done', lockMsg: 'GUARD: "Hold, hero. Elder Maren asked for you first — her hall is west of the plaza."' },
    ],
    props: [
      { type: 'fountain', x: 22.5, y: 17.5 },
      { type: 'lamp', x: 18, y: 14 }, { type: 'lamp', x: 27, y: 14 },
      { type: 'lamp', x: 18, y: 21 }, { type: 'lamp', x: 27, y: 21 },
      { type: 'bench', x: 20, y: 21 }, { type: 'bench', x: 25, y: 21 },
      { type: 'bench', x: 15, y: 29 },
      { type: 'sign', x: 20, y: 13, text: 'ELDERMOOR — last lit hearth before the Hollow Road.' },
      { type: 'sign', x: 36, y: 28, text: 'TRAINING YARD — strike the dummies. LEFT CLICK to attack. SPACE for your heavy skill — it sends things FLYING.' },
      { type: 'chest', id: 'town_chest', x: 41, y: 4, loot: 'bundle:gold:18-28|potion:1|item:trinket:common' },
      { type: 'fishspot', x: 7, y: 34 },
      // knockable / breakable clutter
      { type: 'crate', x: 36, y: 31 }, { type: 'pot', x: 41, y: 31 }, { type: 'pot', x: 41, y: 34 },
      { type: 'pot', x: 19, y: 13 }, { type: 'barrel', x: 27, y: 13 },
      { type: 'crate', x: 28, y: 21 }, { type: 'barrel', x: 29, y: 21 },
      { type: 'pot', x: 12, y: 27 },
      { type: 'rock', x: 14, y: 30 },
    ],
    npcs: [
      { id: 'guard', sprite: 'guard', x: 22.5, y: 3.5, dir: 'down', dialog: 'guard' },
      { id: 'villager1', sprite: 'villager', x: 26, y: 19, wander: 3, dialog: 'villager1' },
      { id: 'villager2', sprite: 'villager2', x: 16, y: 24, wander: 3, dialog: 'villager2' },
      { id: 'kid', sprite: 'villager2', x: 30, y: 15, wander: 4, dialog: 'kid' },
    ],
    enemies: [
      { type: 'dummy', x: 37, y: 32 },
      { type: 'dummy', x: 40, y: 32 },
      { type: 'dummy', x: 38.5, y: 34.5 },
    ],
  };
}

/* =========================================================
   INTERIORS — Eldermoor
   ========================================================= */
function interior(id, name, w, h, floorCh, extra) {
  const g = G(w, h, floorCh);
  frame(g, 0, 0, w, h, 'W');
  const def = {
    id, name, grid: g, ambient: 'interior', music: 'town', interior: true,
    portals: [], props: [], npcs: [], enemies: [], buildings: [],
  };
  extra(g, def);
  return def;
}

function buildElderHouse() {
  return interior('elder_house', 'ELDER HALL', 14, 11, 'o', (g, def) => {
    rect(g, 5, 3, 4, 5, 'm');
    set(g, 6, 10, 'S'); set(g, 7, 10, 'S');
    def.portals.push({ x: 6, y: 10, w: 2, h: 1, to: 'town', tx: 9.5, ty: 12.5 });
    def.npcs.push({ id: 'elder', sprite: 'elder', x: 6.5, y: 3.2, dir: 'down', dialog: 'elder' });
    def.props.push(
      { type: 'fireplace', x: 6, y: 1 },
      { type: 'bookshelf', x: 2, y: 1, text: 'Histories of the Vale, vol. I–XII. Vol. VII is just pressed flowers.' },
      { type: 'bookshelf', x: 3, y: 1, text: '"On Wardens & Wards" — the margins are full of Maren\'s handwriting. Most of it says WRONG.' },
      { type: 'bookshelf', x: 10, y: 1, text: 'A ledger of every hero who passed through Eldermoor. The early pages are crossed out.' },
      { type: 'bed', x: 1, y: 2 },
      { type: 'table', x: 10, y: 5 }, { type: 'stool', x: 11, y: 6 },
      { type: 'plant', x: 12, y: 1 },
      { type: 'sign', x: 2, y: 5, text: 'Map of the Vale: Eldermoor — Hollow Road — Hollow Cave — ASHFALL.' },
    );
  });
}
function buildInn() {
  return interior('inn', 'THE DROWSY LANTERN', 14, 11, 'o', (g, def) => {
    rect(g, 5, 5, 4, 3, 'm');
    rect(g, 3, 3, 4, 1, 'C'); // bar counter, gap east of x=6
    set(g, 6, 10, 'S'); set(g, 7, 10, 'S');
    def.portals.push({ x: 6, y: 10, w: 2, h: 1, to: 'town', tx: 34.5, ty: 11.5 });
    def.npcs.push({ id: 'innkeeper', sprite: 'villager', x: 4.5, y: 2.2, dir: 'down', dialog: 'innkeeper', service: 'inn' });
    def.npcs.push({ id: 'patron', sprite: 'villager2', x: 10, y: 8, wander: 2, dialog: 'patron' });
    def.props.push(
      { type: 'bed', x: 1, y: 2 }, { type: 'bed', x: 1, y: 5 },
      { type: 'fireplace', x: 12, y: 1 },
      { type: 'table', x: 9, y: 5 }, { type: 'stool', x: 8, y: 5 }, { type: 'stool', x: 10, y: 6 },
      { type: 'table', x: 3, y: 7 }, { type: 'stool', x: 4, y: 8 },
      { type: 'plant', x: 9, y: 1 },
      { type: 'barrel', x: 12, y: 8 },
    );
  });
}
function buildShop() {
  return interior('shop', 'VALE GOODS', 12, 10, 'o', (g, def) => {
    rect(g, 2, 3, 8, 1, 'C'); set(g, 8, 3, 'o'); // counter with gap
    set(g, 5, 9, 'S'); set(g, 6, 9, 'S');
    def.portals.push({ x: 5, y: 9, w: 2, h: 1, to: 'town', tx: 10.5, ty: 27.5 });
    def.npcs.push({ id: 'merchant', sprite: 'merchant', x: 5.5, y: 2.2, dir: 'down', dialog: 'merchant', service: 'shop' });
    def.props.push(
      { type: 'bookshelf', x: 2, y: 1, text: 'Jars of pickled... something. The labels just say DO ASK.' },
      { type: 'bookshelf', x: 3, y: 1, text: 'Tonic crates, stacked with terrifying confidence.' },
      { type: 'plant', x: 10, y: 1 },
      { type: 'crate', x: 10, y: 7 }, { type: 'pot', x: 1, y: 7 }, { type: 'crate', x: 9, y: 7 },
    );
  });
}
function buildSmithy() {
  return interior('smithy', 'BRAM\'S FORGE', 12, 10, 't', (g, def) => {
    rect(g, 2, 2, 3, 2, 'W'); // forge block
    set(g, 5, 9, 'S'); set(g, 6, 9, 'S');
    def.portals.push({ x: 5, y: 9, w: 2, h: 1, to: 'town', tx: 35.5, ty: 26.5 });
    def.npcs.push({ id: 'smith', sprite: 'smith', x: 7.5, y: 3.2, dir: 'down', dialog: 'smith', service: 'smith' });
    def.props.push(
      { type: 'fireplace', x: 3, y: 4 },
      { type: 'anvil', x: 6, y: 4 },
      { type: 'rack', x: 8, y: 1 }, { type: 'rack', x: 10, y: 1 },
      { type: 'barrel', x: 1, y: 7 }, { type: 'crate', x: 10, y: 7 },
      { type: 'sign', x: 9, y: 4, text: '"A dull blade buries its owner." — Bram' },
    );
  });
}

/* =========================================================
   ROUTE 1 — THE HOLLOW ROAD  (40 x 72), south = town
   ========================================================= */
function buildRoute1() {
  const g = G(40, 72, '.');
  scatter(g, ':', 320, 6, '.');
  // forest borders
  rect(g, 0, 0, 40, 2, '#'); rect(g, 0, 0, 3, 72, '#'); rect(g, 37, 0, 3, 72, '#');
  rect(g, 0, 70, 40, 2, '#');
  scatter(g, '#', 80, 11, '.:');
  scatter(g, '^', 30, 12, '.:');
  scatter(g, 'f', 16, 17, '.:');
  // south entrance from town x=19..22
  rect(g, 19, 70, 4, 2, 'p');
  // one continuous road: town gate → bridge → bend east → north through the
  // cave-ward gate → forks west to Ashfall / east to the cave mouth
  rect(g, 20, 58, 2, 13, 'p');   // north from town gate
  rect(g, 10, 58, 12, 2, 'p');   // west
  rect(g, 10, 44, 2, 15, 'p');   // north over the bridge
  rect(g, 10, 44, 18, 2, 'p');   // east
  rect(g, 26, 42, 2, 3, 'p');    // jog north
  rect(g, 14, 42, 14, 2, 'p');   // west below the ledge
  rect(g, 14, 10, 2, 33, 'p');   // long north stretch (passes the gate at y=14)
  rect(g, 14, 10, 5, 2, 'p');    // east fork: to the cave mouth
  rect(g, 5, 10, 10, 2, 'p');    // west fork: to the Ashfall gate
  rect(g, 5, 8, 2, 2, 'p');      // through the big gate
  // tall grass fields (ambush zones)
  rect(g, 23, 54, 10, 6, ','); rect(g, 5, 36, 8, 6, ','); rect(g, 28, 22, 8, 6, ',');
  // river across map with bridge on road
  rect(g, 3, 50, 34, 3, 'w');
  rect(g, 10, 49, 2, 5, 'b');
  // ledge nook mid-map: cliff pocket, west entrance plugged by a boulder
  rect(g, 18, 34, 17, 1, '=');
  rect(g, 18, 40, 17, 1, '=');
  rect(g, 34, 34, 1, 7, '=');
  rect(g, 18, 35, 1, 5, '=');
  set(g, 18, 37, '.');           // the one gap — boulder sits in it
  rect(g, 19, 35, 15, 5, '.');   // clear the pocket of stray trees
  rect(g, 25, 36, 4, 3, ':');
  // keep the approach to the gap clear too
  rect(g, 16, 35, 2, 5, '.');
  // cave-ward gate: cliff wall across y=14, gate fills the only gap (x14..16)
  rect(g, 3, 14, 11, 1, '=');
  rect(g, 17, 14, 20, 1, '=');
  // cave mouth at top: rocky outcrop
  rect(g, 12, 4, 12, 6, 'r');
  rect(g, 17, 8, 2, 2, 'c'); set(g, 17, 9, 'S'); set(g, 18, 9, 'S');
  // ashfall gate — sandy clearing top-west, sealed until the Warden falls
  rect(g, 3, 5, 8, 3, 's');
  return {
    id: 'route1', name: 'THE HOLLOW ROAD', grid: g, ambient: 'day', music: 'route',
    buildings: [],
    portals: [
      { x: 19, y: 71, w: 4, h: 1, to: 'town', tx: 22, ty: 2 },
      { x: 17, y: 8, w: 2, h: 2, to: 'cave', tx: 18, ty: 26 },
      { x: 4, y: 5, w: 6, h: 2, to: 'ashfall', tx: 22, ty: 32.5, requires: 'warden_dead', lockMsg: 'The gates of Ashfall are sealed. Something in the Hollow Cave holds the wards shut.' },
    ],
    props: [
      { type: 'sign', x: 22, y: 66, text: 'NORTH: Hollow Cave — WEST PAST THE CAVE: Ashfall (gates sealed).' },
      { type: 'sign', x: 12, y: 49, text: 'Old bridge. Mind the slimes. They bite. Slowly, but they bite.' },
      { type: 'sign', x: 16, y: 35, text: 'The ledge nook hides what the road-toll men buried. Push what blocks the way.' },
      { type: 'boulder', id: 'b1', x: 18, y: 37 },
      { type: 'chest', id: 'route_chest1', x: 31, y: 37, loot: 'milestone:road_keeper' },
      { type: 'chest', id: 'route_chest2', x: 6, y: 60, loot: 'bundle:gold:35-50|item:trinket:magic:spd+crit' },
      { type: 'chest', id: 'route_chest3', x: 33, y: 20, loot: 'bundle:potion:2|item:armor:magic:hp+def' },
      { type: 'lever', id: 'route_lever', x: 25, y: 17 },
      { type: 'gate', id: 'route_gate', x: 14, y: 14, w: 3, openIf: 'route_lever' },
      { type: 'sign', x: 17, y: 16, text: 'The cave-ward gate. Its lever rusts somewhere east of here.' },
      { type: 'gateBig', id: 'ashfall_gate', x: 5, y: 8, w: 4, openIf: 'warden_dead' },
      // roadside clutter for hurling about
      { type: 'pot', x: 22, y: 64 }, { type: 'crate', x: 22, y: 60 },
      { type: 'barrel', x: 12, y: 55 },
      { type: 'rock', x: 24, y: 46 }, { type: 'rock', x: 13, y: 33 },
      { type: 'pot', x: 31, y: 24 }, { type: 'crate', x: 34, y: 23 },
      { type: 'crate', x: 17, y: 19 },
    ],
    npcs: [
      { id: 'wanderer', sprite: 'villager', x: 12, y: 57, dir: 'down', dialog: 'wanderer' },
    ],
    enemies: [
      { type: 'slime', x: 26, y: 56 }, { type: 'slime', x: 29, y: 58 }, { type: 'slime', x: 24, y: 62 },
      { type: 'slime', x: 8, y: 39 }, { type: 'slime', x: 10, y: 37 },
      { type: 'bat', x: 30, y: 24 }, { type: 'bat', x: 33, y: 26 }, { type: 'bat', x: 29, y: 27 },
      { type: 'slime', x: 20, y: 47 }, { type: 'bat', x: 16, y: 32 },
      { type: 'husk', x: 20, y: 20 }, { type: 'husk', x: 24, y: 18 },
      { type: 'husk', x: 28, y: 37 },
    ],
  };
}

/* =========================================================
   HOLLOW CAVE  (38 x 30) — dark, puzzle, leads to boss
   ========================================================= */
function buildCave() {
  const g = G(38, 30, 'r');
  // carve chambers
  rect(g, 14, 22, 10, 6, 'c');           // entry chamber (south)
  rect(g, 17, 16, 4, 6, 'c');            // corridor north
  rect(g, 8, 10, 22, 6, 'c');            // main hall
  rect(g, 4, 4, 8, 5, 'c');              // west chamber (lever A, buried)
  set(g, 8, 9, 'c');                     // 1-wide west link — boulder-plugged
  rect(g, 26, 4, 9, 5, 'c');             // east chamber (lever B, guarded)
  rect(g, 28, 9, 2, 1, 'c');             // 2-wide east link
  rect(g, 17, 6, 4, 4, 'c');             // boss door alcove (north of main hall)
  // water pools in main hall
  rect(g, 12, 12, 3, 2, 'w'); rect(g, 24, 13, 3, 2, 'w');
  set(g, 18, 26, 'S'); set(g, 19, 26, 'S'); // exit stairs south
  set(g, 18, 6, 'S'); set(g, 19, 6, 'S');   // stairs to boss arena
  return {
    id: 'cave', name: 'HOLLOW CAVE', grid: g, ambient: 'cave', music: 'cave',
    buildings: [],
    portals: [
      { x: 18, y: 26, w: 2, h: 2, to: 'route1', tx: 18, ty: 11 },
      { x: 18, y: 6, w: 2, h: 1, to: 'boss', tx: 12, ty: 18, requires: 'cave_door', lockMsg: 'A stone door. Two rune-locks glow faintly — one west, one east.' },
    ],
    props: [
      { type: 'sign', x: 16, y: 24, text: 'Hollow Cave. The dark eats lanterns. It will not eat you. Probably.' },
      { type: 'lever', id: 'cave_leverA', x: 5, y: 5 },
      { type: 'lever', id: 'cave_leverB', x: 33, y: 5 },
      { type: 'boulder', id: 'cb1', x: 8, y: 9 },
      { type: 'sign', x: 19, y: 8, text: 'Two locks, two levers. West lies buried. East lies guarded.' },
      { type: 'chest', id: 'cave_chest1', x: 33, y: 8, loot: 'item:armor:magic:def+hp' },
      { type: 'chest', id: 'cave_chest2', x: 5, y: 7, loot: 'bundle:potion:2|item:trinket:magic:mp+cdr' },
      // old supplies left in the dark
      { type: 'pot', x: 15, y: 23 }, { type: 'pot', x: 22, y: 25 },
      { type: 'crate', x: 9, y: 11 }, { type: 'rock', x: 20, y: 14 }, { type: 'rock', x: 27, y: 11 },
      { type: 'pot', x: 7, y: 5 }, { type: 'crate', x: 31, y: 5 },
    ],
    npcs: [],
    enemies: [
      { type: 'shade', x: 16, y: 13 }, { type: 'shade', x: 22, y: 12 }, { type: 'shade', x: 10, y: 12 },
      { type: 'bat', x: 12, y: 11 }, { type: 'bat', x: 21, y: 12 },
      { type: 'husk', x: 28, y: 8 }, { type: 'husk', x: 30, y: 7 }, { type: 'shade', x: 28, y: 5 },
    ],
  };
}

/* =========================================================
   BOSS ARENA — WARDEN'S VAULT (26 x 22)
   ========================================================= */
function buildBossArena() {
  const g = G(26, 22, 'r');
  rect(g, 5, 4, 16, 14, 'c');
  rect(g, 11, 18, 4, 2, 'c');
  set(g, 12, 19, 'S'); set(g, 13, 19, 'S');
  // pillars
  set(g, 8, 7, 'r'); set(g, 17, 7, 'r'); set(g, 8, 13, 'r'); set(g, 17, 13, 'r');
  return {
    id: 'boss', name: "WARDEN'S VAULT", grid: g, ambient: 'cave', music: 'boss',
    buildings: [],
    portals: [{ x: 12, y: 19, w: 2, h: 2, to: 'cave', tx: 18, ty: 8 }],
    props: [
      { type: 'chest', id: 'boss_chest', x: 13, y: 5, loot: 'bundle:milestone:warden_trophy|potion:2|gold:30-45', ifFlag: 'warden_dead' },
      // arena debris — the Warden's slam hurls it everywhere
      { type: 'pot', x: 6, y: 5 }, { type: 'pot', x: 19, y: 5 },
      { type: 'crate', x: 6, y: 15 }, { type: 'crate', x: 19, y: 15 },
      { type: 'rock', x: 12, y: 6 }, { type: 'rock', x: 14, y: 14 },
      { type: 'barrel', x: 9, y: 16 },
    ],
    npcs: [],
    enemies: [{ type: 'warden', x: 13, y: 8, boss: true }],
  };
}

/* =========================================================
   ASHFALL — the second city  (44 x 36)
   ========================================================= */
function buildAshfall() {
  const g = G(44, 36, 's');
  // city walls
  rect(g, 0, 0, 44, 2, 'X'); rect(g, 0, 34, 44, 2, 'X');
  rect(g, 0, 0, 2, 36, 'X'); rect(g, 42, 0, 2, 36, 'X');
  // south gate opening + main avenue + plaza
  rect(g, 20, 34, 4, 2, 't');
  rect(g, 20, 4, 4, 30, 't');
  rect(g, 14, 12, 16, 10, 't');
  // street connectors (armory, tavern, arena, Tabb's house)
  rect(g, 9, 12, 2, 2, 't'); rect(g, 9, 13, 5, 1, 't');
  rect(g, 34, 12, 2, 2, 't'); rect(g, 30, 13, 5, 1, 't');
  rect(g, 24, 31, 12, 1, 't'); set(g, 34, 30, 't');
  rect(g, 8, 22, 2, 2, 't');
  // garden park (southwest): grass, pond, flowers, trees
  rect(g, 4, 24, 12, 8, '.');
  rect(g, 5, 26, 5, 4, 'w');
  rect(g, 5, 30, 5, 1, 's');
  rect(g, 12, 25, 2, 2, 'f'); rect(g, 13, 29, 2, 2, 'f');
  set(g, 4, 25, '#'); set(g, 15, 25, '#'); set(g, 11, 24, '#'); set(g, 4, 28, '#');
  const buildings = [
    { x: 4, y: 5, w: 9, h: 7, door: { x: 9, y: 11 }, label: 'ARMORY', to: 'armory' },
    { x: 30, y: 5, w: 10, h: 7, door: { x: 34, y: 11 }, label: 'GILDED GRYPHON', to: 'tavern' },
    { x: 30, y: 23, w: 10, h: 8, door: { x: 34, y: 30 }, label: 'THE PIT', to: 'arena' },
    { x: 4, y: 16, w: 8, h: 6, door: { x: 8, y: 21 }, label: "TABB'S", to: 'tabb_house' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, 's');
  // north gate opening (Claim Road — post-demo)
  rect(g, 20, 0, 4, 2, 't');
  return {
    id: 'ashfall', name: 'ASHFALL', grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [
      { x: 20, y: 35, w: 4, h: 1, to: 'route1', tx: 6.5, ty: 9.5 },
      { x: 20, y: 0, w: 4, h: 1, to: 'route_claim', tx: 22, ty: 54,
        requires: 'contract_accepted',
        lockMsg: 'HALE: "North road\'s for Consolidated Mining contract work. Sign on at the market first."' },
    ],
    props: [
      { type: 'fountain', x: 22, y: 16 },
      { type: 'shrine', id: 'bell_shrine', x: 21.5, y: 2.2 },
      { type: 'lamp', x: 14, y: 12 }, { type: 'lamp', x: 29, y: 12 },
      { type: 'lamp', x: 14, y: 21 }, { type: 'lamp', x: 29, y: 21 },
      { type: 'lamp', x: 19, y: 32 }, { type: 'lamp', x: 24, y: 32 },
      { type: 'lamp', x: 19, y: 5 }, { type: 'lamp', x: 24, y: 5 },
      { type: 'bench', x: 17, y: 19 }, { type: 'bench', x: 26, y: 19 },
      { type: 'bench', x: 25, y: 32 },
      { type: 'sign', x: 19, y: 33, text: 'ASHFALL — second city of the vale. Population: relieved.' },
      { type: 'sign', x: 16, y: 14, text: 'PLAZA NOTICE — The Pit pays winners. The pond pays the patient. The shrine pays in peace. Lost: one (1) cat.' },
      { type: 'sign', x: 11, y: 30, text: 'MEMORIAL GARDEN — quiet, please. The fish are listening.' },
      // market stalls
      { type: 'stall', x: 13, y: 24 }, { type: 'stall', x: 16, y: 24 },
      { type: 'fishspot', x: 7, y: 29 },
      // bell charms — five, hidden in the city's corners
      { type: 'charm', id: 'charm1', x: 40, y: 3, unlessFlag: 'charm_charm1' },
      { type: 'charm', id: 'charm2', x: 4, y: 31, unlessFlag: 'charm_charm2' },
      { type: 'charm', id: 'charm3', x: 3, y: 22, unlessFlag: 'charm_charm3' },
      { type: 'charm', id: 'charm4', x: 40, y: 32, unlessFlag: 'charm_charm4' },
      { type: 'charm', id: 'charm5', x: 10, y: 3, unlessFlag: 'charm_charm5' },
      // Whiskers hides in one of three spots once the search begins
      { type: 'cat', id: 'cat1', x: 40, y: 7, ifFlag: 'cat_spot:1', unlessFlag: 'cat_found' },
      { type: 'cat', id: 'cat2', x: 5, y: 25, ifFlag: 'cat_spot:2', unlessFlag: 'cat_found' },
      { type: 'cat', id: 'cat3', x: 14, y: 25, ifFlag: 'cat_spot:3', unlessFlag: 'cat_found' },
      // clutter
      { type: 'crate', x: 31, y: 3 }, { type: 'barrel', x: 33, y: 3 },
      { type: 'pot', x: 14, y: 28 }, { type: 'barrel', x: 18, y: 26 },
      { type: 'crate', x: 3, y: 13 }, { type: 'pot', x: 40, y: 18 },
      { type: 'rock', x: 38, y: 16 },
    ],
    npcs: [
      { id: 'hale', sprite: 'guard', x: 21, y: 31, dir: 'down', dialog: 'hale' },
      { id: 'tabb', sprite: 'villager2', x: 6, y: 23, wander: 2, dialog: 'tabb' },
      { id: 'penny', sprite: 'villager2', x: 24, y: 16, wander: 4, dialog: 'penny' },
      { id: 'hob', sprite: 'merchant', x: 15, y: 25, dir: 'down', dialog: 'hob' },
      { id: 'lira', sprite: 'villager', x: 18, y: 25, dir: 'down', dialog: 'lira' },
      { id: 'jun', sprite: 'villager', x: 9, y: 30, dir: 'left', dialog: 'jun' },
      // Post-demo Ch.2: Voss recruiter intercepts travelers near the south gate
      { id: 'recruiter', sprite: 'merchant', x: 26, y: 32, dir: 'left', dialog: 'voss_recruiter' },
      // Lace Harrow glimpse — Sovereign of Thorns at market stall (watches silently)
      { id: 'lace', sprite: 'villager2', x: 17, y: 26, dir: 'down', dialog: 'lace_ashfall' },
    ],
    enemies: [],
  };
}

/* =========================================================
   ASHFALL INTERIORS
   ========================================================= */
function buildTavern() {
  return interior('tavern', 'THE GILDED GRYPHON', 18, 12, 'o', (g, def) => {
    rect(g, 2, 3, 5, 1, 'C');          // bar counter, walk around east of x=6
    rect(g, 8, 5, 4, 3, 'm');
    set(g, 8, 11, 'S'); set(g, 9, 11, 'S');
    set(g, 15, 10, 'S');               // cellar stairs (locked until Tilly asks)
    def.portals.push({ x: 8, y: 11, w: 2, h: 1, to: 'ashfall', tx: 34.5, ty: 12.5 });
    def.portals.push({ x: 15, y: 10, w: 1, h: 1, to: 'cellar', tx: 7.5, ty: 3, requires: 'rats_q', lockMsg: 'TILLY: "Cellar\'s locked, love. Ask me about it first."' });
    def.npcs.push({ id: 'tilly', sprite: 'villager', x: 4, y: 2.2, dir: 'down', dialog: 'tilly', service: 'inn' });
    def.npcs.push({ id: 'moth', sprite: 'villager2', x: 13, y: 3, dir: 'down', dialog: 'moth' });
    def.npcs.push({ id: 'ferris', sprite: 'villager2', x: 10, y: 8, wander: 2, dialog: 'ferris' });
    def.props.push(
      { type: 'fireplace', x: 15, y: 1 },
      { type: 'table', x: 9, y: 5 }, { type: 'stool', x: 8, y: 6 }, { type: 'stool', x: 10, y: 6 },
      { type: 'table', x: 12, y: 7 }, { type: 'stool', x: 12, y: 8 },
      { type: 'table', x: 4, y: 7 }, { type: 'stool', x: 5, y: 7 },
      { type: 'bookshelf', x: 11, y: 1, text: 'Bottles of everything. One label reads: VINTAGE — ASK MOTH.' },
      { type: 'plant', x: 1, y: 1 },
      { type: 'basket', x: 1, y: 4 },
      { type: 'barrel', x: 16, y: 8 }, { type: 'pot', x: 1, y: 8 },
      { type: 'sign', x: 14, y: 10, text: 'CELLAR — staff only. (Staff includes heroes, conditionally.)' },
    );
  });
}

function buildCellar() {
  const g = G(14, 12, 'r');
  rect(g, 1, 1, 12, 10, 'c');
  set(g, 7, 1, 'S');
  return {
    id: 'cellar', name: 'GRYPHON CELLAR', grid: g, ambient: 'cave', music: 'cave', interior: true,
    buildings: [],
    portals: [{ x: 7, y: 1, w: 1, h: 1, to: 'tavern', tx: 15.5, ty: 9.2 }],
    props: [
      { type: 'chest', id: 'cellar_chest', x: 11, y: 9, loot: 'potion:2' },
      { type: 'barrel', x: 2, y: 2 }, { type: 'barrel', x: 3, y: 2 }, { type: 'barrel', x: 2, y: 4 },
      { type: 'crate', x: 11, y: 2 }, { type: 'crate', x: 10, y: 8 },
      { type: 'pot', x: 5, y: 9 }, { type: 'pot', x: 11, y: 5 },
      { type: 'sign', x: 8, y: 2, text: 'Inventory: kegs (12), crates (6), things with tails (TOO MANY).' },
    ],
    npcs: [],
    enemies: [
      { type: 'rat', x: 4, y: 4 }, { type: 'rat', x: 10, y: 4 }, { type: 'rat', x: 4, y: 8 },
      { type: 'rat', x: 9, y: 8 }, { type: 'rat', x: 7, y: 6 },
    ],
  };
}

function buildArmory() {
  return interior('armory', 'ASHFALL ARMORY', 12, 10, 't', (g, def) => {
    rect(g, 2, 2, 3, 2, 'W'); // forge block
    set(g, 5, 9, 'S'); set(g, 6, 9, 'S');
    def.portals.push({ x: 5, y: 9, w: 2, h: 1, to: 'ashfall', tx: 9.5, ty: 12.5 });
    def.npcs.push({ id: 'kettle', sprite: 'smith', x: 6.5, y: 4, dir: 'down', dialog: 'kettle', service: 'armory' });
    def.props.push(
      { type: 'fireplace', x: 3, y: 4 },
      { type: 'anvil', x: 5, y: 5 },
      { type: 'rack', x: 7, y: 1 }, { type: 'rack', x: 8, y: 1 }, { type: 'rack', x: 10, y: 1 },
      { type: 'crate', x: 10, y: 7 }, { type: 'barrel', x: 1, y: 7 },
      { type: 'sign', x: 10, y: 4, text: '"If it still rattles, it still works." — Kettle, on armor and on herself' },
    );
  });
}

function buildArena() {
  const g = G(26, 20, 't');
  frame(g, 0, 0, 26, 20, 'W');
  rect(g, 6, 4, 14, 10, 's');        // the pit
  frame(g, 5, 3, 16, 12, 'F');       // fence ring
  set(g, 12, 14, 's'); set(g, 13, 14, 's'); // pit gate
  set(g, 12, 18, 'S'); set(g, 13, 18, 'S');
  return {
    id: 'arena', name: 'THE PIT', grid: g, ambient: 'cave', music: 'cave', interior: true,
    buildings: [],
    portals: [{ x: 12, y: 18, w: 2, h: 1, to: 'ashfall', tx: 34.5, ty: 31.5 }],
    props: [
      { type: 'lamp', x: 4, y: 2 }, { type: 'lamp', x: 21, y: 2 },
      { type: 'lamp', x: 4, y: 15 }, { type: 'lamp', x: 21, y: 15 },
      { type: 'rack', x: 2, y: 16 }, { type: 'rack', x: 23, y: 16 },
      { type: 'sign', x: 10, y: 16, text: 'THE PIT — ten gold, three rounds. Winners carry it out. Losers get carried.' },
      { type: 'crate', x: 8, y: 6 }, { type: 'barrel', x: 17, y: 11 },
      { type: 'pot', x: 8, y: 11 }, { type: 'pot', x: 17, y: 6 },
    ],
    npcs: [
      { id: 'oggen', sprite: 'smith', x: 16, y: 16, dir: 'left', dialog: 'oggen' },
    ],
    enemies: [],
  };
}

/* =========================================================
   POST-DEMO — Ashfall → Briarfen → Tidehaven (scaffold)
   See docs/design/STORY_NOTES.md §8–11 · canvases/post-demo-routes
   ========================================================= */

/** Claim Road — ash scrub badlands, Ashfall north gate → contract cave mouth. */
function buildRouteClaim() {
  const g = G(44, 56, 's');
  // base ash_scrub terrain: heavy sand and grit scatter
  scatter(g, ':', 200, 41, 's');
  scatter(g, 's', 120, 42, ':');   // sand re-scatter on grass2 — reinforces dry look
  scatter(g, 'h', 14,  44, 's.:'); // sparse dead bushes
  scatter(g, '#',  8,  45, 's.:'); // very sparse lone trees
  frame(g, 0, 0, 44, 56, 's');
  rect(g, 1, 1, 42, 54, ':');
  scatter(g, 's', 80, 46, ':');    // sand patches over grass2
  // main north road
  rect(g, 20, 2, 4, 52, 'p');
  rect(g, 20, 54, 4, 2, 'p');
  // Thornwood-edge band (north third) — trees thicken as you near the cave
  scatter(g, '#', 44, 43, '.:');
  scatter(g, 'h', 22, 44, '.:');
  // Barbed-wire fence line on east shoulder (mid-map, lease boundary)
  rect(g, 36, 28, 1, 12, 'F');
  rect(g, 36, 40, 4, 1, 'F');
  rect(g, 8, 8, 10, 6, 's'); // mining camp clearing
  return {
    id: 'route_claim', name: 'CLAIM ROAD', majorType: 'badlands_route', biome: 'ash_scrub',
    grid: g, ambient: 'day', music: 'route',
    buildings: [],
    portals: [
      { x: 20, y: 55, w: 4, h: 1, to: 'ashfall', tx: 22, ty: 3 },
      { x: 20, y: 0, w: 4, h: 1, to: 'claim_cave', tx: 20, ty: 29 },
    ],
    props: [
      // Gate sign and road opener
      { type: 'sign', x: 22, y: 52, text: 'CONSOLIDATED MINING CO. — lease road. Mind the wire. Mind the beetles.' },
      // Milestone: 1 league south
      { type: 'sign', x: 22, y: 40, text: 'MILESTONE — 1 LEAGUE from ASHFALL. Claim road continues north. Beetles per league: many.' },
      // Trash heap oracle (south-west recess)
      { type: 'crate', x: 4, y: 46 }, { type: 'barrel', x: 5, y: 47 }, { type: 'pot', x: 4, y: 48 },
      { type: 'rock', x: 3, y: 47 },
      { type: 'sign', x: 6, y: 47, text: 'THE ORACLE OF RUBBISH — "Leave a question." (Scrawled beneath: "North. Always north. They always go north." — Oracle)' },
      // Bone cairn (west side, mid-map)
      { type: 'rock', x: 5, y: 30 }, { type: 'rock', x: 6, y: 29 }, { type: 'rock', x: 5, y: 28 },
      { type: 'sign', x: 7, y: 28, text: 'Someone built this cairn. The beetles knocked it over. Someone rebuilt it. The beetles haven\'t knocked it over again. Respect.' },
      // Barbed wire stretch (east shoulder, mid-map)
      { type: 'rock', x: 37, y: 38 }, { type: 'rock', x: 36, y: 34 },
      { type: 'sign', x: 34, y: 36, text: 'CONSOLIDATED MINING — Lease boundary. The wire is not decorative. The beetles are.' },
      // Cold campfire (east recess, mid-map)
      { type: 'bench', x: 38, y: 22 },
      { type: 'pot', x: 37, y: 23 },
      { type: 'rock', x: 39, y: 22 }, { type: 'rock', x: 38, y: 24 }, { type: 'rock', x: 40, y: 23 },
      { type: 'sign', x: 36, y: 20, text: 'Last fire: three nights ago. Ash still warm. Whoever camped here left in a hurry.' },
      // Lamp on the road (mid)
      { type: 'lamp', x: 24, y: 28 }, { type: 'lamp', x: 19, y: 16 },
      // Mining camp clearing (north-west)
      { type: 'bench', x: 10, y: 11 },
      { type: 'crate', x: 11, y: 9 }, { type: 'barrel', x: 13, y: 9 }, { type: 'pot', x: 12, y: 10 },
      { type: 'sign', x: 12, y: 10, text: 'CAMP SEVEN — Consolidated Mining survey post. Hot lunch: gone. Beetles: present.' },
      // Milestone: cave mouth near
      { type: 'sign', x: 22, y: 15, text: 'CONTRACT CAVE — 0.2 LEAGUES. Consolidated Mining Site No.7. Hard hats mandatory. Results variable.' },
      // Road clutter
      { type: 'rock', x: 30, y: 20 }, { type: 'rock', x: 8, y: 32 },
      { type: 'pot', x: 27, y: 44 }, { type: 'barrel', x: 35, y: 42 },
    ],
    npcs: [
      // Ambient miners — three voices, south to north
      { id: 'cobb', sprite: 'villager', x: 10, y: 44, wander: 4, dialog: 'road_miner_a' },
      { id: 'nessa', sprite: 'villager2', x: 16, y: 30, dir: 'right', dialog: 'road_miner_b' },
      { id: 'grut', sprite: 'villager', x: 8, y: 12, dir: 'down', dialog: 'road_miner_c' },
    ],
    enemies: [
      // Encounter 1 — south (familiar): two slimes and a stray husk
      { type: 'slime', x: 10, y: 48 }, { type: 'slime', x: 34, y: 44 },
      { type: 'husk', x: 27, y: 38 },
      // Encounter 2 — mid (medium): three husks spread across the scrub
      { type: 'husk', x: 8, y: 26 }, { type: 'husk', x: 35, y: 24 }, { type: 'husk', x: 29, y: 20 },
      // Encounter 3 — north (hard): husks + a shade near the cave mouth
      { type: 'husk', x: 10, y: 14 }, { type: 'husk', x: 33, y: 12 }, { type: 'shade', x: 28, y: 8 },
    ],
  };
}

/** Contract Cave — Rival set-piece + Lumen Gem. */
function buildClaimCave() {
  const g = G(40, 32, 'r');
  rect(g, 12, 22, 16, 8, 'c');   // entry / miner foyer
  rect(g, 18, 14, 4, 8, 'c');    // north corridor
  rect(g, 8, 8, 24, 6, 'c');     // main hall + arena
  rect(g, 16, 2, 8, 6, 'c');     // gem vault
  rect(g, 19, 0, 2, 2, 'c');     // north exit spur to portal
  // Scattered rock protrusions — gives the cave walls texture
  for (const [x, y] of [[10,10],[14,9],[28,9],[30,11],[11,12],[31,12],[17,14],[22,14]]) set(g, x, y, 'r');
  set(g, 19, 30, 'S'); set(g, 20, 30, 'S');
  set(g, 19, 7, 'S'); set(g, 20, 7, 'S');
  return {
    id: 'claim_cave', name: 'CONTRACT CAVE', majorType: 'mine_shaft', biome: 'cave',
    grid: g, ambient: 'cave', music: 'cave',
    buildings: [],
    portals: [
      { x: 19, y: 30, w: 2, h: 2, to: 'route_claim', tx: 22, ty: 2 },
      { x: 19, y: 0, w: 2, h: 1, to: 'route_thornwood', tx: 20, ty: 46,
        requires: 'glitch_active',
        lockMsg: 'The tunnel ahead shimmers wrong. Something must break before the thornwood opens.' },
    ],
    props: [
      // Entry foyer (y=22-30): miner camp sprinkles
      { type: 'sign', x: 17, y: 27, text: 'MINING SAFETY — hard hats optional. Feelings not billable. Beetles mandatory.' },
      { type: 'crate', x: 14, y: 24 }, { type: 'pot', x: 15, y: 25 }, { type: 'barrel', x: 25, y: 23 },
      { type: 'bench', x: 22, y: 24 },
      // Miners' lunch sprinkle (foyer east wall)
      { type: 'crate', x: 26, y: 25 }, { type: 'pot', x: 27, y: 24 },
      { type: 'sign', x: 25, y: 26, text: 'LUNCH — Dovo\'s. Don\'t. (Dovo)' },
      // Candle row — lamps guiding the north corridor (y=14-22)
      { type: 'lamp', x: 19, y: 22 }, { type: 'lamp', x: 19, y: 19 },
      { type: 'lamp', x: 19, y: 16 }, { type: 'lamp', x: 20, y: 14 },
      // North corridor beat (y=14-22): descent text
      { type: 'sign', x: 17, y: 20, text: 'DEEPER SEAM — gem report filed day 3. Nobody signed the survey form. Beetles: compulsory.' },
      { type: 'sign', x: 17, y: 15, text: 'The light ahead is not torch-light. Do not tell Foreman Grut — he doesn\'t believe in it.' },
      // Main hall (y=8-14): dispute zone + collapsed rail
      { type: 'sign', x: 14, y: 10, text: 'CONSOLIDATED MINING — all finds are property of the lease. ALL finds.' },
      // Collapsed rail sprinkle (main hall west)
      { type: 'crate', x: 11, y: 11 }, { type: 'rock', x: 12, y: 10 }, { type: 'rock', x: 10, y: 12 },
      { type: 'sign', x: 9, y: 11, text: 'CART RAIL — do not ride. (This sign was on the cart when it crashed.)' },
      { type: 'rock', x: 29, y: 11 },
      // Gem vault (y=2-8): approach atmosphere
      { type: 'lamp', x: 16, y: 7 }, { type: 'lamp', x: 24, y: 7 },
      { type: 'sign', x: 18, y: 6, text: 'LUMEN CLAIM — light that does not belong in the vale. Do not touch. (Everyone touches it.)' },
      { type: 'shrine', id: 'lumen_gem', x: 20, y: 4 },
    ],
    npcs: [
      // Foyer miners — authored lines replacing generic villager dialog
      { id: 'miner1', sprite: 'villager', x: 16, y: 25, dir: 'right', dialog: 'miner1' },
      { id: 'miner2', sprite: 'villager2', x: 24, y: 26, wander: 2, dialog: 'miner2' },
      // Gem vault: the Rival at the shrine + Voss arriving from the east passage
      // Label reads STRANGER pre-scene; dialog name shows ??? throughout
      { id: 'stranger', sprite: 'guard', x: 20, y: 5, dir: 'down', dialog: 'rival' },
      { id: 'voss', sprite: 'merchant', x: 27, y: 9, dir: 'left', dialog: 'voss_gem' },
    ],
    enemies: [],
  };
}

/** Thornwood Verge — dense thornwood gauntlet, cave north exit → Briarfen south gate.
 *  A serpentine thorn-maze in three rooms, escalating difficulty: an intro room that
 *  introduces the thornwood roster (thornling / crawler), a puzzle hall (roll a wakestone
 *  onto the thorn-seal + wake a lever to open the Thorn-Gate, while a revenant teaches the
 *  windup-dodge), then Bell Hollow where the elite THORNWARDEN keeps the north road. */
function buildRouteThornwood() {
  // 40 x 48 — enter south (20,46), exit north (20,2). Flow forced S→W→middle→E-gate→N.
  const g = G(40, 48, '.');
  // hollow_thornwood understory: grass2 speckle + tallgrass thickets
  scatter(g, ':', 150, 51, '.');
  scatter(g, ',', 90, 57, '.:');
  // dense thornwood frame (3 thick)
  rect(g, 0, 0, 40, 3, '#'); rect(g, 0, 45, 40, 3, '#');
  rect(g, 0, 0, 3, 48, '#'); rect(g, 37, 0, 3, 48, '#');
  // inner thornwood depth — trees, pines, thorn brush (carved lanes clear these below)
  scatter(g, '#', 70, 52, '.:');
  scatter(g, '^', 26, 53, '.:');
  scatter(g, 'h', 32, 54, '.:');

  /* --- serpentine thorn walls (2 thick) cut an S-path between three rooms --- */
  rect(g, 8, 29, 29, 2, 'h');                 // Wall A (lower) — leaves WEST gap x3..7
  rect(g, 3, 14, 27, 2, 'h');                 // Wall B (upper) — east side...
  rect(g, 34, 14, 3, 2, 'h');                 // ...closed off so the gap is exactly x30..33

  /* --- clear the three room cores (keeps thorn clutter only at the edges) --- */
  rect(g, 5, 33, 30, 9, '.');                 // bottom room — Tanglemouth (intro)
  rect(g, 5, 17, 30, 11, '.');                // middle room — Snare Hall (puzzle)
  rect(g, 8, 4, 24, 9, '.');                  // top room — Bell Hollow (climax)

  /* --- carve the lanes (cosmetic path + guaranteed clearance through the gaps) --- */
  rect(g, 19, 42, 2, 5, 'p');                 // south entry spur (punches the border)
  rect(g, 4, 26, 4, 7, 'p');                  // WEST gap: bottom → middle (open)
  rect(g, 30, 11, 4, 7, 'p');                 // EAST gap: middle → top (gated by Thorn-Gate)
  rect(g, 19, 0, 2, 5, 'p');                  // north exit spur (punches the border)

  /* --- linger / vibe dressing --- */
  rect(g, 30, 38, 6, 4, ',');                 // tallgrass nook hiding a cache
  rect(g, 6, 35, 4, 3, ',');                  // thicket by the entry
  rect(g, 13, 19, 4, 3, ',');                 // overgrowth by the lever
  // Thorn-Seal: a flower-ringed socket at (29,20) with a clear push-track running
  // straight south to the wakestone's rest. The boulder only has to go due NORTH.
  rect(g, 29, 20, 1, 5, 'p');                 // the lit push-track (x29, y20..24)
  set(g, 28, 19, 'f'); set(g, 29, 19, 'f'); set(g, 30, 19, 'f'); // north arc of the socket
  set(g, 27, 20, 'f'); set(g, 31, 20, 'f');   // side blooms framing the seal

  return {
    id: 'route_thornwood', name: 'THORNWOOD VERGE', majorType: 'forest_route', biome: 'hollow_thornwood',
    grid: g, ambient: 'day', music: 'route',
    buildings: [],
    portals: [
      { x: 19, y: 47, w: 2, h: 2, to: 'claim_cave', tx: 20, ty: 8 },
      { x: 19, y: 0, w: 2, h: 1, to: 'briarfen', tx: 24, ty: 38,
        requires: 'glitch_active',
        lockMsg: 'The thorns knit shut. The vale still remembers gray.' },
    ],
    props: [
      // The Thorn-Gate — sealed until BOTH the wakestone seal and the lever are set
      { type: 'gateBig', id: 'thorn_gate', x: 30, y: 14, w: 4, openIf: 'thorn_gate' },
      // Puzzle half 1: a lever in the overgrown west of the Snare Hall
      { type: 'lever', id: 'thorn_leverA', x: 8, y: 20 },
      // Puzzle half 2: roll the wakestone due NORTH onto the seal. The glowing
      // marker shows the destination; chevrons light the track; flank rocks funnel
      // the boulder so it can only travel straight up the lane.
      { type: 'sealMarker', id: 'thorn_seal_mark', x: 29, y: 20, flag: 'thorn_seal' },
      { type: 'boulder', id: 'thorn_seed', x: 29, y: 23, target: { x: 29, y: 20 } },
      { type: 'pushArrow', x: 29, y: 22, unlessFlag: 'thorn_seal' },
      { type: 'pushArrow', x: 29, y: 21, unlessFlag: 'thorn_seal' },
      { type: 'rock', x: 28, y: 20 }, { type: 'rock', x: 30, y: 20 }, // seal frame / funnel
      // Signposts — wayfinding + teaching the new mechanics
      { type: 'sign', x: 22, y: 43, text: 'THORNWOOD VERGE — Briarfen lies north. The thorns keep their own contracts. The road bends; the woods do not.' },
      { type: 'sign', x: 12, y: 36, text: 'Thornlings root slow but bite deep — circle them, don\'t trade blows. Crawlers come quick, and in pairs.' },
      { type: 'sign', x: 11, y: 22, text: 'Thorn Compact waypost — contracts outlive heroes. WAKE THE LEVER, then the gate listens.' },
      { type: 'sign', x: 26, y: 22, text: 'THORN-SEAL — the old wards want weight. STAND SOUTH of the wakestone and push it NORTH, up the lit track, onto the glowing seal. (A revenant plants its feet before it swings — that windup is your opening.)' },
      { type: 'sign', x: 34, y: 18, text: 'THORN-GATE — opens by lever AND seal both. The verge does not open by halves.' },
      { type: 'sign', x: 22, y: 12, text: 'BELL HOLLOW — something large keeps the north path. Briarfen\'s bell can\'t be heard past it. Yet.' },
      // Hidden cache in the tallgrass nook (cut to find)
      { type: 'chest', id: 'thornwood_cache', x: 34, y: 40, loot: 'bundle:gold:14-22|potion:1' },
      // Reward for clearing the Thornwarden, just shy of the Briarfen gate
      { type: 'chest', id: 'thornwood_reward', x: 20, y: 5, loot: 'bundle:gold:30-50|potion:2|item:trinket:magic' },
      // atmosphere
      { type: 'lamp', x: 6, y: 33 }, { type: 'lamp', x: 33, y: 11 },
      { type: 'bench', x: 24, y: 18 },
      { type: 'rock', x: 16, y: 33 }, { type: 'crate', x: 31, y: 26 },
    ],
    npcs: [],
    enemies: [
      // Bottom — Tanglemouth: meet the thornwood roster
      { type: 'thornling', x: 9, y: 37 }, { type: 'thornling', x: 29, y: 38 },
      { type: 'crawler', x: 18, y: 34 },
      // Middle — Snare Hall: lever guards + a revenant on the seal (teaches the windup dodge)
      { type: 'crawler', x: 11, y: 23 }, { type: 'crawler', x: 13, y: 20 },
      { type: 'revenant', x: 27, y: 21 },
      { type: 'bat', x: 20, y: 18 }, { type: 'bat', x: 16, y: 26 },
      // Top — Bell Hollow: the elite THORNWARDEN and its escort
      { type: 'revenant', x: 20, y: 9, scale: { hp: 2.6, dmg: 1.4, size: 1.5, elite: true, name: 'THORNWARDEN' } },
      { type: 'thornling', x: 13, y: 7 }, { type: 'thornling', x: 27, y: 7 },
    ],
  };
}

/** Briarfen — Ch.3 thornwood market hub. Unlike the grid-plaza vale towns, Briarfen
 *  is a clearing girdled by a living thorn-hedge ring: a central green holds the
 *  Bell-Gate, and timber-and-thatch cottages nest in the treeline, reached by
 *  cardinal lanes that punch through gaps in the hedge. */
function buildBriarfen() {
  const g = G(48, 40, '.');
  scatter(g, ':', 110, 61, '.');
  // Tree borders: hollow_thornwood — denser than vale_meadow
  rect(g, 0, 0, 48, 2, '#'); rect(g, 0, 38, 48, 2, '#');
  rect(g, 0, 0, 2, 40, '#'); rect(g, 46, 0, 2, 40, '#');
  scatter(g, '#', 38, 62, '.:');
  scatter(g, 'h', 24, 63, '.:');
  scatter(g, '^', 10, 64, '.:');

  // --- the living thorn-hedge ring (broken at the four cardinal lanes) ---
  const cxr = 24, cyr = 19, R = 9;
  for (let y = cyr - R - 1; y <= cyr + R + 1; y++) {
    for (let x = cxr - R - 1; x <= cxr + R + 1; x++) {
      const dx = x - cxr, dy = y - cyr;
      const dd = Math.hypot(dx, dy);
      if (dd <= R + 0.6 && dd > R - 0.7) {
        if (Math.abs(dx) < 2 || Math.abs(dy) < 2) continue; // leave the cardinal gaps open
        set(g, x, y, 'h');
      }
    }
  }
  // short diagonal thorn buttresses jutting inward from the ring (depth, not a wall)
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let i = 0; i < 3; i++) set(g, cxr + sx * (6 + i), cyr + sy * (4 + i), 'h');
  }

  // --- central plaza disc + the four cardinal lanes ---
  for (let y = cyr - 4; y <= cyr + 4; y++) {
    for (let x = cxr - 4; x <= cxr + 4; x++) {
      if (Math.hypot(x - cxr, y - cyr) <= 3.4) set(g, x, y, 'p');
    }
  }
  rect(g, 23, 19, 2, 19, 'p');     // south lane → entrance
  rect(g, 22, 37, 4, 3, 'p');      // south entrance apron (punches the border)
  rect(g, 23, 9, 2, 10, 'p');      // north lane → Thorn Depths notice
  rect(g, 5, 18, 42, 2, 'p');      // east–west avenue (through the W and E hedge gaps)
  rect(g, 45, 14, 3, 6, 'p');      // east connector to King's Descent gate
  // Bell-Gate platform: re-green the very centre so the shrine sits on flowers
  rect(g, 23, 16, 2, 2, 'f');

  // Crescent reflecting pool, SE green — a quiet linger spot
  rect(g, 37, 30, 8, 4, 'w');
  rect(g, 37, 34, 8, 1, 's');      // sandy south shore
  rect(g, 36, 29, 9, 1, 'F');      // fence along the town side
  // Flower beds in the open green — the first color pocket; brighten after the Glitch
  scatter(g, 'f', 18, 65, '.:');
  rect(g, 19, 16, 2, 2, 'f'); rect(g, 28, 16, 2, 2, 'f');

  // Clear building footprints — timber-and-thatch cottages tucked in the treeline
  const buildings = [
    { x: 4, y: 5, w: 10, h: 7, door: { x: 9, y: 11 }, label: 'APOTHECARY', to: 'briarfen_apoth', style: 'thorn' },
    { x: 34, y: 5, w: 11, h: 7, door: { x: 39, y: 11 }, label: 'THORN INN', to: 'briarfen_inn', style: 'thorn' },
    { x: 4, y: 24, w: 12, h: 8, door: { x: 10, y: 31 }, label: 'TIMBER COMPACT', to: 'briarfen_compact', style: 'thorn' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, '.');
  // Door spokes — every cottage door spills onto a lane (no dead-ends)
  rect(g, 9, 11, 2, 8, 'p');       // apothecary → avenue
  rect(g, 38, 11, 2, 8, 'p');      // thorn inn → avenue
  rect(g, 10, 31, 2, 6, 'p');      // timber compact → south
  rect(g, 11, 35, 13, 2, 'p');     // ...and across to the south lane

  return {
    id: 'briarfen', name: 'BRIARFEN', majorType: 'market_town', biome: 'hollow_thornwood',
    colorPocket: 'briarfen',
    grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [
      { x: 22, y: 39, w: 4, h: 1, to: 'route_thornwood', tx: 20, ty: 2 },
      { x: 47, y: 14, w: 1, h: 4, to: 'route_silt_descent', tx: 3, ty: 70,
        requires: 'matriarch_dead',
        lockMsg: 'East road sealed until the Thorn Matriarch falls — or Lace Harrow grants passage.' },
    ],
    props: [
      // Bell-Gate at the heart of the green — fast-travel once glitch_active
      { type: 'shrine', id: 'bell_gate_briarfen', x: 23, y: 16 },
      { type: 'fountain', x: 23.5, y: 19.5 }, // green centrepiece below the bell
      // Thorn market — a clustered stall corner in the open green, not a tidy ring
      { type: 'stall', x: 20, y: 23 }, { type: 'stall', x: 26, y: 24 },
      { type: 'stall', x: 21, y: 25 },
      // Lace Harrow's stall — set apart, signposted, facing the plaza
      { type: 'stall', x: 27, y: 22 },
      { type: 'sign', x: 29, y: 22, text: 'LACE HARROW — Sovereign of Thorns. Thorn contracts don\'t expire. Neither do I.' },
      // Meeting stump + benches (community gather, N of the green)
      { type: 'bench', x: 26, y: 16 }, { type: 'bench', x: 28, y: 16 },
      { type: 'rock', x: 26, y: 15 }, // meeting stump centre stone
      // Bulletin board by the south lane as you enter
      { type: 'sign', x: 21, y: 24, text: 'BRIARFEN NOTICE BOARD — Matriarch Depths: bounty open. Bell-Gate: awaiting Concord clearance. Lost: one thorn contract. (Reward: another contract.)' },
      // Lamps marking the hedge-gates and lanes
      { type: 'lamp', x: 21, y: 13 }, { type: 'lamp', x: 27, y: 13 },
      { type: 'lamp', x: 17, y: 18 }, { type: 'lamp', x: 31, y: 18 },
      { type: 'lamp', x: 20, y: 25 }, { type: 'lamp', x: 28, y: 25 },
      // SE reflecting pool linger spot
      { type: 'fishspot', x: 40, y: 31 },
      { type: 'bench', x: 38, y: 28 },
      { type: 'sign', x: 36, y: 27, text: 'HOLLOW POOL — the fish here remember thorn-light. Cast at the green ripples.' },
      // Wayfinding signs
      { type: 'sign', x: 25, y: 36, text: 'BRIARFEN — thorn market. Population: entangled.' },
      { type: 'sign', x: 43, y: 17, text: 'EAST: King\'s Descent to Tidehaven (sealed).' },
      { type: 'sign', x: 22, y: 10, text: 'NORTH: Thorn Depths — Matriarch territory. Active bounty.' },
      { type: 'sign', x: 12, y: 33, text: 'Thornwood Timber Co. — the trees here grew around contracts. They are extremely legally binding.' },
      // Market clutter (kept within the open green)
      { type: 'basket', x: 19, y: 22 }, { type: 'basket', x: 22, y: 22 },
      { type: 'pot', x: 25, y: 25 }, { type: 'crate', x: 20, y: 21 },
      { type: 'barrel', x: 18, y: 21 }, { type: 'crate', x: 29, y: 23 },
      { type: 'pot', x: 28, y: 17 }, { type: 'barrel', x: 30, y: 24 },
    ],
    npcs: [
      // Lace Harrow — Sovereign of Thorns at her market stall (first proper meet)
      { id: 'lace_briarfen', sprite: 'merchant', x: 27, y: 23, dir: 'down', dialog: 'lace_briarfen' },
      // Wandering townsfolk in the green
      { id: 'thornfolk1', sprite: 'villager', x: 20, y: 17, wander: 3, dialog: 'thornfolk_a' },
      { id: 'thornfolk2', sprite: 'villager2', x: 18, y: 24, wander: 3, dialog: 'thornfolk_b' },
      // Keeper Aurel — brief appearance by the north lane
      { id: 'keeper_aurel', sprite: 'elder', x: 24, y: 14, dir: 'down', dialog: 'keeper_aurel_briarfen' },
      // Post-glitch: Rival as grudging ally (conditionally present)
      { id: 'rival_ally', sprite: 'guard', x: 31, y: 22, dir: 'left', dialog: 'rival_ally' },
    ],
    enemies: [],
  };
}

/* =========================================================
   INTERIORS — Briarfen (timber-and-thatch thornwood town)
   ========================================================= */
function buildBriarfenApoth() {
  return interior('briarfen_apoth', 'THORNROOT APOTHECARY', 13, 10, 'o', (g, def) => {
    rect(g, 2, 3, 9, 1, 'C');          // herb counter, gap at the east end
    set(g, 10, 3, 'o');
    rect(g, 4, 5, 3, 2, 'm');          // brewing rug
    set(g, 6, 9, 'S'); set(g, 7, 9, 'S');
    def.portals.push({ x: 6, y: 9, w: 2, h: 1, to: 'briarfen', tx: 9.5, ty: 12.5 });
    def.npcs.push({ id: 'briarfen_apoth_npc', sprite: 'merchant', x: 5.5, y: 2.2, dir: 'down', dialog: 'briarfen_apoth', service: 'shop' });
    def.props.push(
      { type: 'fireplace', x: 11, y: 1 },       // tincture-brewing hearth
      { type: 'bookshelf', x: 1, y: 1, text: 'Thornroot, dried in bundles. The smell is an acquired taste. No one has acquired it.' },
      { type: 'bookshelf', x: 2, y: 1, text: 'Tonic recipes in Wren\'s hand. Step one of every recipe: "do not panic."' },
      { type: 'bookshelf', x: 9, y: 1, text: 'A wall of little stoppered bottles, each labelled with a different month and a different mood.' },
      { type: 'plant', x: 1, y: 4 }, { type: 'plant', x: 11, y: 4 },
      { type: 'table', x: 5, y: 6 }, { type: 'stool', x: 4, y: 7 }, { type: 'stool', x: 6, y: 7 },
      { type: 'barrel', x: 1, y: 7 }, { type: 'crate', x: 11, y: 7 },
      { type: 'pot', x: 2, y: 6 },
      { type: 'sign', x: 9, y: 6, text: '"A cure that smells nice is a cure that doesn\'t work." — Wren, probably defensively' },
    );
  });
}
function buildBriarfenInn() {
  return interior('briarfen_inn', 'THE BRAMBLE REST', 16, 11, 'o', (g, def) => {
    rect(g, 2, 3, 5, 1, 'C');          // bar counter, walk around east of x=6
    rect(g, 9, 5, 4, 3, 'm');          // common-room rug
    set(g, 7, 10, 'S'); set(g, 8, 10, 'S');
    def.portals.push({ x: 7, y: 10, w: 2, h: 1, to: 'briarfen', tx: 39.5, ty: 12.5 });
    def.npcs.push({ id: 'bramble_keep', sprite: 'villager', x: 4.5, y: 2.2, dir: 'down', dialog: 'briarfen_innkeep', service: 'inn' });
    def.npcs.push({ id: 'bramble_patron', sprite: 'villager2', x: 11, y: 8, wander: 2, dialog: 'bramble_patron' });
    def.props.push(
      { type: 'bed', x: 1, y: 2 }, { type: 'bed', x: 1, y: 5 }, { type: 'bed', x: 1, y: 8 },
      { type: 'fireplace', x: 14, y: 1 },
      { type: 'table', x: 10, y: 5 }, { type: 'stool', x: 9, y: 6 }, { type: 'stool', x: 11, y: 6 },
      { type: 'table', x: 13, y: 7 }, { type: 'stool', x: 13, y: 8 },
      { type: 'table', x: 4, y: 7 }, { type: 'stool', x: 5, y: 7 },
      { type: 'bookshelf', x: 12, y: 1, text: 'A shelf of thorn-wine. One bottle is just a thornbranch in water, labelled VINTAGE.' },
      { type: 'plant', x: 8, y: 1 }, { type: 'plant', x: 14, y: 9 },
      { type: 'barrel', x: 14, y: 4 }, { type: 'basket', x: 1, y: 1 },
      { type: 'sign', x: 6, y: 9, text: 'THE BRAMBLE REST — beds soft, thorns optional, last call when Tilda says so.' },
    );
  });
}
function buildBriarfenCompact() {
  return interior('briarfen_compact', 'THORN COMPACT HALL', 14, 11, 't', (g, def) => {
    rect(g, 9, 2, 3, 2, 'W');          // strongbox vault block (NE corner)
    rect(g, 4, 5, 5, 3, 'm');          // the great contract table's rug
    set(g, 6, 10, 'S'); set(g, 7, 10, 'S');
    def.portals.push({ x: 6, y: 10, w: 2, h: 1, to: 'briarfen', tx: 10.5, ty: 32.5 });
    def.npcs.push({ id: 'compact_marrick', sprite: 'smith', x: 6.5, y: 4, dir: 'down', dialog: 'briarfen_marrick' });
    def.props.push(
      { type: 'fireplace', x: 1, y: 1 },
      { type: 'rack', x: 11, y: 1 }, { type: 'rack', x: 12, y: 1 }, // logging tools / axes
      { type: 'anvil', x: 12, y: 5 },                               // tool-mending
      { type: 'table', x: 5, y: 6 }, { type: 'stool', x: 4, y: 7 }, { type: 'stool', x: 6, y: 7 },
      { type: 'bookshelf', x: 3, y: 1, text: 'Bound ledgers of every Thornwood contract. The clasps are real thorns. They have drawn blood.' },
      { type: 'bookshelf', x: 4, y: 1, text: 'Survey maps of the verge. Someone has redrawn the treeline in red, three times, getting closer.' },
      { type: 'crate', x: 1, y: 8 }, { type: 'crate', x: 2, y: 8 }, { type: 'barrel', x: 12, y: 8 },
      { type: 'pot', x: 1, y: 4 },
      { type: 'sign', x: 9, y: 6, text: 'THORN COMPACT — by signing, the timber agrees to fall. The timber has not yet agreed. Negotiations ongoing.' },
    );
  });
}

/** King's Descent — cliff + river + tide flats, Briarfen east → Tidehaven west. */
function buildRouteSiltDescent() {
  const g = G(52, 72, '.');
  scatter(g, ':', 160, 71, '.');
  rect(g, 0, 0, 52, 2, '#'); rect(g, 0, 0, 3, 72, '#'); rect(g, 49, 0, 3, 72, '#');
  rect(g, 0, 70, 52, 2, '#');
  scatter(g, '#', 50, 72, '.:');
  // road: west gate south → climb → river → flats north
  rect(g, 2, 68, 4, 2, 'p');
  rect(g, 4, 40, 2, 30, 'p');
  rect(g, 4, 40, 20, 2, 'p');
  rect(g, 22, 28, 2, 14, 'p');
  rect(g, 22, 28, 18, 2, 'p');
  rect(g, 38, 8, 2, 22, 'p');
  rect(g, 38, 8, 10, 2, 'p');
  // cliff band
  rect(g, 12, 34, 28, 1, '=');
  rect(g, 12, 38, 28, 1, '=');
  rect(g, 39, 34, 1, 5, '=');
  // river crossing
  rect(g, 6, 24, 40, 3, 'w');
  rect(g, 22, 23, 2, 5, 'b');
  // tide flats north
  rect(g, 4, 2, 44, 10, 's');
  scatter(g, 's', 40, 73, '.');
  return {
    id: 'route_silt_descent', name: "KING'S DESCENT", majorType: 'cliff_route', biome: 'tide_flats',
    grid: g, ambient: 'day', music: 'route',
    buildings: [],
    portals: [
      { x: 2, y: 69, w: 4, h: 1, to: 'briarfen', tx: 45.5, ty: 16 },
      { x: 42, y: 0, w: 4, h: 2, to: 'tidehaven', tx: 3, ty: 40,
        requires: 'matriarch_dead',
        lockMsg: 'The dock road stays closed until Briarfen clears you for the coast.' },
    ],
    props: [
      { type: 'sign', x: 6, y: 66, text: 'WEST: Briarfen. NORTH: Tidehaven flats. Mind the tide.' },
      { type: 'sign', x: 26, y: 36, text: 'Old king\'s highway toll — exact change only. (Exact change: none.)' },
      { type: 'bench', x: 24, y: 32 },
      { type: 'fishspot', x: 44, y: 6 },
      { type: 'rock', x: 14, y: 42 }, { type: 'crate', x: 30, y: 50 },
    ],
    npcs: [],
    enemies: [
      { type: 'slime', x: 10, y: 58 }, { type: 'bat', x: 18, y: 44 },
      { type: 'husk', x: 34, y: 18 }, { type: 'husk', x: 40, y: 12 },
    ],
  };
}

/** Tidehaven — Ch.4 siltshore port hub (shell). */
function buildTidehaven() {
  const g = G(52, 44, 's');
  scatter(g, ':', 100, 81, 's');
  rect(g, 0, 0, 52, 2, 'X'); rect(g, 0, 42, 52, 2, 'X');
  rect(g, 0, 0, 2, 44, 'X'); rect(g, 50, 0, 2, 44, 'X');
  rect(g, 22, 42, 8, 2, 't');
  rect(g, 26, 6, 2, 36, 't');
  rect(g, 14, 16, 24, 8, 't');
  rect(g, 2, 18, 12, 2, 't');
  rect(g, 4, 8, 8, 12, 'w');
  const buildings = [
    { x: 34, y: 5, w: 12, h: 8, door: { x: 39, y: 12 }, label: 'DOCK OFFICE' },
    { x: 8, y: 24, w: 10, h: 7, door: { x: 13, y: 30 }, label: 'FISH MARKET' },
    { x: 36, y: 24, w: 10, h: 7, door: { x: 40, y: 30 }, label: 'STILT INN' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, 's');
  return {
    id: 'tidehaven', name: 'TIDEHAVEN', majorType: 'port_town', biome: 'siltshore',
    grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [
      { x: 0, y: 18, w: 2, h: 4, to: 'route_silt_descent', tx: 40, ty: 3 },
    ],
    props: [
      { type: 'shrine', id: 'bell_gate_tidehaven', x: 20, y: 20 },
      { type: 'stall', x: 12, y: 26 }, { type: 'stall', x: 15, y: 26 },
      { type: 'fishspot', x: 6, y: 10 },
      { type: 'bench', x: 18, y: 22 }, { type: 'bench', x: 30, y: 22 },
      { type: 'lamp', x: 16, y: 16 }, { type: 'lamp', x: 32, y: 16 },
      { type: 'sign', x: 22, y: 40, text: 'TIDEHAVEN — the tide remembers what you forgot.' },
      { type: 'sign', x: 4, y: 20, text: 'WEST: King\'s Descent. SOUTH: Drowned Grotto — not yet mapped.' },
      { type: 'crate', x: 38, y: 8 }, { type: 'barrel', x: 41, y: 9 },
    ],
    npcs: [
      { id: 'marrick_stub', sprite: 'merchant', x: 38, y: 8, dir: 'down', dialog: 'merchant' },
    ],
    enemies: [],
  };
}

function buildTabbHouse() {
  return interior('tabb_house', "TABB'S HOUSE", 10, 9, 'o', (g, def) => {
    rect(g, 3, 3, 4, 3, 'm');
    set(g, 4, 8, 'S'); set(g, 5, 8, 'S');
    def.portals.push({ x: 4, y: 8, w: 2, h: 1, to: 'ashfall', tx: 8.5, ty: 22.5 });
    def.props.push(
      { type: 'fireplace', x: 7, y: 1 },
      { type: 'bed', x: 1, y: 1 },
      { type: 'bookshelf', x: 3, y: 1, text: 'Cat care, vols. I–IV. All bookmarked at the chapter called "They Do What They Want."' },
      { type: 'table', x: 4, y: 4 }, { type: 'stool', x: 5, y: 5 },
      { type: 'plant', x: 1, y: 5 },
      { type: 'basket', x: 8, y: 5 },
      { type: 'cat', id: 'cat_home', x: 8, y: 4, ifFlag: 'cat_found' },
    );
  });
}

/* =========================================================
   DEVHOLM — debug-only test city  (40 x 34)
   Not linked from any world map; reachable only via the debug
   teleporter (press 0). A sandbox for trying out house designs.
   ========================================================= */
function buildTestCity() {
  const g = G(40, 34, '.');
  scatter(g, ':', 90, 777, '.');
  // tree border (double ring)
  rect(g, 0, 0, 40, 2, '#'); rect(g, 0, 32, 40, 2, '#');
  rect(g, 0, 0, 2, 34, '#'); rect(g, 38, 0, 2, 34, '#');
  scatter(g, '#', 16, 778, '.:');
  scatter(g, 'f', 12, 779, '.:');

  // central plaza + cross of roads
  rect(g, 15, 13, 11, 7, 'p');
  rect(g, 19, 2, 2, 30, 'p');       // N–S spine
  rect(g, 2, 16, 36, 2, 'p');       // E–W avenue
  // flower beds at the plaza corners
  rect(g, 16, 13, 2, 2, 'f'); rect(g, 24, 13, 2, 2, 'f');
  rect(g, 16, 18, 2, 2, 'f'); rect(g, 24, 18, 2, 2, 'f');

  // four house footprints, one per quadrant — each a distinct design
  const buildings = [
    { x: 4,  y: 4,  w: 10, h: 7, door: { x: 8,  y: 10 }, label: 'GLASSHOUSE', to: 'tc_glasshouse' },
    { x: 26, y: 4,  w: 10, h: 7, door: { x: 30, y: 10 }, label: 'FORGE-LOFT', to: 'tc_forge' },
    { x: 4,  y: 24, w: 10, h: 7, door: { x: 8,  y: 30 }, label: 'LANTERN LIBRARY', to: 'tc_library' },
    { x: 26, y: 24, w: 10, h: 7, door: { x: 30, y: 30 }, label: 'THE MENAGERIE', to: 'tc_menagerie', style: 'thorn' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, '.');
  // door spokes — every door spills onto a road, no dead-ends
  rect(g, 8,  10, 2, 7,  'p');      // glasshouse → avenue
  rect(g, 29, 10, 2, 7,  'p');      // forge-loft → avenue
  rect(g, 8,  17, 2, 15, 'p');      // library → avenue (apron reaches the exit tile)
  rect(g, 29, 17, 2, 15, 'p');      // menagerie → avenue

  return {
    id: 'testcity', name: 'DEVHOLM', grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [], // intentionally isolated — debug teleport only
    props: [
      { type: 'fountain', x: 20, y: 16.5 },
      { type: 'lamp', x: 15, y: 13 }, { type: 'lamp', x: 25, y: 13 },
      { type: 'lamp', x: 15, y: 19 }, { type: 'lamp', x: 25, y: 19 },
      { type: 'bench', x: 18, y: 19 }, { type: 'bench', x: 22, y: 19 },
      { type: 'sign', x: 20, y: 12, text: 'DEVHOLM — debug sandbox. Four houses, four designs. Mind the seams.' },
      { type: 'sign', x: 9,  y: 16, text: 'NW: GLASSHOUSE · NE: FORGE-LOFT · SW: LANTERN LIBRARY · SE: MENAGERIE' },
      { type: 'crate', x: 3, y: 3 }, { type: 'pot', x: 36, y: 3 },
      { type: 'barrel', x: 3, y: 30 }, { type: 'pot', x: 36, y: 30 },
    ],
    npcs: [
      { id: 'tc_keeper', sprite: 'elder', x: 20, y: 14, dir: 'down', dialog: 'villager1' },
    ],
    enemies: [
      { type: 'dummy', x: 14, y: 25 },
    ],
  };
}

/* ---------- DEVHOLM interiors — four unique house designs ---------- */

// 1) THE GLASSHOUSE — an indoor garden under glass. Grass floor, a koi
//    pond you can fish, flower beds and tall grass. The "house" is a biome.
function buildTcGlasshouse() {
  return interior('tc_glasshouse', 'THE GLASSHOUSE', 15, 12, '.', (g, def) => {
    // central koi pond with a sandy rim
    rect(g, 6, 4, 4, 3, 'w');
    frame(g, 5, 3, 6, 5, 's');
    // planting beds banked along the walls
    rect(g, 1, 1, 13, 1, 'f');
    rect(g, 1, 9, 2, 2, ',');  rect(g, 12, 9, 2, 2, ',');
    rect(g, 2, 4, 1, 4, 'f');  rect(g, 12, 4, 1, 4, 'f');
    // exit stairs (south wall, centre)
    set(g, 7, 11, 'S'); set(g, 8, 11, 'S');
    def.portals.push({ x: 7, y: 11, w: 2, h: 1, to: 'testcity', tx: 8.5, ty: 11.5 });
    def.props.push(
      { type: 'fishspot', x: 8, y: 5 },
      { type: 'plant', x: 1, y: 4 }, { type: 'plant', x: 13, y: 4 },
      { type: 'plant', x: 1, y: 7 }, { type: 'plant', x: 13, y: 7 },
      { type: 'plant', x: 3, y: 2 }, { type: 'plant', x: 11, y: 2 },
      { type: 'basket', x: 2, y: 9 }, { type: 'basket', x: 12, y: 10 },
      { type: 'bench', x: 6, y: 9 }, { type: 'bench', x: 9, y: 9 },
      { type: 'sign', x: 5, y: 9, text: 'Under glass it is always the first warm day of spring. The koi disagree, loudly, about everything.' },
    );
  });
}

// 2) THE FORGE-LOFT — a working smithy. Stone floor, central anvil island,
//    a wall of fire and weapon racks. Hot, dense, industrial.
function buildTcForge() {
  return interior('tc_forge', 'THE FORGE-LOFT', 13, 11, 't', (g, def) => {
    // forge wall (stone block) along the north, with the hearth set into it
    rect(g, 2, 1, 9, 2, 'W');
    // a tool rug marking the anvil island
    rect(g, 5, 5, 3, 2, 'm');
    set(g, 6, 10, 'S'); set(g, 7, 10, 'S');
    def.portals.push({ x: 6, y: 10, w: 2, h: 1, to: 'testcity', tx: 30.5, ty: 11.5 });
    def.props.push(
      { type: 'fireplace', x: 6, y: 1 },
      { type: 'anvil', x: 6, y: 5 }, { type: 'anvil', x: 5, y: 6 },
      { type: 'rack', x: 1, y: 1 }, { type: 'rack', x: 11, y: 1 },
      { type: 'rack', x: 11, y: 4 }, { type: 'rack', x: 11, y: 7 },
      { type: 'barrel', x: 1, y: 4 }, { type: 'barrel', x: 1, y: 7 },
      { type: 'crate', x: 2, y: 8 }, { type: 'crate', x: 10, y: 8 }, { type: 'crate', x: 1, y: 8 },
      { type: 'sign', x: 9, y: 5, text: 'FORGE-LOFT. Two anvils: one for iron, one for arguments. Both ring the same.' },
    );
  });
}

// 3) THE LANTERN LIBRARY — a tall reading room. Wood floor, bookshelf stacks
//    forming aisles, lamps between them and a fireside reading nook.
function buildTcLibrary() {
  return interior('tc_library', 'THE LANTERN LIBRARY', 14, 12, 'o', (g, def) => {
    // a carpeted reading nook in the SE corner
    rect(g, 9, 7, 4, 3, 'm');
    set(g, 6, 11, 'S'); set(g, 7, 11, 'S');
    def.portals.push({ x: 6, y: 11, w: 2, h: 1, to: 'testcity', tx: 8.5, ty: 31.5 });
    // bookshelf stacks form two interior aisles
    const shelfRows = [2, 5];
    for (const sy of shelfRows) {
      for (const sx of [2, 3, 5, 6, 8, 9]) {
        def.props.push({ type: 'bookshelf', x: sx, y: sy });
      }
    }
    def.props.push(
      { type: 'fireplace', x: 11, y: 1 },
      { type: 'lamp', x: 4, y: 3 }, { type: 'lamp', x: 7, y: 3 }, { type: 'lamp', x: 10, y: 3 },
      { type: 'lamp', x: 4, y: 6 }, { type: 'lamp', x: 7, y: 6 },
      { type: 'table', x: 10, y: 8 }, { type: 'stool', x: 11, y: 9 }, { type: 'stool', x: 9, y: 9 },
      { type: 'plant', x: 1, y: 1 }, { type: 'plant', x: 12, y: 10 },
      { type: 'bookshelf', x: 1, y: 8 }, { type: 'bookshelf', x: 1, y: 9 },
      { type: 'sign', x: 9, y: 7, text: 'LANTERN LIBRARY — silence enforced by the lamps. They flicker at gossip.' },
    );
  });
}

// 4) THE MENAGERIE — a cat sanctuary. Carpeted, ringed with beds and baskets,
//    a little indoor flower patch, and cats. So many cats.
function buildTcMenagerie() {
  return interior('tc_menagerie', 'THE MENAGERIE', 13, 10, 'm', (g, def) => {
    // a sunny flower patch in the middle for the cats to ignore
    rect(g, 5, 4, 3, 2, 'f');
    set(g, 6, 9, 'S'); set(g, 7, 9, 'S');
    def.portals.push({ x: 6, y: 9, w: 2, h: 1, to: 'testcity', tx: 30.5, ty: 31.5 });
    def.props.push(
      { type: 'bed', x: 1, y: 1 }, { type: 'bed', x: 1, y: 4 }, { type: 'bed', x: 11, y: 1 },
      { type: 'basket', x: 3, y: 1 }, { type: 'basket', x: 9, y: 1 }, { type: 'basket', x: 10, y: 7 },
      { type: 'cat', id: 'tc_cat1', x: 2, y: 2 },
      { type: 'cat', id: 'tc_cat2', x: 11, y: 2 },
      { type: 'cat', id: 'tc_cat3', x: 9, y: 6 },
      { type: 'cat', id: 'tc_cat4', x: 4, y: 7 },
      { type: 'plant', x: 11, y: 4 }, { type: 'plant', x: 1, y: 7 },
      { type: 'sign', x: 6, y: 6, text: 'THE MENAGERIE. House rules: the cats make the rules. There are no other rules.' },
    );
  });
}

export function buildAllMaps() {
  const maps = {};
  for (const m of [
    buildTown(), buildElderHouse(), buildInn(), buildShop(), buildSmithy(),
    buildRoute1(), buildCave(), buildBossArena(),
    buildAshfall(), buildTavern(), buildCellar(), buildArmory(), buildArena(), buildTabbHouse(),
    buildRouteClaim(), buildClaimCave(), buildRouteThornwood(), buildBriarfen(),
    buildBriarfenApoth(), buildBriarfenInn(), buildBriarfenCompact(),
    buildRouteSiltDescent(), buildTidehaven(),
    buildTestCity(), buildTcGlasshouse(), buildTcForge(), buildTcLibrary(), buildTcMenagerie(),
  ]) {
    maps[m.id] = m;
  }
  return maps;
}

export const MAP_HELPERS = { get, set };
