// ASHEN VALE — classes & skills (Diablo-style hotbar + skill points).
// Bindings: LMB basic · RMB skill 1 · SPACE skill 2 · SHIFT mobility · Q tonic.
// knock: per-hit chance (0–1) to ragdoll-launch a foe. ragdoll: true = guaranteed.

export const CLASSES = {
  knight: {
    name: 'Knight', hp: 70, mp: 25, speed: 4.2, baseDmg: 4,
    basic: { id: 'slash', name: 'Slash', icon: 'sword', cd: 0.38, range: 1.15, arc: 2.0, type: 'melee', mult: 1.0, knock: 0.12 },
    skills: [
      { id: 'cleave', name: 'Cleave', icon: 'cleave', cd: 3.2, mp: 6, type: 'melee', range: 1.5, arc: 2.8, mult: 2.1, knock: 0.18,
        desc: lv => `Wide heavy swing. ${Math.round(210 + (lv - 1) * 40)}% damage in an arc.` },
      { id: 'whirl', name: 'Whirlwind', icon: 'whirl', cd: 7.0, mp: 14, type: 'spin', range: 1.7, mult: 1.5, ragdoll: true,
        desc: lv => `Spin, hitting all around for ${Math.round(150 + (lv - 1) * 35)}% damage and launching foes off their feet.` },
    ],
    mobility: { id: 'rush', name: 'Shield Rush', icon: 'bash', cd: 5.0, mp: 8, type: 'dash', dist: 3.0, mult: 1.2, stun: 1.2, knock: 0.35,
      desc: lv => `Charge ${(3.0 + (lv - 1) * 0.4).toFixed(1)} tiles, bashing and stunning everything in your path.` },
  },
  ranger: {
    name: 'Ranger', hp: 52, mp: 35, speed: 4.7, baseDmg: 4,
    basic: { id: 'arrow', name: 'Quick Shot', icon: 'bow', cd: 0.42, type: 'proj', projKind: 'arrow', speed: 11, life: 0.9, mult: 1.0, knock: 0.10 },
    skills: [
      { id: 'pshot', name: 'Power Shot', icon: 'pshot', cd: 3.0, mp: 7, type: 'proj', projKind: 'arrow', speed: 15, life: 1.2, mult: 2.4, pierce: true, knock: 0.22,
        desc: lv => `Piercing bolt, ${Math.round(240 + (lv - 1) * 45)}% damage through enemies.` },
      { id: 'mshot', name: 'Multishot', icon: 'mshot', cd: 5.0, mp: 11, type: 'fan', projKind: 'arrow', count: 5, speed: 10, life: 0.8, mult: 1.0, ragdoll: true,
        desc: lv => `${5 + (lv - 1)} arrows in a fan; the volley knocks enemies flying.` },
    ],
    mobility: { id: 'tumble', name: 'Tumble', icon: 'tumble', cd: 4.2, mp: 6, type: 'dash', dist: 3.2,
      desc: lv => `Roll ${(3.2 + (lv - 1) * 0.4).toFixed(1)} tiles; brief invulnerability.` },
  },
  mage: {
    name: 'Mage', hp: 45, mp: 60, speed: 4.35, baseDmg: 5,
    basic: { id: 'spark', name: 'Spark', icon: 'staff', cd: 0.45, type: 'proj', projKind: 'orb', speed: 9, life: 1.0, mult: 1.1, knock: 0.10 },
    skills: [
      { id: 'bolt', name: 'Spark Bolt', icon: 'bolt', cd: 2.6, mp: 9, type: 'proj', projKind: 'orb', big: true, speed: 13, life: 1.3, mult: 2.2, knock: 0.20,
        desc: lv => `Heavy bolt, ${Math.round(220 + (lv - 1) * 45)}% damage.` },
      { id: 'nova', name: 'Nova', icon: 'nova', cd: 6.5, mp: 18, type: 'nova', range: 2.6, mult: 1.7, ragdoll: true,
        desc: lv => `Ring of force, ${Math.round(170 + (lv - 1) * 40)}% damage; blasts everything around you away.` },
    ],
    mobility: { id: 'blink', name: 'Blink', icon: 'blink', cd: 5.0, mp: 10, type: 'blink', dist: 3.6,
      desc: lv => `Teleport ${(3.6 + (lv - 1) * 0.5).toFixed(1)} tiles forward.` },
  },
};

export function classSkillList(klass) {
  const k = CLASSES[klass];
  return [...k.skills, k.mobility];
}

export function skillDamage(player, skill, lv) {
  const base = player.stats.dmg;
  const mult = (skill.mult || 1) + (lv - 1) * ((skill.mult || 1) > 1.4 ? 0.4 : 0.2);
  return Math.max(1, Math.round(base * mult));
}

export function xpForLevel(lv) {
  return Math.round(24 * Math.pow(lv, 1.65));
}

export const SKILL_MAX = 5;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export function skillRankLabel(lv) {
  const n = Math.max(1, Math.min(SKILL_MAX, lv));
  return `${ROMAN[n - 1]}/${ROMAN[SKILL_MAX - 1]}`;
}

export function skillNextDesc(skill, lv) {
  if (lv >= SKILL_MAX) return null;
  return skill.desc(lv + 1);
}
