// ASHEN VALE — Diablo-style item generation: slots, rarities, affixes, curated loot.

/** Demo caps loot at Rare — Legendary exists for future content only. */
export const DEMO_MAX_RARITY = 'rare';

export const RARITIES = {
  common:    { name: 'Common',    affixes: 0, mult: 1.0, weight: 48, cls: '' },
  magic:     { name: 'Magic',     affixes: 1, mult: 1.2, weight: 38, cls: 'r-magic' },
  rare:      { name: 'Rare',      affixes: 2, mult: 1.45, weight: 14, cls: 'r-rare' },
  legendary: { name: 'Legendary', affixes: 3, mult: 1.8, weight: 0, cls: 'r-legendary', demo: false },
};

export const BASES = {
  weapon: [
    // ── Tier 0 starters ──────────────────────────────────────────────────────
    { id: 'rustblade',   name: 'Rustblade',        icon: 'rustblade',   dmg: 5, classes: ['knight'], tier: 0 },
    { id: 'roadcleaver', name: 'Road Cleaver',     icon: 'roadcleaver', dmg: 5, classes: ['knight'], tier: 0 },
    { id: 'scoutbow',    name: 'Scout Bow',        icon: 'scoutbow',    dmg: 4, classes: ['ranger'], tier: 0 },
    { id: 'hollowbow',   name: 'Hollow Bow',       icon: 'hollowbow',   dmg: 4, classes: ['ranger'], tier: 0 },
    { id: 'willowstaff', name: 'Willow Staff',     icon: 'willowstaff', dmg: 4, classes: ['mage'],   tier: 0 },
    { id: 'bellstaff',   name: 'Bellwood Staff',   icon: 'bellstaff',   dmg: 4, classes: ['mage'],   tier: 0 },
    // ── Tier 1 ───────────────────────────────────────────────────────────────
    { id: 'sword',       name: 'Sword',            icon: 'sword',       dmg: 6, classes: ['knight'], tier: 1 },
    { id: 'bow',         name: 'Shortbow',         icon: 'bow',         dmg: 5, classes: ['ranger'], tier: 1 },
    { id: 'staff',       name: 'Ashwood Staff',    icon: 'staff',       dmg: 5, classes: ['mage'],   tier: 1 },
    // ── Tier 2 — passive abilities synergize with class skills ────────────────
    // Knight T2
    { id: 'coalbreaker', name: 'Coalbreaker',      icon: 'coalbreaker', dmg: 7, classes: ['knight'], tier: 2,
      passive: { id: 'rush_stagger', label: 'Rush Stagger', desc: 'Shield Rush stuns enemies 50% longer.' },
      origin: 'Heavy chopping blade repurposed from the Vale quarry crews. The weight keeps stunned foes down.', maker: 'Bram\'s predecessors, the Eldermoor road-breakers.' },
    { id: 'ironveil',    name: 'Ironveil Glaive',  icon: 'ironveil',    dmg: 7, classes: ['knight'], tier: 2,
      passive: { id: 'whirl_reach', label: 'Whirl Reach', desc: 'Whirlwind radius +0.3 tiles.' },
      origin: 'Extended pole-mount issued to Ashen Vale garrison for crowd control on the narrow roads.', maker: 'Ashfall Armory, pre-Warden era.' },
    { id: 'embersteel',  name: 'Embersteel Blade', icon: 'embersteel',  dmg: 8, classes: ['knight'], tier: 2,
      passive: { id: 'rush_empower', label: 'Rush Empower', desc: 'Next basic attack after Shield Rush deals +60% damage.' },
      origin: 'Forged from smelter-slag the night the Vale\'s last furnace was lit. The charge carries through.', maker: 'Anonymous — signed only with a quarry-mark.' },
    // Ranger T2
    { id: 'longbow',     name: 'Ironstring Longbow', icon: 'longbow',   dmg: 6, classes: ['ranger'], tier: 2,
      passive: { id: 'tumble_empower', label: 'Tumble Empower', desc: 'Next Quick Shot after Tumble deals +60% damage.' },
      origin: 'Standard issue for Ashfall outer-wall sentinels. The bowstring never loses tension.', maker: 'Foxpath Company, Ashfall commission.' },
    { id: 'splitshot',   name: 'Splitshot Recurve', icon: 'splitshot',  dmg: 6, classes: ['ranger'], tier: 2,
      passive: { id: 'volley_nock', label: 'Volley Nock', desc: 'Multishot fires 2 extra arrows.' },
      origin: 'Double-nocked design from the Foxpath company. Unstable but lethal in a pack.', maker: 'Foxpath Company field workshop.' },
    { id: 'ashrecurve',  name: 'Ember Recurve',    icon: 'ashrecurve',  dmg: 7, classes: ['ranger'], tier: 2,
      passive: { id: 'volley_empower', label: 'Volley Empower', desc: 'Multishot deals +25% damage.' },
      origin: 'Recurve tips tipped with ember-glass that concentrates force through the arrow fan.', maker: 'Kettle\'s workshop, post-Warden.' },
    // Mage T2
    { id: 'bellwand',    name: 'Bell Wand',         icon: 'bellwand',   dmg: 5, classes: ['mage'],   tier: 2,
      passive: { id: 'spark_fork', label: 'Spark Fork', desc: '25% chance each Spark forks toward the nearest enemy.' },
      origin: 'Resonant copper tone lingers in wounded flesh, drawing the next discharge automatically.', maker: 'Bell Hollow artificers, recovered from the ruin.' },
    { id: 'moonrod',     name: 'Moonstone Rod',     icon: 'moonrod',    dmg: 6, classes: ['mage'],   tier: 2,
      passive: { id: 'bolt_haste', label: 'Bolt Haste', desc: 'Spark Bolt hitting an enemy reduces Nova cooldown by 1.5s.' },
      origin: 'The moonstone mount converts kinetic impact into stored discharge. Old Bellglass theory.', maker: 'Unknown — arrived in Ashfall in a sealed crate marked VALE ROAD OFFICE.' },
    { id: 'ashglass',    name: 'Ashglass Focus',    icon: 'ashglass',   dmg: 7, classes: ['mage'],   tier: 2,
      passive: { id: 'blink_burst', label: 'Blink Burst', desc: 'Blink leaves a damaging shockwave at the departure point.' },
      origin: 'The hollow glass head fractures on teleport; the displaced air collapses inward violently.', maker: 'Bram (one-off commission, refused to say who for).' },
  ],
  armor: [
    // ── Tier 0 ───────────────────────────────────────────────────────────────
    { id: 'wrap',       name: 'Cloth Wrap',       icon: 'wrap',       def: 1, tier: 0 },
    { id: 'tunic',      name: 'Tunic',            icon: 'tunic',      def: 2, tier: 0 },
    { id: 'gambeson',   name: 'Padded Gambeson',  icon: 'gambeson',   def: 2, tier: 0,
      origin: 'Cheap quilted padding sold at every road-stop between Eldermoor and Ashfall.', maker: 'Various Vale clothiers.' },
    // ── Tier 1 ───────────────────────────────────────────────────────────────
    { id: 'jerkin',     name: 'Leather Jerkin',   icon: 'jerkin',     def: 3, tier: 1 },
    { id: 'mail',       name: 'Chainmail',        icon: 'mail',       def: 4, tier: 1 },
    { id: 'ashfall_vest', name: 'Ashfall Vest',   icon: 'ashfall_vest', def: 3, tier: 1,
      passive: { id: 'regen_move', label: 'On the Move', desc: 'Restores +0.5 HP/s while moving.' },
      origin: 'Lightweight kit issued to Ashfall street patrol. Close-cut for ease of movement.', maker: 'Ashfall Armory, standard issue.' },
    // ── Tier 2 ───────────────────────────────────────────────────────────────
    { id: 'brigandine', name: 'Brigandine',       icon: 'brigandine', def: 5, tier: 2,
      passive: { id: 'shield_ward', label: 'Shield Ward', desc: 'Take 15% less damage from all sources.' },
      origin: 'Riveted commander plate. The rivets are stamped with the names of tolls collected.', maker: 'Warden garrison smithy — one of nine surviving sets.' },
    { id: 'scale_hauberk', name: 'Scale Hauberk', icon: 'scale_hauberk', def: 6, tier: 2,
      passive: { id: 'second_wind', label: 'Second Wind', desc: 'First time HP drops below 30% per fight, instantly restore 10 HP.' },
      origin: 'Each scale purchased for one gold at the Bell Pit. Veteran pit fighters wear them soft-side in.', maker: 'Pit fighters\' guild cooperative.' },
  ],
  trinket: [
    { id: 'ring',         name: 'Ring',           icon: 'ring' },
    { id: 'charm',        name: 'Charm',          icon: 'charm' },
    { id: 'band',         name: 'Woven Band',     icon: 'band' },
    { id: 'pendant',      name: 'Moss Pendant',   icon: 'pendant' },
    // New trinkets with passive abilities
    { id: 'ember_shard',  name: 'Ember Shard',    icon: 'ember_shard',
      passive: { id: 'dash_mana', label: 'Ember Rush', desc: 'Mobility skills restore 5 MP on use.' },
      origin: 'A fragment of the Bell Pit brazier. Glows faintly during bursts of movement.', maker: 'Harvested by Ashfall street-sweepers; sold by Jun.' },
    { id: 'hollow_stone', name: 'Hollow Stone',   icon: 'hollow_stone',
      passive: { id: 'kill_surge', label: 'Kill Surge', desc: 'Killing an enemy within 1.5s of a skill hit grants +4% crit for 4s.' },
      origin: 'A river stone with a natural hole, hung from Vale gallows as omen charms. The hole focuses killing intent.', maker: 'Found. Origin unknown.' },
    { id: 'thorn_band',   name: 'Thorn Band',     icon: 'thorn_band',
      passive: { id: 'thorn_retaliate', label: 'Thornback', desc: 'When hit, deal 3 damage back to the attacker.' },
      origin: 'Braided from bellwood hedge thorns that calcify on contact with blood.', maker: 'Old Het, who sells them as "insurance".' },
    { id: 'pilgrim_token', name: 'Pilgrim\'s Token', icon: 'pilgrim_token',
      passive: { id: 'wanderer_ward', label: 'Wanderer\'s Ward', desc: 'Take 8% less damage while moving.' },
      origin: 'Pressed tin badge handed to travelers at the Ashfall east gate. Most never come back for the deposit.', maker: 'Ashfall gate wardens.' },
  ],
};

const AFFIXES = [
  { id: 'dmg',   text: v => `+${v} damage`,            min: 1, max: 4,  slots: ['weapon', 'trinket'] },
  { id: 'hp',    text: v => `+${v} max life`,           min: 5, max: 20, slots: ['armor', 'trinket'] },
  { id: 'mp',    text: v => `+${v} max mana`,           min: 4, max: 15, slots: ['trinket', 'weapon'] },
  { id: 'def',   text: v => `+${v} defense`,            min: 1, max: 3,  slots: ['armor'] },
  { id: 'spd',   text: v => `+${v}% move speed`,        min: 4, max: 12, slots: ['armor', 'trinket'] },
  { id: 'crit',  text: v => `+${v}% critical chance`,   min: 3, max: 10, slots: ['weapon', 'trinket'] },
  { id: 'leech', text: v => `+${v}% life on hit`,       min: 2, max: 6,  slots: ['weapon'] },
  { id: 'cdr',   text: v => `-${v}% skill cooldowns`,   min: 4, max: 12, slots: ['trinket', 'weapon'] },
];

/** Class-biased affix weights for drops and curated loot. */
const CLASS_AFFIX_BIAS = {
  knight: { leech: 3, hp: 2.5, def: 2, dmg: 1.5, crit: 1, spd: 1, mp: 0.5, cdr: 0.5 },
  ranger: { crit: 3, spd: 2.5, dmg: 2, leech: 1, hp: 1, def: 1, mp: 1, cdr: 1 },
  mage:   { mp: 3, cdr: 2.5, dmg: 2, crit: 1.5, hp: 1, def: 0.5, leech: 0.5, spd: 1 },
};

const PREFIXES = [
  'Cracked', 'Sturdy', 'Keen', 'Grim', 'Mossy', 'Old', 'Hollow', 'Vale',
  'Ashen', 'Moon', 'Bell', 'Road', 'Fox', 'Lantern', 'Worn', 'Patchwork',
];
const SUFFIXES = [
  'of the Fox', 'of Embers', 'of the Bell', 'of Moss', 'of Hunger',
  'of the Deep', 'of Dawn', 'of the Road', 'of the Hollow', 'of Eldermoor',
  'of the Scout', 'of Quiet Steps',
];

/** Per-enemy drop profiles — itemChance / potionChance are independent rolls. */
export const ENEMY_LOOT = {
  slime:  { item: 0.10, potion: 0.05, slots: ['trinket', 'armor'],       rarities: { common: 72, magic: 28 } },
  bat:    { item: 0.18, potion: 0.08, slots: ['trinket'],                rarities: { common: 55, magic: 40, rare: 5 }, affixBias: ['spd', 'crit'] },
  husk:   { item: 0.30, potion: 0.14, slots: ['armor', 'weapon'],        rarities: { common: 40, magic: 50, rare: 10 }, affixBias: ['def', 'hp', 'leech'] },
  shade:  { item: 0.26, potion: 0.10, slots: ['trinket', 'weapon'],       rarities: { common: 35, magic: 55, rare: 10 }, affixBias: ['mp', 'cdr', 'crit'] },
  warden: { item: 1.0,  potion: 0.35, slots: ['weapon'],                 rarities: { rare: 100 }, affixBias: ['dmg', 'leech', 'crit', 'mp'], levelBonus: 1 },
};

/** Named milestone rewards — still Rare tier, not Legendary. */
const MILESTONE_ITEMS = {
  road_keeper: {
    knight: { name: 'Road-Keeper\'s Cleaver', affixes: ['dmg', 'leech'], baseId: 'roadcleaver' },
    ranger: { name: 'Foxpath Shortbow',       affixes: ['crit', 'spd'],  baseId: 'hollowbow' },
    mage:   { name: 'Hollow Whisper',         affixes: ['mp', 'cdr'],    baseId: 'bellstaff' },
  },
  warden_trophy: {
    knight: { name: 'Warden\'s Toll',         affixes: ['dmg', 'leech'], baseId: 'sword' },
    ranger: { name: 'Bellshot',               affixes: ['crit', 'dmg'],  baseId: 'bow' },
    mage:   { name: 'Last Light Staff',       affixes: ['mp', 'cdr'],   baseId: 'staff' },
  },
};

/** Per-level affix scaling — tuned for demo lv 1–6 curve. */
const AFFIX_LEVEL_SCALE = 0.10;

/** Minimum affix roll quality by rarity (0 = full random, 1 = always max). */
const RARITY_AFFIX_QUALITY = {
  common: 0,
  magic: 0.45,
  rare: 0.72,
  legendary: 0.85,
};

/** Curated chest / quest rewards roll toward the top of affix ranges. */
const CURATED_AFFIX_QUALITY = 0.74;

/** Milestone weapons always roll these affixes at high quality. */
const MILESTONE_AFFIX_QUALITY = 0.82;

let uid = 1;
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function ri(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); }

function rollAffixValue(a, level, quality = 0) {
  const scale = 1 + level * AFFIX_LEVEL_SCALE;
  const span = a.max - a.min;
  const lo = span > 0 ? a.min + Math.floor(span * quality) : a.min;
  return Math.round(ri(Math.min(lo, a.max), a.max) * scale);
}

const RARITY_ORDER = ['common', 'magic', 'rare', 'legendary'];

export function canEquipWeapon(klass, baseId) {
  const base = BASES.weapon.find(b => b.id === baseId);
  return base ? base.classes.includes(klass) : false;
}

export function rollRarity(luck = 0, maxRarity = DEMO_MAX_RARITY) {
  const cap = RARITY_ORDER.indexOf(maxRarity);
  let total = 0;
  const w = RARITY_ORDER.map((k, i) => {
    const r = RARITIES[k];
    if (i > cap || r.weight <= 0) return [k, 0];
    const adj = k === 'common'
      ? Math.max(8, r.weight - luck * 8)
      : r.weight + luck * 3;
    total += adj;
    return [k, adj];
  });
  let roll = Math.random() * total;
  for (const [k, wt] of w) {
    roll -= wt;
    if (roll <= 0) return k;
  }
  return 'common';
}

function rollFromTable(table) {
  let total = 0;
  const entries = Object.entries(table);
  for (const [, w] of entries) total += w;
  let roll = Math.random() * total;
  for (const [k, w] of entries) {
    roll -= w;
    if (roll <= 0) return k;
  }
  return entries[0][0];
}

function pickBase(slot, opts) {
  let pool = BASES[slot];
  if (opts.baseId) {
    const forced = pool.find(b => b.id === opts.baseId);
    if (forced) return forced;
  }
  if (slot === 'weapon' && opts.klass) {
    pool = pool.filter(b => b.classes.includes(opts.klass));
    if (!pool.length) pool = BASES.weapon;
  }
  const lvl = opts.level || 1;
  if (opts.preferTier != null) {
    const tiered = pool.filter(b => (b.tier ?? 0) === opts.preferTier);
    if (tiered.length) pool = tiered;
  } else if (lvl <= 2) {
    const low = pool.filter(b => (b.tier ?? 0) === 0);
    if (low.length && Math.random() < 0.65) pool = low;
  }
  return pick(pool);
}

function pickAffix(avail, chosen, biasIds = []) {
  const weights = avail.map(a => {
    let w = 1;
    if (biasIds.includes(a.id)) w += 4;
    return [a, w];
  });
  let total = 0;
  for (const [, w] of weights) total += w;
  let roll = Math.random() * total;
  for (const [a, w] of weights) {
    roll -= w;
    if (roll <= 0) return a;
  }
  return avail[0];
}

function affixBiasList(opts) {
  const bias = [...(opts.affixBias || [])];
  if (opts.klass && opts.classAffix !== false) {
    const table = CLASS_AFFIX_BIAS[opts.klass];
    if (table) {
      const sorted = Object.entries(table).sort((a, b) => b[1] - a[1]);
      for (const [id] of sorted.slice(0, 4)) {
        if (!bias.includes(id)) bias.push(id);
      }
    }
  }
  return bias;
}

export function generateItem(opts = {}) {
  const slot = opts.slot || pick(['weapon', 'armor', 'trinket']);
  const maxRarity = opts.maxRarity || DEMO_MAX_RARITY;
  const rarity = opts.rarity || (opts.rarities ? rollFromTable(opts.rarities) : rollRarity(opts.luck || 0, maxRarity));
  const r = RARITIES[rarity];
  const base = pickBase(slot, opts);
  const lvl = Math.max(1, opts.level || 1);
  const item = {
    uid: uid++, slot, rarity, icon: base.icon, baseId: base.id, level: lvl,
    dmg: base.dmg ? Math.round((base.dmg + lvl * 1.5) * r.mult) : 0,
    def: base.def ? Math.round((base.def + lvl * 0.7) * r.mult) : 0,
    affixes: [],
  };
  const avail = AFFIXES.filter(a => a.slots.includes(slot));
  const chosen = new Set();
  const bias = affixBiasList(opts);
  const affixQuality = opts.quality ?? RARITY_AFFIX_QUALITY[rarity] ?? 0;
  for (let i = 0; i < r.affixes && chosen.size < avail.length; i++) {
    let a;
    let guard = 0;
    do {
      a = pickAffix(avail.filter(x => !chosen.has(x.id)), chosen, bias);
      guard++;
    } while (chosen.has(a.id) && guard < 12);
    if (chosen.has(a.id)) break;
    chosen.add(a.id);
    const v = rollAffixValue(a, lvl, affixQuality);
    item.affixes.push({ id: a.id, v, text: a.text(v) });
  }
  let name = base.name;
  if (opts.name) name = opts.name;
  else if (rarity === 'magic') name = `${pick(PREFIXES)} ${base.name}`;
  else if (rarity === 'rare') name = `${pick(PREFIXES)} ${base.name} ${pick(SUFFIXES)}`;
  item.name = name;
  item.price = Math.round((10 + lvl * 6) * r.mult * (item.affixes.length + 1));
  return item;
}

/** Curated Rare rewards for puzzle / boss milestones — fixed class affixes, high rolls. */
export function generateMilestoneItem(milestoneId, klass, level) {
  const table = MILESTONE_ITEMS[milestoneId];
  const spec = table?.[klass] || table?.knight;
  if (!spec) {
    return generateItem({ slot: 'weapon', rarity: 'rare', level, klass, classAffix: true, quality: MILESTONE_AFFIX_QUALITY });
  }

  const itemLevel = milestoneId === 'warden_trophy' ? level + 1 : level;
  const r = RARITIES.rare;
  const base = pickBase('weapon', { baseId: spec.baseId, klass, level: itemLevel });
  const item = {
    uid: uid++, slot: 'weapon', rarity: 'rare', icon: base.icon, baseId: base.id, level: itemLevel,
    dmg: base.dmg ? Math.round((base.dmg + itemLevel * 1.5) * r.mult) : 0,
    def: 0,
    affixes: [],
    name: spec.name,
  };
  for (const affixId of spec.affixes) {
    const a = AFFIXES.find(x => x.id === affixId && x.slots.includes('weapon'));
    if (!a) continue;
    const v = rollAffixValue(a, itemLevel, MILESTONE_AFFIX_QUALITY);
    item.affixes.push({ id: a.id, v, text: a.text(v) });
  }
  item.price = Math.round((10 + itemLevel * 6) * r.mult * (item.affixes.length + 1));
  return item;
}

export function rollEnemyLoot(enemyType, klass, level) {
  const profile = ENEMY_LOOT[enemyType];
  if (!profile) return null;
  const drops = [];
  if (Math.random() < profile.potion) drops.push({ kind: 'potion', data: 1 });
  if (Math.random() < profile.item) {
    const slot = pick(profile.slots);
    drops.push({
      kind: 'item',
      data: generateItem({
        slot,
        klass: slot === 'weapon' ? klass : undefined,
        level: level + (profile.levelBonus || 0),
        rarities: profile.rarities,
        affixBias: profile.affixBias,
        classAffix: true,
      }),
    });
  }
  return drops;
}

/**
 * Chest / scripted loot DSL:
 *   gold:N | gold:min-max
 *   potion:N
 *   item:slot:rarity[:+level][:affix1+affix2]
 *   milestone:road_keeper | milestone:warden_trophy
 *   bundle:part1|part2|...
 */
export function resolveLootSpec(spec, player) {
  if (!spec) return [];
  if (spec.startsWith('bundle:')) {
    return spec.slice(7).split('|').flatMap(part => resolveLootSpec(part.trim(), player));
  }
  const lvl = player.level;
  const klass = player.klass;

  if (spec.startsWith('gold:')) {
    const val = spec.slice(5);
    if (val.includes('-')) {
      const [a, b] = val.split('-').map(Number);
      return [{ kind: 'gold', data: ri(a, b) }];
    }
    return [{ kind: 'gold', data: +val }];
  }
  if (spec.startsWith('potion:')) {
    const n = +spec.slice(7);
    return Array.from({ length: n }, () => ({ kind: 'potion', data: 1 }));
  }
  if (spec.startsWith('milestone:')) {
    const id = spec.slice(10);
    return [{ kind: 'item', data: generateMilestoneItem(id, klass, lvl) }];
  }
  if (spec.startsWith('item:')) {
    const parts = spec.slice(5).split(':');
    const slot = parts[0];
    const rarity = parts[1] || 'magic';
    let itemLevel = lvl;
    let affixBias = [];
    for (let i = 2; i < parts.length; i++) {
      if (parts[i].startsWith('+')) itemLevel += +parts[i].slice(1);
      else if (parts[i].includes('+')) affixBias = parts[i].split('+');
      else affixBias = [parts[i]];
    }
    const opts = {
      slot, rarity, level: itemLevel, classAffix: true, affixBias,
      klass: slot === 'weapon' ? klass : undefined,
      quality: affixBias.length ? CURATED_AFFIX_QUALITY : (RARITY_AFFIX_QUALITY[rarity] ?? 0),
    };
    if (rarity === 'common' || rarity === 'magic' || rarity === 'rare') opts.maxRarity = rarity;
    return [{ kind: 'item', data: generateItem(opts) }];
  }
  return [];
}

export function itemStats(item) {
  const s = { dmg: item.dmg || 0, def: item.def || 0, hp: 0, mp: 0, spd: 0, crit: 0, leech: 0, cdr: 0 };
  for (const a of item.affixes) {
    if (a.id === 'dmg') s.dmg += a.v;
    else s[a.id] = (s[a.id] || 0) + a.v;
  }
  return s;
}

/** Returns the passive definition from the base item, or null. */
export function getItemPassive(item) {
  if (!item) return null;
  const pool = BASES[item.slot];
  if (!pool) return null;
  return pool.find(b => b.id === item.baseId)?.passive ?? null;
}

/** Returns a Set of passive IDs currently active from equipped items. */
export function getEquippedPassives(equip) {
  const out = new Set();
  for (const it of Object.values(equip)) {
    const p = getItemPassive(it);
    if (p) out.add(p.id);
  }
  return out;
}

const STAT_LABELS = {
  dmg: 'DMG', def: 'DEF', hp: 'HP', mp: 'MP', spd: 'SPD', crit: 'CRIT', leech: 'LEECH', cdr: 'CDR',
};

/** Stat deltas when swapping `next` in for `equipped` (null if nothing equipped). */
export function itemStatDelta(next, equipped) {
  if (!equipped) return [];
  const a = itemStats(next), b = itemStats(equipped);
  const out = [];
  for (const k of Object.keys(STAT_LABELS)) {
    const d = (a[k] || 0) - (b[k] || 0);
    if (d) out.push({ key: k, label: STAT_LABELS[k], delta: d });
  }
  return out;
}

export function formatStatDelta(deltas) {
  if (!deltas.length) return '';
  return deltas.map(({ label, delta }) => {
    const sign = delta > 0 ? '+' : '';
    const suffix = label === 'SPD' || label === 'CRIT' || label === 'LEECH' || label === 'CDR' ? '%' : '';
    return `${sign}${delta}${suffix} ${label}`;
  }).join(' · ');
}

/** Colored stat deltas for tooltips and shop rows. */
export function formatStatDeltaHtml(deltas) {
  if (!deltas.length) return '';
  return deltas.map(({ label, delta }) => {
    const sign = delta > 0 ? '+' : '';
    const suffix = label === 'SPD' || label === 'CRIT' || label === 'LEECH' || label === 'CDR' ? '%' : '';
    const cls = delta > 0 ? 'stat-up' : 'stat-down';
    return `<span class="${cls}">${sign}${delta}${suffix} ${label}</span>`;
  }).join('<span class="stat-sep"> · </span>');
}

/** Posy's general store — survival, accessories, budget gear. */
export function shopStock(klass, level) {
  return [
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
    {
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'magic', level, klass, classAffix: true }),
      tag: 'Class-favored trinket',
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'armor', rarity: 'magic', level, affixBias: klass === 'knight' ? ['def', 'hp'] : ['spd'] }),
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'common', level, preferTier: 0 }),
      price: Math.round(8 + level * 4),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'armor', rarity: 'common', level, preferTier: 0,
        affixBias: ['hp'],
      }),
      price: Math.round(10 + level * 5),
    },
  ];
}

/** Bram's forge — weapons and sturdy armor; one rare catch-up piece. */
export function smithStock(klass, level) {
  const list = [
    {
      kind: 'item',
      item: generateItem({ slot: 'weapon', rarity: 'magic', level, klass, classAffix: true }),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'weapon', rarity: 'magic', level: level + 1, klass,
        classAffix: true, preferTier: 1,
      }),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'armor', rarity: 'magic', level,
        affixBias: klass === 'knight' ? ['def', 'hp'] : ['spd', 'hp'],
      }),
    },
  ];
  // Rare catch-up: only once player has seen the road (level 2+)
  if (level >= 2) {
    list.push({
      kind: 'item',
      item: generateItem({
        slot: 'weapon', rarity: 'rare', level: level + 1, klass,
        classAffix: true, preferTier: 1,
      }),
      tag: 'Road-tested rare',
    });
  }
  return list;
}

/** Kettle's Ashfall armory — post-Warden gear, a clear tier above Eldermoor. */
export function armoryStock(klass, level) {
  return [
    {
      kind: 'item',
      item: generateItem({ slot: 'weapon', rarity: 'rare', level: level + 1, klass, classAffix: true, preferTier: 1 }),
      tag: 'Ashfall steel',
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'armor', rarity: 'rare', level: level + 1, affixBias: klass === 'knight' ? ['def', 'hp'] : ['spd', 'hp'] }),
      tag: 'Ashfall steel',
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'armor', rarity: 'magic', level, preferTier: 1 }),
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'rare', level, klass, classAffix: true }),
      tag: 'Class-favored trinket',
    },
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
  ];
}
