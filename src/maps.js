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
  scatter(g, ':', 180, 41, 's');
  scatter(g, '#', 24, 42, 's.:');
  frame(g, 0, 0, 44, 56, 's');
  rect(g, 1, 1, 42, 54, ':');
  // main north road
  rect(g, 20, 2, 4, 52, 'p');
  rect(g, 20, 54, 4, 2, 'p');
  // thornwood-edge band (north third)
  scatter(g, '#', 40, 43, '.:p');
  scatter(g, 'h', 20, 44, '.:');
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
      { type: 'sign', x: 22, y: 52, text: 'CONSOLIDATED MINING CO. — lease road. Mind the wire. Mind the beetles.' },
      { type: 'sign', x: 12, y: 10, text: 'NORTH: Contract Cave mouth. SOUTH: Ashfall gates.' },
      { type: 'bench', x: 10, y: 11 },
      { type: 'crate', x: 11, y: 9 }, { type: 'barrel', x: 13, y: 9 }, { type: 'pot', x: 12, y: 10 },
      { type: 'lamp', x: 24, y: 28 },
      { type: 'rock', x: 30, y: 20 }, { type: 'rock', x: 8, y: 32 },
    ],
    npcs: [],
    enemies: [
      { type: 'husk', x: 28, y: 24 }, { type: 'husk', x: 32, y: 18 },
      { type: 'slime', x: 10, y: 40 }, { type: 'slime', x: 34, y: 36 },
    ],
  };
}

/** Contract Cave — Rival set-piece + Lumen Gem (scaffold layout; fights TBD). */
function buildClaimCave() {
  const g = G(40, 32, 'r');
  rect(g, 12, 22, 16, 8, 'c');   // entry / miner foyer
  rect(g, 18, 14, 4, 8, 'c');    // north corridor
  rect(g, 8, 8, 24, 6, 'c');     // main hall + arena
  rect(g, 16, 2, 8, 6, 'c');     // gem vault
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
      { type: 'sign', x: 17, y: 27, text: 'MINING SAFETY — hard hats optional. Feelings not billable. Beetles mandatory.' },
      { type: 'sign', x: 14, y: 10, text: 'ARENA MARK — Consolidated Mining dispute resolution zone.' },
      { type: 'sign', x: 18, y: 4, text: 'LUMEN CLAIM — light that does not belong in the vale. Do not touch. (Everyone touches it.)' },
      { type: 'shrine', id: 'lumen_gem', x: 20, y: 4 },
      { type: 'crate', x: 14, y: 24 }, { type: 'pot', x: 15, y: 25 }, { type: 'barrel', x: 25, y: 23 },
      { type: 'bench', x: 22, y: 24 },
      { type: 'rock', x: 10, y: 10 }, { type: 'rock', x: 29, y: 11 },
    ],
    npcs: [
      { id: 'miner1', sprite: 'villager', x: 16, y: 25, dir: 'right', dialog: 'villager1' },
      { id: 'miner2', sprite: 'villager2', x: 24, y: 26, wander: 2, dialog: 'villager2' },
    ],
    enemies: [],
  };
}

/** Thornwood Verge — dense thornwood route, cave north exit → Briarfen south gate. */
function buildRouteThornwood() {
  const g = G(40, 48, '.');
  scatter(g, ':', 140, 51, '.');
  rect(g, 0, 0, 40, 2, '#'); rect(g, 0, 0, 3, 48, '#'); rect(g, 37, 0, 3, 48, '#');
  rect(g, 0, 46, 40, 2, '#');
  scatter(g, '#', 70, 52, '.:');
  scatter(g, '^', 24, 53, '.:');
  rect(g, 19, 2, 2, 44, 'p');
  rect(g, 19, 46, 2, 2, 'p');
  rect(g, 24, 20, 8, 6, ',');
  rect(g, 8, 32, 7, 5, ',');
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
      { type: 'sign', x: 22, y: 44, text: 'SOUTH: Contract Cave. NORTH: Briarfen market road.' },
      { type: 'sign', x: 12, y: 22, text: 'Thorn Compact waypost — contracts outlive heroes.' },
      { type: 'bench', x: 28, y: 18 },
      { type: 'rock', x: 11, y: 14 }, { type: 'crate', x: 30, y: 30 },
    ],
    npcs: [],
    enemies: [
      { type: 'bat', x: 28, y: 24 }, { type: 'bat', x: 31, y: 28 },
      { type: 'husk', x: 12, y: 34 }, { type: 'husk', x: 16, y: 36 },
      { type: 'slime', x: 26, y: 12 },
    ],
  };
}

/** Briarfen — Ch.3 thornwood market hub (shell). */
function buildBriarfen() {
  const g = G(48, 40, '.');
  scatter(g, ':', 90, 61, '.');
  rect(g, 0, 0, 48, 2, '#'); rect(g, 0, 38, 48, 2, '#');
  rect(g, 0, 0, 2, 40, '#'); rect(g, 46, 0, 2, 40, '#');
  rect(g, 22, 38, 4, 2, 'p');
  rect(g, 22, 4, 4, 34, 'p');
  rect(g, 16, 14, 16, 10, 'p');
  rect(g, 46, 14, 2, 12, 'p');
  rect(g, 38, 14, 9, 2, 'p');
  scatter(g, '#', 30, 62, '.:p');
  scatter(g, 'h', 18, 63, '.:');
  const buildings = [
    { x: 4, y: 5, w: 10, h: 7, door: { x: 9, y: 11 }, label: 'APOTHECARY' },
    { x: 32, y: 5, w: 11, h: 7, door: { x: 37, y: 11 }, label: 'THORN INN' },
    { x: 6, y: 22, w: 12, h: 8, door: { x: 12, y: 29 }, label: 'TIMBER COMPACT' },
  ];
  for (const b of buildings) rect(g, b.x, b.y, b.w, b.h, '.');
  return {
    id: 'briarfen', name: 'BRIARFEN', majorType: 'market_town', biome: 'hollow_thornwood',
    grid: g, ambient: 'day', music: 'town',
    buildings,
    portals: [
      { x: 22, y: 39, w: 4, h: 1, to: 'route_thornwood', tx: 20, ty: 2 },
      { x: 47, y: 14, w: 1, h: 4, to: 'route_silt_descent', tx: 3, ty: 70,
        requires: 'matriarch_dead',
        lockMsg: 'East road sealed until the Thorn Matriarch falls — or Lace Harrow grants passage.' },
    ],
    props: [
      { type: 'shrine', id: 'bell_gate_briarfen', x: 18, y: 16 },
      { type: 'stall', x: 14, y: 18 }, { type: 'stall', x: 17, y: 18 }, { type: 'stall', x: 20, y: 18 },
      { type: 'fountain', x: 24, y: 17 },
      { type: 'bench', x: 28, y: 20 }, { type: 'bench', x: 15, y: 24 },
      { type: 'lamp', x: 16, y: 14 }, { type: 'lamp', x: 31, y: 14 },
      { type: 'sign', x: 20, y: 37, text: 'BRIARFEN — thorn market. Population: entangled.' },
      { type: 'sign', x: 40, y: 15, text: 'EAST: King\'s Descent to Tidehaven (sealed).' },
      { type: 'sign', x: 24, y: 3, text: 'NORTH: Matriarch Depths — not yet mapped.' },
      { type: 'crate', x: 33, y: 20 }, { type: 'barrel', x: 35, y: 21 },
    ],
    npcs: [
      { id: 'lace_stub', sprite: 'merchant', x: 19, y: 19, dir: 'down', dialog: 'merchant' },
    ],
    enemies: [],
  };
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

export function buildAllMaps() {
  const maps = {};
  for (const m of [
    buildTown(), buildElderHouse(), buildInn(), buildShop(), buildSmithy(),
    buildRoute1(), buildCave(), buildBossArena(),
    buildAshfall(), buildTavern(), buildCellar(), buildArmory(), buildArena(), buildTabbHouse(),
    buildRouteClaim(), buildClaimCave(), buildRouteThornwood(), buildBriarfen(),
    buildRouteSiltDescent(), buildTidehaven(),
  ]) {
    maps[m.id] = m;
  }
  return maps;
}

export const MAP_HELPERS = { get, set };
