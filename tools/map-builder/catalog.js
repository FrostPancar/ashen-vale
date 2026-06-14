// ASHEN VALE — Map Builder asset catalog.
// Single source of truth for the asset library: every paintable tile and every
// placeable object, organized into categories, each with a preview resolver and
// (for interactables) an editable-field schema. Built from the real game data
// (TILDEF + Art) so previews and exports match the game exactly.
import { Art } from '@/art.js';
import { TILDEF } from '@/maps.js';

/* ---------- tile (terrain) catalog ---------- */
// Friendly labels + grouping for the raw TILDEF chars.
const TILE_META = {
  '.': { label: 'Grass',        group: 'Ground' },
  ':': { label: 'Grass (alt)',  group: 'Ground' },
  ',': { label: 'Tall grass',   group: 'Ground' },
  'f': { label: 'Flowers',      group: 'Ground' },
  'p': { label: 'Path',         group: 'Ground' },
  's': { label: 'Sand',         group: 'Ground' },
  'w': { label: 'Water',        group: 'Ground' },
  'b': { label: 'Bridge',       group: 'Ground' },
  'c': { label: 'Cave floor',   group: 'Ground' },
  'o': { label: 'Wood floor',   group: 'Interior' },
  't': { label: 'Stone floor',  group: 'Interior' },
  'm': { label: 'Carpet',       group: 'Interior' },
  'S': { label: 'Stairs',       group: 'Interior' },
  '#': { label: 'Tree',         group: 'Nature' },
  '^': { label: 'Pine',         group: 'Nature' },
  'h': { label: 'Bush',         group: 'Nature' },
  'F': { label: 'Fence',        group: 'Structure' },
  '=': { label: 'Cliff',        group: 'Structure' },
  'r': { label: 'Cave wall',    group: 'Structure' },
  'W': { label: 'Interior wall',group: 'Interior' },
  'C': { label: 'Counter',      group: 'Interior' },
  'X': { label: 'City wall',    group: 'Structure' },
  '_': { label: 'Void',         group: 'Structure' },
  'd': { label: 'Dirt',         group: 'Ground' },
  'g': { label: 'Gravel',       group: 'Ground' },
  'k': { label: 'Cobblestone',  group: 'Ground' },
  'u': { label: 'Mud',          group: 'Ground' },
  'n': { label: 'Snow',         group: 'Ground' },
  'i': { label: 'Ice',          group: 'Ground' },
  'a': { label: 'Ash',          group: 'Ground' },
  'l': { label: 'Forest floor', group: 'Ground' },
  'j': { label: 'Cracked stone',group: 'Ground' },
  'q': { label: 'Marble',       group: 'Interior' },
  'y': { label: 'Dark wood',    group: 'Interior' },
  'z': { label: 'Rug',          group: 'Interior' },
};

export const TILES = Object.entries(TILDEF).map(([ch, def]) => ({
  ch,
  tex: def.tex,
  solid: !!def.solid,
  tall: !!def.tall,
  label: TILE_META[ch]?.label || def.tex,
  group: TILE_META[ch]?.group || 'Misc',
}));

/* ---------- object (prop / npc / enemy) catalog ---------- */
// Each entry knows how to resolve a preview canvas from Art, which palette
// category it lives in, whether it is interactable, and what fields the
// inspector should expose.

// prop type -> Art.props key (most are 1:1; these differ)
const PROP_ART = { rock: 'rockS', lever: 'leverOff', gateBig: 'gate' };

const ENEMY_TYPES = ['slime', 'bat', 'husk', 'shade', 'warden', 'rat', 'crawler', 'thornling', 'revenant', 'rival', 'dummy'];

// Field schemas reused across entries.
const F = {
  dialogText: { key: 'text', label: 'Dialog box text', type: 'textarea', placeholder: 'What this says when read…' },
  chestId:    { key: 'id', label: 'Chest id', type: 'text', placeholder: 'unique_chest_id' },
  loot:       { key: 'loot', label: 'Loot spec', type: 'text', placeholder: 'bundle:gold:18-28|potion:1' },
  leverId:    { key: 'id', label: 'Lever id', type: 'text', placeholder: 'gate_lever' },
  leverOn:    { key: 'on', label: 'Starts on', type: 'bool' },
  ifFlag:     { key: 'ifFlag', label: 'Only if flag', type: 'text', placeholder: '(optional) flag:value' },
};

// Gates span `w` tiles wide and open when a flag is set.
const GATE_FIELDS = [
  { key: 'id', label: 'Gate id', type: 'text', placeholder: 'cave_gate' },
  { key: 'w', label: 'Width (tiles)', type: 'number', placeholder: '2' },
  { key: 'openIf', label: 'Opens when flag', type: 'text', placeholder: 'lever_pulled' },
];

// kind: 'prop' | 'npc' | 'enemy'  — drives serialization + preview lookup.
const OBJECTS = [
  // --- Nature ---
  o('prop', 'tree',    'Tree',     'Nature'),
  o('prop', 'pine',    'Pine',     'Nature'),
  o('prop', 'boulder', 'Boulder',  'Nature'),
  o('prop', 'rock',    'Rock',     'Nature'),
  o('prop', 'deadtree','Dead tree','Nature'),
  o('prop', 'stump',   'Tree stump','Nature'),
  o('prop', 'log',     'Fallen log','Nature'),
  o('prop', 'mushroom','Mushrooms','Nature'),
  o('prop', 'reeds',   'Reeds',    'Nature'),
  o('prop', 'crystal', 'Crystal',  'Nature'),

  // --- Structures ---
  o('prop', 'fountain', 'Fountain', 'Structures'),
  o('prop', 'well',     'Well',     'Structures'),
  o('prop', 'gate',     'Gate',     'Structures', { multi: true, fields: GATE_FIELDS }),
  o('prop', 'gateBig',  'Gate (big)','Structures', { multi: true, fields: GATE_FIELDS }),
  o('prop', 'lamp',     'Lamp',     'Structures'),
  o('prop', 'torch',    'Torch',    'Structures'),
  o('prop', 'stall',    'Market stall','Structures'),
  o('prop', 'statue',   'Statue',   'Structures'),
  o('prop', 'pillar',   'Pillar',   'Structures'),
  o('prop', 'signpost', 'Signpost', 'Structures'),
  o('prop', 'tent',     'Tent',     'Structures'),
  o('prop', 'haybale',  'Hay bale', 'Structures'),
  o('prop', 'woodpile', 'Woodpile', 'Structures'),
  o('prop', 'campfire', 'Campfire', 'Structures'),
  o('prop', 'grave',    'Grave',    'Structures'),

  // --- Furniture / interior ---
  o('prop', 'bed',      'Bed',      'Furniture'),
  o('prop', 'table',    'Table',    'Furniture'),
  o('prop', 'desk',     'Desk',     'Furniture'),
  o('prop', 'stool',    'Stool',    'Furniture'),
  o('prop', 'chair',    'Chair',    'Furniture'),
  o('prop', 'bench',    'Bench',    'Furniture'),
  o('prop', 'sofa',     'Sofa',     'Furniture'),
  o('prop', 'cabinet',  'Cabinet',  'Furniture'),
  o('prop', 'clock',    'Clock',    'Furniture'),
  o('prop', 'stove',    'Stove',    'Furniture'),
  o('prop', 'vase',     'Vase',     'Furniture'),
  o('prop', 'fireplace','Fireplace','Furniture'),
  o('prop', 'plant',    'Plant',    'Furniture'),
  o('prop', 'anvil',    'Anvil',    'Furniture'),
  o('prop', 'rack',     'Rack',     'Furniture'),

  // --- Containers (knockable) ---
  o('prop', 'pot',     'Pot',     'Containers'),
  o('prop', 'crate',   'Crate',   'Containers'),
  o('prop', 'barrel',  'Barrel',  'Containers'),
  o('prop', 'basket',  'Basket',  'Containers'),
  o('prop', 'bucket',  'Bucket',  'Containers'),

  // --- Interactables ---
  o('prop', 'sign',      'Sign',      'Interactables', { interactable: true, badge: 'sign',  fields: [F.dialogText] }),
  o('prop', 'bookshelf', 'Bookshelf', 'Interactables', { interactable: true, badge: 'read',  fields: [F.dialogText] }),
  o('prop', 'chest',     'Chest',     'Interactables', { interactable: true, badge: 'chest', fields: [F.chestId, F.loot] }),
  o('prop', 'lever',     'Lever',     'Interactables', { interactable: true, badge: 'lever', fields: [F.leverId, F.leverOn] }),
  o('prop', 'fishspot',  'Fishing spot','Interactables', { interactable: true, badge: 'use' }),
  o('prop', 'shrine',    'Shrine',    'Interactables', { interactable: true, badge: 'use', fields: [F.ifFlag] }),
  o('prop', 'cat',       'Cat',       'Interactables', { interactable: true, badge: 'use', fields: [F.ifFlag] }),
  o('prop', 'charm',     'Charm',     'Interactables', { badge: 'use', fields: [F.ifFlag] }),
  o('prop', 'dummy',     'Training dummy','Interactables', { previewKind: 'enemy' }),

  // --- NPCs (interactable; carry dialog) ---
  npc('villager',  'Villager'),
  npc('villager2', 'Villager (alt)'),
  npc('merchant',  'Merchant'),
  npc('smith',     'Smith'),
  npc('guard',     'Guard'),
  npc('elder',     'Elder'),

  // --- Enemies ---
  ...['slime', 'bat', 'husk', 'shade', 'warden', 'rat', 'crawler', 'thornling', 'revenant', 'rival']
    .map(t => o('enemy', t, cap(t), 'Enemies')),
];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function o(kind, type, label, category, opts = {}) {
  return {
    kind, type, label, category,
    previewKind: opts.previewKind || (kind === 'enemy' ? 'enemy' : 'prop'),
    interactable: !!opts.interactable,
    badge: opts.badge || null,
    fields: opts.fields || [],
    multi: !!opts.multi,           // occupies more than one tile (draw a bbox)
  };
}

function npc(sprite, label) {
  return {
    kind: 'npc', type: sprite, sprite, label, category: 'NPCs',
    previewKind: 'char',
    interactable: true,
    badge: 'dialog',
    fields: [
      { key: 'id', label: 'NPC id', type: 'text', placeholder: 'unique_npc_id' },
      { key: 'dir', label: 'Facing', type: 'select', options: ['down', 'up', 'left', 'right'] },
      { key: 'wander', label: 'Wander radius', type: 'number', placeholder: '0 = stay put' },
      { key: 'service', label: 'Shop service', type: 'select', options: ['', 'shop', 'inn', 'smith', 'armory'] },
      { key: 'dialog', label: 'Dialog id', type: 'text', placeholder: 'auto-generated if blank' },
      { key: '__dialogPages', label: 'Dialog', type: 'dialog' }, // authored conversation pages
    ],
  };
}

export const OBJECT_CATEGORIES = [...new Set(OBJECTS.map(o => o.category))];
export const OBJECTS_BY_TYPE = Object.fromEntries(OBJECTS.map(o => [o.type, o]));
export { OBJECTS };

function prettify(s) { return s.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()).trim(); }
function sprinkleEntry(type) {
  return { kind: 'prop', type, label: prettify(type), category: 'Sprinkles', previewKind: 'sprinkle', interactable: false, badge: null, fields: [], multi: false };
}
// Sprinkles are populated by Art.init() (after this module loads), so build the
// list lazily from the live Art registry each time the tab is opened.
export function sprinkleEntries() {
  return Object.keys(Art.sprinkles || {}).sort().map(sprinkleEntry);
}

// Tile footprint of a placed object, in tiles. Gates are `w`×1; stalls 2×1.
export function footprintFor(obj) {
  if (obj.type === 'gate' || obj.type === 'gateBig') return { w: Math.max(1, Math.round(obj.w || 1)), h: 1 };
  if (obj.type === 'stall') return { w: 2, h: 1 };
  return { w: 1, h: 1 };
}

/* ---------- preview resolver ---------- */
// Returns an HTMLCanvasElement for a catalog entry (or null).
export function previewCanvas(entry) {
  switch (entry.previewKind) {
    case 'enemy': {
      const a = Art.enemies[entry.type];
      return Array.isArray(a) ? a[0] : a || null;
    }
    case 'char': {
      const c = Art.chars[entry.sprite || entry.type];
      return c?.down?.[0] || (Array.isArray(c) ? c[0] : c) || null;
    }
    case 'sprinkle':
      return Art.sprinkles?.[entry.type] || Art.props[entry.type] || null;
    case 'prop':
    default: {
      const key = PROP_ART[entry.type] || entry.type;
      return Art.props[key] || null;
    }
  }
}

export function tileCanvas(tex) {
  return Art.tiles[tex] || null;
}

// Lookup a catalog entry for a placed object (by its stored type/sprite).
export function entryFor(obj) {
  if (obj.kind === 'npc' || obj.sprite) return OBJECTS_BY_TYPE[obj.sprite] || OBJECTS_BY_TYPE[obj.type];
  const e = OBJECTS_BY_TYPE[obj.type];
  if (e) return e;
  if (Art.sprinkles?.[obj.type]) return sprinkleEntry(obj.type); // placed sprinkle
  return undefined;
}

export const INTERACTABLE_PROP_TYPES = new Set(
  OBJECTS.filter(o => o.interactable && o.kind === 'prop').map(o => o.type)
);
