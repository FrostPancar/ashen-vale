// ASHEN VALE — co-op helpers (party size, scaling, flag bundles).
export const MAX_PARTY = 4;

export function partySize(net) {
  if (!net?.connected) return 1;
  return 1 + net.peers.size;
}

export function extraPlayers(net) {
  return Math.max(0, Math.min(MAX_PARTY - 1, partySize(net) - 1));
}

/** +60% HP and +15% damage per extra player (spec). */
export function partyScale(net) {
  const extra = extraPlayers(net);
  return { hp: 1 + extra * 0.6, dmg: 1 + extra * 0.15, extra };
}

export function scaledHp(baseHp, net) {
  return Math.round(baseHp * partyScale(net).hp);
}

export function enemyDamage(def, enemy) {
  const mult = enemy?.dmgMult ?? 1;
  return Math.round(def.dmg * mult);
}

export function bossEnrageSpeed(net) {
  return 1.6 + extraPlayers(net) * 0.15;
}

export function bossSummonCount(net) {
  return 2 + extraPlayers(net);
}

/** Puzzle / world flags the host shares with joiners. */
export function collectShareableFlags(flags) {
  const out = { stage: flags.stage || 0 };
  if (flags.month) out.month = flags.month;
  const puzzleKeys = ['route_lever', 'cave_leverA', 'cave_leverB', 'cave_door', 'warden_dead',
    'thorn_leverA', 'thorn_seal', 'thorn_gate'];
  for (const k of puzzleKeys) {
    if (flags[k]) out[k] = flags[k];
  }
  for (const [k, v] of Object.entries(flags)) {
    if (k.startsWith('opened_') || k.startsWith('boulder_')) out[k] = v;
  }
  return out;
}
