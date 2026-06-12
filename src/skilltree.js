// ASHEN VALE — skill tree: branching upgrades that add secondary & synergistic
// effects on top of the base skills. Each lane augments one ability:
//   base (tier 0, free) -> empower (1) -> path A / path B (2, pick one) -> synergy (3).
//
// A node's `fx` is a declarative bag of effect verbs the engine interprets
// (see buildCast + main.applyHit). Statuses are the connective tissue between
// lanes — one lane produces a status, another spends it.

/* ---------------- status effects (applied to enemies) ---------------- */
// dot: damage/sec · slow: move multiplier · dmgTaken: incoming-damage multiplier
// stun: frozen/dazed can't act · elem: counts toward Confluence detonation
export const STATUSES = {
  bleed:   { dot: 4,  dmgTaken: 1,    tint: 0xd98a8a, elem: false },
  sunder:  { dot: 0,  dmgTaken: 1.3,  tint: 0xc9a06a, elem: false },
  mark:    { dot: 0,  dmgTaken: 1.25, tint: 0xe2e4df, elem: false },
  daze:    { dot: 0,  dmgTaken: 1.4,  stun: true,     tint: 0xbfb6e0 },
  chill:   { dot: 0,  dmgTaken: 1,    slow: 0.5,      tint: 0xbcd6e8, elem: true },
  frozen:  { dot: 0,  dmgTaken: 1.5,  stun: true,     slow: 0,        tint: 0xdef0ff, elem: true },
  charged: { dot: 0,  dmgTaken: 1,    tint: 0xe8e07a, elem: true,  chain: true },
  shock:   { dot: 0,  dmgTaken: 1.15, tint: 0xeae08a, elem: true },
  burn:    { dot: 6,  dmgTaken: 1,    tint: 0xe8a86a, elem: true },
  rune:    { dot: 0,  dmgTaken: 1,    tint: 0xc0a0e0, elem: false },
};

const NODE = (n) => n; // identity helper for readable data

/* lane(skill, name, icon, key, [empower, pathA, pathB, synergy]) */
function lane(skill, name, icon, kind, key, base, mids) {
  const nodes = [
    { id: `${skill}_base`, tier: 0, slot: 'C', name: base.name, icon, desc: base.desc, requires: null, fx: {} },
  ];
  const [emp, pA, pB, syn] = mids;
  nodes.push({ id: `${skill}_emp`, tier: 1, slot: 'C', requires: `${skill}_base`, icon: emp.icon || 'up_empower', ...emp });
  nodes.push({ id: `${skill}_a`, tier: 2, slot: 'A', requires: `${skill}_emp`, exclusive: `${skill}_b`, icon: pA.icon || 'up_path', ...pA });
  nodes.push({ id: `${skill}_b`, tier: 2, slot: 'B', requires: `${skill}_emp`, exclusive: `${skill}_a`, icon: pB.icon || 'up_path', ...pB });
  nodes.push({ id: `${skill}_syn`, tier: 3, slot: 'C', requires: `${skill}_emp`, icon: syn.icon || 'up_synergy', ...syn });
  return { skill, name, icon, kind, key, nodes };
}

export const TREES = {
  knight: [
    lane('slash', 'Slash', 'sword', 'Basic', 'LMB',
      { name: 'Slash', desc: 'Quick melee swing — the swing every upgrade reshapes.' },
      [
        { name: 'War Tempo', desc: 'Each Slash that lands restores 2 MP and builds 1 Resolve.',
          fx: { resource: { kind: 'resolve', max: 5, perHit: 1, mp: 2 } } },
        { name: 'Resolve', desc: 'Taking hits also builds Resolve. At max, your next Slash erupts into a free Cleave.',
          fx: { resolvePayoff: 'cleave', resolveOnHurt: 1 } },
        { name: 'Bladedancer', desc: 'Casting a skill spends all Resolve, refunding 0.4s cooldown on your other skills per point.',
          fx: { resolveSpend: 'cdr' } },
        { name: 'Vanguard', desc: 'At max Resolve you briefly cannot be staggered, and your next Cleave automatically Sunders.',
          fx: { resolvePayoff: 'vanguard', buffAtMax: { type: 'unstoppable', dur: 1.5 } } },
      ]),
    lane('cleave', 'Cleave', 'cleave', 'Skill 1', 'RMB',
      { name: 'Cleave', desc: 'Wide committed arc — a wound-opener.' },
      [
        { name: 'Rending Edge', desc: 'Cleaved foes Bleed; re-hitting refreshes and stacks it.',
          fx: { apply: [{ status: 'bleed', dur: 3 }] } },
        { name: 'Momentum', desc: 'Each enemy a Cleave touches shaves 0.4s off its cooldown.',
          fx: { cdrPerHit: 0.4 } },
        { name: 'Sunder', desc: 'Cleaved foes lose armor — Sundered enemies take 30% more damage.',
          fx: { apply: [{ status: 'sunder', dur: 5 }] } },
        { name: "Executioner's Arc", desc: 'Cleave deals double damage to Bleeding or Sundered foes under 35% HP, and refunds its MP on a kill.',
          fx: { exec: { kinds: ['bleed', 'sunder'], hpBelow: 0.35, mult: 2 }, refundOnKill: true } },
      ]),
    lane('whirl', 'Whirlwind', 'whirl', 'Skill 2', 'SPACE',
      { name: 'Whirlwind', desc: 'Spin, hitting all around and launching foes.' },
      [
        { name: 'Cyclone', desc: 'The spin vacuums nearby enemies inward before it hits.',
          fx: { buff: { type: 'vacuum', power: 2.6 } } },
        { name: 'Bladestorm', desc: 'Leaves a lingering ring of cutting wind that keeps shredding foes.',
          fx: { hazard: { kind: 'wind', dur: 3, radius: 1.9, dmgMult: 0.4, period: 0.5 } } },
        { name: 'Iron Tempest', desc: 'For each foe the spin hits, gain a stack of damage reduction for 4s.',
          fx: { guardPerHit: { dur: 4, perHit: 0.08, max: 0.4 } } },
        { name: 'Bloodspin', desc: 'Whirlwind consumes Bleed on every foe it hits, healing you 6 per stack.',
          fx: { heal: { kinds: ['bleed'], amount: 6 } } },
      ]),
    lane('rush', 'Shield Rush', 'bash', 'Mobility', 'SHIFT',
      { name: 'Shield Rush', desc: 'Charge forward, bashing and stunning your path.' },
      [
        { name: 'Phalanx', desc: 'After the charge, raise a shield that reflects projectiles for 1.5s.',
          fx: { buff: { type: 'reflect', dur: 1.5 } } },
        { name: 'Concussive', desc: 'Stunned foes are Dazed — rooted and taking 40% more damage.',
          fx: { apply: [{ status: 'daze', dur: 2 }] } },
        { name: 'Unstoppable', desc: 'Rush cleanses crowd control and grants immunity through the charge.',
          fx: { buff: { type: 'unstoppable', dur: 0.6 }, cleanse: true } },
        { name: 'Aftershock', desc: 'Rush ends in a shockwave; crash into a Sundered foe and it knocks down the whole pack.',
          fx: { shockwave: { radius: 1.8, vsStatus: 'sunder' } } },
      ]),
  ],
  ranger: [
    lane('arrow', 'Quick Shot', 'bow', 'Basic', 'LMB',
      { name: 'Quick Shot', desc: 'Fast aimed arrow — filler between cooldowns.' },
      [
        { name: 'Rhythm', desc: 'Keep firing — every 3rd Quick Shot deals double damage.',
          fx: { resource: { kind: 'cadence', max: 3, perHit: 1, payoffMult: 2 } } },
        { name: 'Predator', desc: 'Quick Shots into a Marked foe splash to a nearby enemy and refund 3 MP.',
          fx: { chain: { vsStatus: 'mark', mult: 0.5, radius: 2.2, mp: 3 } } },
        { name: 'Bodkin', desc: 'Critical Quick Shots open a short Bleed.',
          fx: { applyOnCrit: [{ status: 'bleed', dur: 2.5 }] } },
        { name: 'Open Season', desc: 'Killing a Marked foe spreads the Mark to nearby enemies.',
          fx: { markSpread: 2.6 } },
      ]),
    lane('pshot', 'Power Shot', 'pshot', 'Skill 1', 'RMB',
      { name: 'Power Shot', desc: 'Heavy bolt that pierces a line of enemies.' },
      [
        { name: "Hunter's Mark", desc: 'The first foe pierced is Marked — takes 25% more damage from everything.',
          fx: { apply: [{ status: 'mark', dur: 6 }], firstOnly: true } },
        { name: 'Pinning Shot', desc: 'Pierced foes are Chilled and pinned in place.',
          fx: { apply: [{ status: 'chill', dur: 2.5 }] } },
        { name: 'Overdraw', desc: 'Power Shot detonates on impact in a small blast.',
          fx: { hazard: { kind: 'blast', dur: 0.1, radius: 1.4, dmgMult: 0.8, period: 0.1, atHit: true } } },
        { name: 'Skewer', desc: 'A Power Shot through a Marked foe instantly resets Multishot.',
          fx: { resetSkill: 'mshot', vsStatus: 'mark' } },
      ]),
    lane('mshot', 'Multishot', 'mshot', 'Skill 2', 'SPACE',
      { name: 'Multishot', desc: 'Spreading fan of arrows that knocks foes back.' },
      [
        { name: 'Splinter', desc: 'Fires 2 extra arrows in the fan.',
          fx: { proj: 2 } },
        { name: 'Suppressing Volley', desc: 'Leaves an arrow-pelted field that slows enemies who cross it.',
          fx: { hazard: { kind: 'field', dur: 4, radius: 2.0, dmgMult: 0.2, period: 0.6, slow: 0.5 } } },
        { name: 'Focused Fan', desc: 'Tightens the spread so the whole fan can land on one target.',
          fx: { proj: 2, narrow: 0.4 } },
        { name: 'Volley Trap', desc: 'Multishot also drops a trap that snares the first foe to cross it.',
          fx: { hazard: { kind: 'trap', dur: 6, radius: 1.1, dmgMult: 0.3, period: 0.2, root: true, atSelf: true } } },
      ]),
    lane('tumble', 'Tumble', 'tumble', 'Mobility', 'SHIFT',
      { name: 'Tumble', desc: 'Combat roll with a flicker of invulnerability.' },
      [
        { name: 'Smoke Roll', desc: 'Leave a smoke cloud and become Unseen — your next attack is empowered.',
          fx: { buff: { type: 'unseen', dur: 4 }, hazard: { kind: 'smoke', dur: 3, radius: 1.6, dmgMult: 0, period: 1, atSelf: true } } },
        { name: 'Trapper', desc: 'End the roll by dropping a snare that roots the first enemy in.',
          fx: { hazard: { kind: 'trap', dur: 6, radius: 1.1, dmgMult: 0.3, period: 0.2, root: true, atSelf: true } } },
        { name: 'Acrobat', desc: 'A kill during the invuln window instantly refreshes Tumble.',
          fx: { refreshOnKillDuringIframes: true } },
        { name: 'Ambush', desc: 'Your first hit from Unseen is a guaranteed crit and applies Mark.',
          fx: { unseenStrike: { crit: true, apply: [{ status: 'mark', dur: 6 }] } } },
      ]),
  ],
  mage: [
    lane('spark', 'Spark', 'staff', 'Basic', 'LMB',
      { name: 'Spark', desc: 'Small fast bolt — at-will damage between spells.' },
      [
        { name: 'Arcane Charges', desc: 'Each Spark banks a charge; at 3, your next skill is free and empowered.',
          fx: { resource: { kind: 'charge', max: 3, perHit: 1, payoff: 'empower' } } },
        { name: 'Resonance', desc: 'Spark applies Charged to foes already Chilled, and Chill to those already Charged.',
          fx: { resonance: true } },
        { name: 'Kindle', desc: 'Spark leaves a light Burn.',
          fx: { apply: [{ status: 'burn', dur: 3 }] } },
        { name: 'Elemental Confluence', desc: 'Any foe carrying 2+ elemental statuses detonates for an arcane blast.',
          fx: { detonate: true } },
      ]),
    lane('bolt', 'Spark Bolt', 'bolt', 'Skill 1', 'RMB',
      { name: 'Spark Bolt', desc: 'Heavy single-target bolt.' },
      [
        { name: 'Overcharge', desc: 'Hit foes become Charged; lightning arcs from them to neighbors.',
          fx: { apply: [{ status: 'charged', dur: 4 }], chain: { vsStatus: 'charged', mult: 0.5, radius: 2.4 } } },
        { name: 'Conduit', desc: 'Leaves a hovering orb that zaps nearby enemies for a few seconds.',
          fx: { hazard: { kind: 'orb', dur: 4, radius: 2.2, dmgMult: 0.35, period: 0.5, atHit: true } } },
        { name: 'Static Field', desc: 'Bolt Chills and applies Shock — the next hit on a Shocked foe stuns.',
          fx: { apply: [{ status: 'chill', dur: 3 }, { status: 'shock', dur: 4 }] } },
        { name: 'Thunderhead', desc: 'Charged foes hit by Bolt erupt into a roaming lightning storm.',
          fx: { hazard: { kind: 'storm', dur: 3, radius: 2.6, dmgMult: 0.5, period: 0.4, atHit: true, vsStatus: 'charged' } } },
      ]),
    lane('nova', 'Nova', 'nova', 'Skill 2', 'SPACE',
      { name: 'Nova', desc: 'Ring of force that blasts foes away.' },
      [
        { name: 'Frost Nova', desc: 'Nova Chills and can Freeze; frozen foes take 50% more damage and shatter.',
          fx: { apply: [{ status: 'chill', dur: 3 }, { status: 'frozen', dur: 1.5 }] } },
        { name: 'Echo Nova', desc: 'A second, smaller ring pulses 0.7s later.',
          fx: { pulse: { delay: 0.7, frac: 0.6 } } },
        { name: 'Singularity', desc: 'Drag enemies inward into a gravity well before the ring bursts.',
          fx: { buff: { type: 'vacuum', power: 3 } } },
        { name: 'Flash Freeze', desc: 'Charged foes caught by Nova freeze solid and stay Shocked.',
          fx: { apply: [{ status: 'frozen', dur: 2 }], vsStatus: 'charged' } },
      ]),
    lane('blink', 'Blink', 'blink', 'Mobility', 'SHIFT',
      { name: 'Blink', desc: 'Short instant teleport.' },
      [
        { name: 'Arcane Wake', desc: 'The point you leave from collapses into a small implosion.',
          fx: { hazard: { kind: 'implode', dur: 0.3, radius: 1.8, dmgMult: 0.7, period: 0.3, atOrigin: true } } },
        { name: 'Phase', desc: 'Brief invulnerability through the blink; your next spell costs no mana.',
          fx: { buff: { type: 'freecast', dur: 4 }, iframes: 0.6 } },
        { name: 'Doublecast', desc: 'Blink stores up to 2 charges for chained teleports.',
          fx: { charges: 2 } },
        { name: 'Displacement', desc: 'Blinking through foes Runes them; your next Nova detonates every Rune.',
          fx: { runePass: true } },
      ]),
  ],
};

/* ---------------- lookups ---------------- */
const INDEX = {}; // klass -> { id -> {node, lane} }
for (const [klass, lanes] of Object.entries(TREES)) {
  INDEX[klass] = {};
  for (const ln of lanes) for (const nd of ln.nodes) INDEX[klass][nd.id] = { node: nd, lane: ln };
}

export function treeLanes(klass) { return TREES[klass] || []; }
export function treeNode(klass, id) { return INDEX[klass]?.[id]?.node || null; }
export function treeLaneOf(klass, id) { return INDEX[klass]?.[id]?.lane || null; }

export function nodeOwned(player, id) {
  const node = treeNode(player.klass, id);
  if (node && node.tier === 0) return true;       // base skills always owned
  return !!player.nodes?.[id];
}

// 'owned' | 'available' | 'blocked' (sibling path taken) | 'locked' (prereq missing)
export function nodeState(player, node) {
  if (nodeOwned(player, node.id)) return 'owned';
  if (node.exclusive && nodeOwned(player, node.exclusive)) return 'blocked';
  if (node.requires && !nodeOwned(player, node.requires)) return 'locked';
  return 'available';
}

export function availableNodes(player) {
  const out = [];
  for (const ln of treeLanes(player.klass)) {
    for (const nd of ln.nodes) {
      if (nodeState(player, nd) === 'available') out.push({ node: nd, lane: ln });
    }
  }
  return out;
}

// Curated 2–3 choices to surface on level-up: prefer one per distinct lane,
// lowest tier first, so the player always sees forward progress.
export function levelUpChoices(player, n = 3) {
  const avail = availableNodes(player).sort((a, b) => a.node.tier - b.node.tier);
  const pick = [];
  const seenLane = new Set();
  for (const a of avail) {
    if (seenLane.has(a.lane.skill)) continue;
    seenLane.add(a.lane.skill);
    pick.push(a);
    if (pick.length >= n) break;
  }
  for (const a of avail) { // backfill if fewer than n lanes had options
    if (pick.length >= n) break;
    if (!pick.includes(a)) pick.push(a);
  }
  return pick;
}

export function unlockNode(player, id) {
  const st = nodeState(player, treeNode(player.klass, id));
  if (st !== 'available') return false;
  player.nodes = player.nodes || {};
  player.nodes[id] = true;
  return true;
}

/* ---------------- per-cast effect aggregation ---------------- */
// Merge the fx of every owned node that augments `skillId` into one ctx the
// combat code reads when the skill is executed.
export function buildCast(player, skillId) {
  const ctx = {
    skillId, apply: [], applyOnCrit: [], proj: 0, narrow: 0, cdrPerHit: 0,
    exec: null, heal: null, buff: null, guardPerHit: null, hazard: null,
    pulse: null, detonate: false, chain: null, shockwave: null, refundOnKill: false,
    resetSkill: null, resonance: false, runePass: false, firstOnly: false,
    vsStatus: null, unseenStrike: null, iframes: 0, cleanse: false,
  };
  for (const ln of treeLanes(player.klass)) {
    if (ln.skill !== skillId) continue;
    for (const nd of ln.nodes) {
      if (!nodeOwned(player, nd.id)) continue;
      const fx = nd.fx || {};
      if (fx.apply) ctx.apply.push(...fx.apply);
      if (fx.applyOnCrit) ctx.applyOnCrit.push(...fx.applyOnCrit);
      if (fx.proj) ctx.proj += fx.proj;
      if (fx.narrow) ctx.narrow = fx.narrow;
      if (fx.cdrPerHit) ctx.cdrPerHit += fx.cdrPerHit;
      if (fx.exec) ctx.exec = fx.exec;
      if (fx.heal) ctx.heal = fx.heal;
      if (fx.buff) ctx.buff = fx.buff;
      if (fx.guardPerHit) ctx.guardPerHit = fx.guardPerHit;
      if (fx.hazard) ctx.hazard = fx.hazard;
      if (fx.pulse) ctx.pulse = fx.pulse;
      if (fx.detonate) ctx.detonate = true;
      if (fx.chain) ctx.chain = fx.chain;
      if (fx.shockwave) ctx.shockwave = fx.shockwave;
      if (fx.refundOnKill) ctx.refundOnKill = true;
      if (fx.resetSkill) { ctx.resetSkill = fx.resetSkill; ctx.vsStatus = fx.vsStatus; }
      if (fx.resonance) ctx.resonance = true;
      if (fx.runePass) ctx.runePass = true;
      if (fx.firstOnly) ctx.firstOnly = true;
      if (fx.vsStatus) ctx.vsStatus = fx.vsStatus;
      if (fx.unseenStrike) ctx.unseenStrike = fx.unseenStrike;
    }
  }
  return ctx;
}

// Does the player own a node with this fx key anywhere in a lane? (basic-lane resources etc.)
export function ownsFx(player, skillId, key) {
  for (const ln of treeLanes(player.klass)) {
    if (ln.skill !== skillId) continue;
    for (const nd of ln.nodes) {
      if (nodeOwned(player, nd.id) && nd.fx && nd.fx[key] !== undefined) return nd.fx[key];
    }
  }
  return undefined;
}

// Any owned node (any lane) carrying this fx key — returns its value or undefined.
export function playerFx(player, key) {
  for (const ln of treeLanes(player.klass)) {
    for (const nd of ln.nodes) {
      if (nodeOwned(player, nd.id) && nd.fx && nd.fx[key] !== undefined) return nd.fx[key];
    }
  }
  return undefined;
}

// Convenience booleans/limits cached on the player so hot paths (damage, hit) avoid scans.
export function applyTreeStats(player) {
  player.maxResolve = nodeOwned(player, 'slash_emp') ? 5 : 0;
  player.maxCadence = nodeOwned(player, 'arrow_emp') ? 3 : 0;
  player.maxCharges = nodeOwned(player, 'spark_emp') ? 3 : 0;
  player.maxMobCharges = nodeOwned(player, 'blink_b') ? 2 : 0;
  player._resolveOnHurt = nodeOwned(player, 'slash_a');
  player._resolveFreeCleave = nodeOwned(player, 'slash_a');
  player._resolveVanguard = nodeOwned(player, 'slash_syn');
  player._bladedancer = nodeOwned(player, 'slash_b');
  player.hasAmbush = nodeOwned(player, 'tumble_syn');
  player.maxResolve && (player.resolve = Math.min(player.resolve, player.maxResolve));
}
