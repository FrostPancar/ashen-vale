// ASHEN VALE — Diablo-style item generation: slots, rarities, affixes, curated loot.

/** Demo caps loot at Rare — Legendary exists for future content only. */
export const DEMO_MAX_RARITY = 'rare';

export const LOOT_PHASE = { EARLY: 'early', MID: 'mid', LATE: 'late' };
const PHASE_RANK = { early: 0, mid: 1, late: 2 };

/** Loot phase from level + map — higher of the two wins. */
export function lootPhase(player, mapId = 'town') {
  if (mapId === 'ashfall' || player.level >= 5) return LOOT_PHASE.LATE;
  if (mapId === 'cave' || mapId === 'boss' || player.level >= 3) return LOOT_PHASE.MID;
  return LOOT_PHASE.EARLY;
}

const MID_PASSIVE_IDS = new Set([
  'rush_stagger', 'whirl_reach', 'rush_empower', 'tumble_empower', 'volley_nock', 'volley_empower',
  'spark_fork', 'bolt_haste', 'blink_burst', 'regen_move', 'shield_ward', 'second_wind',
  'dash_mana', 'kill_surge', 'wanderer_ward',
]);

export function baseMinPhase(base) {
  if (base.minPhase) return base.minPhase;
  if (base.passive?.id === 'thorn_retaliate') return LOOT_PHASE.EARLY;
  if (base.passive && MID_PASSIVE_IDS.has(base.passive.id)) return LOOT_PHASE.MID;
  if ((base.tier ?? 0) >= 2 && base.passive) return LOOT_PHASE.MID;
  return LOOT_PHASE.EARLY;
}

export const RARITIES = {
  common:    { name: 'Common',    affixes: 0, mult: 1.0, weight: 48, cls: '' },
  magic:     { name: 'Magic',     affixes: 1, mult: 1.2, weight: 38, cls: 'r-magic' },
  rare:      { name: 'Rare',      affixes: 2, mult: 1.45, weight: 14, cls: 'r-rare' },
  legendary: { name: 'Legendary', affixes: 3, mult: 1.8, weight: 0, cls: 'r-legendary', demo: false },
};

export const BASES = {
  weapon: [
    // ── Tier 0 starters ──────────────────────────────────────────────────────
    { id: 'rustblade',   name: 'Rustblade',        icon: 'rustblade',   dmg: 5, classes: ['knight'], tier: 0, minPhase: 'early' },
    { id: 'roadcleaver', name: 'Road Cleaver',     icon: 'roadcleaver', dmg: 5, classes: ['knight'], tier: 0, minPhase: 'early' },
    { id: 'scoutbow',    name: 'Scout Bow',        icon: 'scoutbow',    dmg: 4, classes: ['ranger'], tier: 0, minPhase: 'early' },
    { id: 'hollowbow',   name: 'Hollow Bow',       icon: 'hollowbow',   dmg: 4, classes: ['ranger'], tier: 0, minPhase: 'early' },
    { id: 'willowstaff', name: 'Willow Staff',     icon: 'willowstaff', dmg: 4, classes: ['mage'],   tier: 0, minPhase: 'early' },
    { id: 'bellstaff',   name: 'Bellwood Staff',   icon: 'bellstaff',   dmg: 4, classes: ['mage'],   tier: 0, minPhase: 'early' },
    // ── Tier 1 ───────────────────────────────────────────────────────────────
    { id: 'sword',       name: 'Sword',            icon: 'sword',       dmg: 6, classes: ['knight'], tier: 1, minPhase: 'early' },
    { id: 'bow',         name: 'Shortbow',         icon: 'bow',         dmg: 5, classes: ['ranger'], tier: 1, minPhase: 'early' },
    { id: 'staff',       name: 'Ashwood Staff',    icon: 'staff',       dmg: 5, classes: ['mage'],   tier: 1, minPhase: 'early' },
    // ── Tier 2 — passive abilities synergize with class skills ────────────────
    // Knight T2
    { id: 'coalbreaker', name: 'Coalbreaker',      icon: 'coalbreaker', dmg: 7, classes: ['knight'], tier: 2, minPhase: 'mid',
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
    { id: 'wrap',       name: 'Cloth Wrap',       icon: 'wrap',       def: 1, tier: 0, minPhase: 'early' },
    { id: 'tunic',      name: 'Tunic',            icon: 'tunic',      def: 2, tier: 0, minPhase: 'early' },
    { id: 'gambeson',   name: 'Padded Gambeson',  icon: 'gambeson',   def: 2, tier: 0, minPhase: 'early',
      origin: 'Cheap quilted padding sold at every road-stop between Eldermoor and Ashfall.', maker: 'Various Vale clothiers.' },
    // ── Tier 1 ───────────────────────────────────────────────────────────────
    { id: 'jerkin',     name: 'Leather Jerkin',   icon: 'jerkin',     def: 3, tier: 1, minPhase: 'early' },
    { id: 'mail',       name: 'Chainmail',        icon: 'mail',       def: 4, tier: 1, minPhase: 'early' },
    { id: 'ashfall_vest', name: 'Ashfall Vest',   icon: 'ashfall_vest', def: 3, tier: 1, minPhase: 'mid',
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
    { id: 'ring',         name: 'Ring',           icon: 'ring', tier: 0, minPhase: 'early' },
    { id: 'charm',        name: 'Charm',          icon: 'charm', tier: 0, minPhase: 'early' },
    { id: 'band',         name: 'Woven Band',     icon: 'band', tier: 0, minPhase: 'early' },
    { id: 'pendant',      name: 'Moss Pendant',   icon: 'pendant', tier: 0, minPhase: 'early' },
    { id: 'ember_shard',  name: 'Ember Shard',    icon: 'ember_shard', minPhase: 'mid',
      passive: { id: 'dash_mana', label: 'Ember Rush', desc: 'Mobility skills restore 5 MP on use.' },
      origin: 'A fragment of the Bell Pit brazier. Glows faintly during bursts of movement.', maker: 'Harvested by Ashfall street-sweepers; sold by Jun.' },
    { id: 'hollow_stone', name: 'Hollow Stone',   icon: 'hollow_stone', minPhase: 'mid',
      passive: { id: 'kill_surge', label: 'Kill Surge', desc: 'Killing an enemy within 1.5s of a skill hit grants +4% crit for 4s.' },
      origin: 'A river stone with a natural hole, hung from Vale gallows as omen charms. The hole focuses killing intent.', maker: 'Found. Origin unknown.' },
    { id: 'thorn_band',   name: 'Thorn Band',     icon: 'thorn_band', tier: 0, minPhase: 'early',
      passive: { id: 'thorn_retaliate', label: 'Thornback', desc: 'When hit, deal 3 damage back to the attacker.' },
      origin: 'Braided from bellwood hedge thorns that calcify on contact with blood.', maker: 'Old Het, who sells them as "insurance".' },
    { id: 'pilgrim_token', name: 'Pilgrim\'s Token', icon: 'pilgrim_token', minPhase: 'mid',
      passive: { id: 'wanderer_ward', label: 'Wanderer\'s Ward', desc: 'Take 8% less damage while moving.' },
      origin: 'Pressed tin badge handed to travelers at the Ashfall east gate. Most never come back for the deposit.', maker: 'Ashfall gate wardens.' },
  ],
};

const AFFIXES = [
  { id: 'dmg',   text: v => `+${v} damage`,            min: 1, max: 4,  slots: ['weapon', 'trinket'], phases: ['early', 'mid', 'late'] },
  { id: 'hp',    text: v => `+${v} max life`,           min: 5, max: 20, slots: ['armor', 'trinket'], phases: ['early', 'mid', 'late'] },
  { id: 'mp',    text: v => `+${v} max mana`,           min: 4, max: 15, slots: ['trinket', 'weapon'], phases: ['early', 'mid', 'late'] },
  { id: 'def',   text: v => `+${v} defense`,            min: 1, max: 3,  slots: ['armor'], phases: ['early', 'mid', 'late'] },
  { id: 'spd',   text: v => `+${v}% move speed`,        min: 4, max: 12, slots: ['armor', 'trinket'], phases: ['early', 'mid', 'late'] },
  { id: 'crit',  text: v => `+${v}% critical chance`,   min: 3, max: 10, slots: ['weapon', 'trinket'], phases: ['early', 'mid', 'late'] },
  { id: 'leech', text: v => `+${v}% life on hit`,       min: 2, max: 6,  slots: ['weapon', 'trinket'], phases: ['early', 'mid', 'late'] },
  { id: 'cdr',   text: v => `-${v}% skill cooldowns`,   min: 4, max: 12, slots: ['trinket', 'weapon'], phases: ['mid', 'late'] },
];

/** Proc affixes — count as one rolled affix; early game includes bleed, thorns, burn-on-crit. */
const PROC_AFFIXES = [
  { id: 'proc_bleed', text: () => 'On hit: Bleed', slots: ['weapon'], phases: ['early', 'mid', 'late'],
    proc: { trigger: 'hit', status: 'bleed', dur: 3, chance: 0.35 } },
  { id: 'proc_burn_crit', text: () => 'On CRIT: Burn', slots: ['weapon'], phases: ['early', 'mid', 'late'],
    proc: { trigger: 'crit', status: 'burn', dur: 3 } },
  { id: 'proc_sunder', text: () => 'On hit: Sunder', slots: ['weapon'], phases: ['mid', 'late'],
    proc: { trigger: 'hit', status: 'sunder', dur: 4, chance: 0.28 } },
  { id: 'proc_chill', text: () => 'On hit: Chill', slots: ['weapon'], phases: ['mid', 'late'],
    proc: { trigger: 'hit', status: 'chill', dur: 2.5, chance: 0.3 } },
  { id: 'proc_thorn', text: v => `Thorns: ${v} dmg when hit`, slots: ['armor', 'trinket'], phases: ['early', 'mid', 'late'],
    proc: { trigger: 'hurt', thorn: true }, min: 2, max: 4 },
];

function affixesForPhase(phase, slot) {
  const rank = PHASE_RANK[phase] ?? 0;
  const stat = AFFIXES.filter(a => a.slots.includes(slot) && a.phases.some(p => PHASE_RANK[p] <= rank));
  const proc = PROC_AFFIXES.filter(a => a.slots.includes(slot) && a.phases.some(p => PHASE_RANK[p] <= rank));
  return { stat, proc };
}

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
  // Thornwood Verge roster — the road to Briarfen
  thornling:{ item: 0.22, potion: 0.12, slots: ['armor', 'trinket'],     rarities: { common: 45, magic: 48, rare: 7 }, affixBias: ['def', 'hp', 'thorns'] },
  crawler:  { item: 0.24, potion: 0.10, slots: ['trinket', 'weapon'],     rarities: { common: 40, magic: 52, rare: 8 }, affixBias: ['spd', 'crit', 'leech'] },
  revenant: { item: 0.40, potion: 0.20, slots: ['weapon', 'armor'],       rarities: { common: 25, magic: 58, rare: 17 }, affixBias: ['dmg', 'hp', 'leech'], levelBonus: 1 },
  warden: { item: 1.0,  potion: 0.35, slots: ['weapon'],                 rarities: { rare: 100 }, affixBias: ['dmg', 'leech', 'crit', 'mp'], levelBonus: 1 },
};

/** Named milestone rewards — still Rare tier, not Legendary. */
const MILESTONE_ITEMS = {
  road_keeper: {
    knight: { name: 'Road-Keeper\'s Cleaver', affixes: ['dmg', 'leech'], baseId: 'roadcleaver' },
    ranger: { name: 'Foxpath Shortbow',       affixes: ['crit', 'spd'],  baseId: 'hollowbow' },
    mage:   { name: 'Hollow Whisper',         affixes: ['mp', 'crit'],   baseId: 'bellstaff' },
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
  const phaseRank = PHASE_RANK[opts.phase || LOOT_PHASE.EARLY];
  pool = pool.filter(b => PHASE_RANK[baseMinPhase(b)] <= phaseRank);
  if (slot === 'weapon' && opts.klass) {
    pool = pool.filter(b => b.classes.includes(opts.klass));
    if (!pool.length) pool = BASES.weapon.filter(b => PHASE_RANK[baseMinPhase(b)] <= phaseRank);
  }
  const lvl = opts.level || 1;
  if (opts.preferTier != null) {
    const tiered = pool.filter(b => (b.tier ?? 0) === opts.preferTier);
    if (tiered.length) pool = tiered;
  } else if (phaseRank === 0 && lvl <= 2) {
    const low = pool.filter(b => (b.tier ?? 0) === 0);
    if (low.length && Math.random() < 0.65) pool = low;
  }
  return pick(pool);
}

function pickAffixEntry(statPool, procPool, chosen, biasIds = []) {
  const entries = [
    ...statPool.filter(a => !chosen.has(a.id)).map(a => ({ kind: 'stat', a, w: biasIds.includes(a.id) ? 5 : 1 })),
    ...procPool.filter(a => !chosen.has(a.id)).map(a => ({ kind: 'proc', a, w: biasIds.includes(a.id) ? 5 : 0.85 })),
  ];
  if (!entries.length) return null;
  let total = 0;
  for (const e of entries) total += e.w;
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.w;
    if (roll <= 0) return e;
  }
  return entries[0];
}

function pushRolledAffix(item, entry, lvl, affixQuality) {
  const { kind, a } = entry;
  if (kind === 'proc') {
    const v = a.min != null ? rollAffixValue(a, lvl, affixQuality) : 0;
    const proc = { ...a.proc };
    if (proc.thorn === true) proc.thorn = v || a.min;
    item.affixes.push({ id: a.id, v, text: a.text(v || a.min || 0), proc });
    return;
  }
  const v = rollAffixValue(a, lvl, affixQuality);
  item.affixes.push({ id: a.id, v, text: a.text(v) });
}

function affixBiasList(opts, phase) {
  const bias = [...(opts.affixBias || [])];
  const allowed = new Set([
    ...affixesForPhase(phase, opts.slot || 'trinket').stat.map(a => a.id),
    ...affixesForPhase(phase, opts.slot || 'trinket').proc.map(a => a.id),
  ]);
  if (opts.klass && opts.classAffix !== false) {
    const table = CLASS_AFFIX_BIAS[opts.klass];
    if (table) {
      const sorted = Object.entries(table).sort((a, b) => b[1] - a[1]);
      for (const [id] of sorted.slice(0, 4)) {
        if (allowed.has(id) && !bias.includes(id)) bias.push(id);
      }
    }
  }
  return bias.filter(id => allowed.has(id));
}

export function generateItem(opts = {}) {
  const slot = opts.slot || pick(['weapon', 'armor', 'trinket']);
  const phase = opts.phase || LOOT_PHASE.EARLY;
  const maxRarity = opts.maxRarity || DEMO_MAX_RARITY;
  const rarity = opts.rarity || (opts.rarities ? rollFromTable(opts.rarities) : rollRarity(opts.luck || 0, maxRarity));
  const r = RARITIES[rarity];
  const base = pickBase(slot, { ...opts, phase, slot });
  const lvl = Math.max(1, opts.level || 1);
  const item = {
    uid: uid++, slot, rarity, icon: base.icon, baseId: base.id, level: lvl,
    dmg: base.dmg ? Math.round((base.dmg + lvl * 1.5) * r.mult) : 0,
    def: base.def ? Math.round((base.def + lvl * 0.7) * r.mult) : 0,
    affixes: [],
  };
  const { stat: statPool, proc: procPool } = affixesForPhase(phase, slot);
  const chosen = new Set();
  const bias = affixBiasList({ ...opts, slot }, phase);
  const affixQuality = opts.quality ?? RARITY_AFFIX_QUALITY[rarity] ?? 0;
  for (let i = 0; i < r.affixes; i++) {
    const entry = pickAffixEntry(statPool, procPool, chosen, bias);
    if (!entry) break;
    chosen.add(entry.a.id);
    pushRolledAffix(item, entry, lvl, affixQuality);
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
  const phase = milestoneId === 'warden_trophy' ? LOOT_PHASE.MID : LOOT_PHASE.EARLY;
  const r = RARITIES.rare;
  const base = pickBase('weapon', { baseId: spec.baseId, klass, level: itemLevel, phase });
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

export function rollEnemyLoot(enemyType, klass, level, mapId = 'town') {
  const profile = ENEMY_LOOT[enemyType];
  if (!profile) return null;
  const phase = lootPhase({ level }, mapId);
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
        phase,
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
export function resolveLootSpec(spec, player, ctx = {}) {
  if (!spec) return [];
  const phase = ctx.phase ?? lootPhase(player, ctx.mapId);
  if (spec.startsWith('bundle:')) {
    return spec.slice(7).split('|').flatMap(part => resolveLootSpec(part.trim(), player, ctx));
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
      slot, rarity, level: itemLevel, classAffix: true, affixBias, phase,
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
    if (a.proc || a.id.startsWith('proc_')) continue;
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

/** Returns aggregated proc effects from affixes on all equipped items. */
export function getEquippedProcs(equip) {
  const procs = [];
  for (const it of Object.values(equip)) {
    if (!it?.affixes) continue;
    for (const a of it.affixes) {
      if (a.proc) procs.push(a.proc);
    }
  }
  return procs;
}

/** Total thorns damage from passives + proc affixes. */
export function getEquippedThornDamage(equip) {
  let dmg = 0;
  if (getEquippedPassives(equip).has('thorn_retaliate')) dmg += 3;
  for (const proc of getEquippedProcs(equip)) {
    if (proc.trigger === 'hurt' && proc.thorn) dmg += proc.thorn;
  }
  return dmg;
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
export function shopStock(klass, level, mapId = 'town') {
  const phase = lootPhase({ level }, mapId);
  const early = phase === LOOT_PHASE.EARLY;
  const list = [
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
  ];
  if (early) {
    list.push({
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'magic', level, baseId: 'thorn_band', affixBias: ['hp'], phase }),
      tag: "Het's Thorn Band",
      price: Math.round(14 + level * 5),
    });
    list.push({
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'magic', level, klass, affixBias: ['crit', 'leech'], phase }),
      tag: 'Road trinket',
    });
  } else {
    list.push({
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'magic', level, klass, classAffix: true, phase }),
      tag: 'Class-favored trinket',
    });
  }
  list.push(
    {
      kind: 'item',
      item: generateItem({
        slot: 'armor', rarity: 'magic', level, phase,
        affixBias: klass === 'knight' ? ['def', 'hp'] : ['spd', 'hp'],
      }),
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'common', level, preferTier: 0, phase }),
      price: Math.round(8 + level * 4),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'armor', rarity: 'common', level, preferTier: 0, phase,
        affixBias: ['hp'],
      }),
      price: Math.round(10 + level * 5),
    },
  );
  return list;
}

/** Bram's forge — weapons and sturdy armor; one rare catch-up piece. */
export function smithStock(klass, level, mapId = 'town') {
  const phase = lootPhase({ level }, mapId);
  const early = phase === LOOT_PHASE.EARLY;
  const list = [
    {
      kind: 'item',
      item: generateItem({
        slot: 'weapon', rarity: 'magic', level, klass, phase,
        affixBias: ['dmg', 'crit', 'leech'],
        preferTier: early ? 0 : undefined,
      }),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'weapon', rarity: 'magic', level: level + (early ? 0 : 1), klass, phase,
        affixBias: early ? ['dmg', 'crit'] : ['dmg', 'leech'],
        preferTier: early ? 0 : 1,
      }),
    },
    {
      kind: 'item',
      item: generateItem({
        slot: 'armor', rarity: 'magic', level, phase,
        affixBias: klass === 'knight' ? ['def', 'hp', 'proc_thorn'] : ['spd', 'hp'],
      }),
    },
  ];
  if (level >= 2 && !early) {
    list.push({
      kind: 'item',
      item: generateItem({
        slot: 'weapon', rarity: 'rare', level: level + 1, klass,
        classAffix: true, preferTier: 1, phase,
      }),
      tag: 'Road-tested rare',
    });
  }
  return list;
}

/** Kettle's Ashfall armory — post-Warden gear, a clear tier above Eldermoor. */
export function armoryStock(klass, level, mapId = 'ashfall') {
  const phase = lootPhase({ level }, mapId);
  return [
    {
      kind: 'item',
      item: generateItem({ slot: 'weapon', rarity: 'rare', level: level + 1, klass, classAffix: true, preferTier: 2, phase }),
      tag: 'Ashfall steel',
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'armor', rarity: 'rare', level: level + 1, phase, affixBias: klass === 'knight' ? ['def', 'hp'] : ['spd', 'hp'] }),
      tag: 'Ashfall steel',
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'armor', rarity: 'magic', level, preferTier: 1, phase }),
    },
    {
      kind: 'item',
      item: generateItem({ slot: 'trinket', rarity: 'rare', level, klass, classAffix: true, phase }),
      tag: 'Class-favored trinket',
    },
    { kind: 'potion', name: 'Vale Tonic', icon: 'potion', desc: 'Restores 40 life.', price: 12 },
  ];
}
