// ASHEN VALE — entities: player, enemies (incl. boss), NPCs, projectiles, loot, fx.
import * as THREE from 'three';
import { Art, PAL, makeCanvas, canvasTexture, paintArrow, paintOrb } from './art.js';
import { makeBillboard, makeBlobShadow, SPRITE_TILT } from './world.js';
import { CLASSES, classSkillList, xpForLevel } from './skills.js';
import { STATUSES } from './skilltree.js';
import { itemStats, getEquippedPassives } from './items.js';
import { SFX } from './audio.js';
import { launchRagdoll, updateRagdoll, SquashSpring, velocityStretch, ragdollBillPose } from './physics.js';

export { Effects, GlowSystem } from './fx.js';

const RADIUS = 0.28;

/* ---------------- helpers ---------------- */
export function makeLabel(text, scale = 1) {
  const [c, ctx] = makeCanvas(text.length * 7 + 6, 12);
  ctx.fillStyle = 'rgba(72,74,72,0.75)'; ctx.fillRect(0, 0, c.width, 12);
  ctx.fillStyle = PAL[3]; ctx.font = '8px monospace'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 3, 6);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry((c.width / 40) * scale, 0.3 * scale),
    new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false })
  );
  m.rotation.x = SPRITE_TILT;
  return m;
}

function paintNameplate(name, hp, maxHp, downed) {
  const w = Math.max(56, name.length * 7 + 16);
  const h = downed ? 22 : 18;
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = 'rgba(72,74,72,0.78)'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = downed ? PAL[1] : PAL[3]; ctx.font = '8px monospace'; ctx.textBaseline = 'top';
  ctx.fillText(name.slice(0, 12), 4, 2);
  const barY = 12, barW = w - 8, barH = 4;
  ctx.fillStyle = PAL[0]; ctx.fillRect(4, barY, barW, barH);
  const frac = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  ctx.fillStyle = downed ? PAL[1] : PAL[2];
  ctx.fillRect(4, barY, Math.round(barW * frac), barH);
  return c;
}

export class CharSprite {
  constructor(frames, w = 0.9, h = 0.95) {
    this.frames = frames; // {down:[c,c], up, left, right} OR [c,c] flat
    this.group = new THREE.Group();
    const first = Array.isArray(frames) ? frames[0] : frames.down[0];
    this.bill = makeBillboard(first, w, h);
    this.shadow = makeBlobShadow(w * 0.34);
    this.group.add(this.bill, this.shadow);
    this.animT = 0; this.frame = 0;
  }
  setFrame(dir, moving, dt, speed = 7) {
    this.animT += dt * (moving ? speed : 0);
    if (!moving) this.animT = 0;
    this.frame = (this.animT | 0) % 2;
    const set = Array.isArray(this.frames) ? this.frames : (this.frames[dir] || this.frames.down);
    const canvas = set[this.frame];
    if (this.bill.material.map.image !== canvas) {
      this.bill.material.map.dispose();
      this.bill.material.map = canvasTexture(canvas);
      this.bill.material.needsUpdate = true;
    }
  }
}

function tryMove(pos, dx, dz, world) {
  // axis-separated slide with corner sampling
  const check = (x, z) =>
    world.isSolid(x - RADIUS, z - RADIUS) || world.isSolid(x + RADIUS, z - RADIUS) ||
    world.isSolid(x - RADIUS, z + RADIUS) || world.isSolid(x + RADIUS, z + RADIUS);
  if (dx && !check(pos.x + dx, pos.z)) pos.x += dx;
  if (dz && !check(pos.x, pos.z + dz)) pos.z += dz;
}

export function dirToVec(dir) {
  return { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir];
}

/* ================= PLAYER ================= */
export class Player {
  constructor(klass) {
    this.klass = klass;
    const k = CLASSES[klass];
    this.klassName = k.name;
    this.sprite = new CharSprite(Art.chars[klass]);
    this.pos = new THREE.Vector3(22, 0, 20);
    this.dir = 'down';
    this.moving = false;
    this.level = 1; this.xp = 0; this.gold = 15;
    this.skillPoints = 0;
    this.skillLevels = {};
    for (const s of classSkillList(klass)) this.skillLevels[s.id] = 1;
    // skill tree
    this.nodes = {};            // unlocked node ids
    this.resolve = 0;           // knight (War Tempo)
    this.charges = 0;           // mage (Arcane Charges)
    this.cadence = 0;           // ranger (Rhythm)
    this.mobCharges = 0;        // banked mobility charges (Doublecast)
    // timed buffs from tree nodes
    this.reflectT = 0;          // Phalanx — reflect projectiles
    this.unstoppableT = 0;      // can't be stunned/ragdolled
    this.freecastT = 0;         // next spell free (Phase)
    this.unseenT = 0;           // Smoke Roll — next strike empowered
    this.guardFrac = 0;         // Iron Tempest — incoming dmg reduction
    this.guardT = 0;
    this.inventory = [];
    this.equip = { weapon: null, armor: null, trinket: null };
    this.potions = 2;
    this.cooldowns = {};
    this.attackAnim = 0;
    this.iframes = 0;
    this.stunned = 0;
    this.ragdoll = null;
    // passive state
    this.secondWindUsed = false;
    this.rushEmpowered = false;
    this.tumbleEmpowered = false;
    this.lastSkillHitT = 0;
    this.critSurgeT = 0;
    this.squash = new SquashSpring();
    this.prevPos = this.pos.clone();
    this.dashVec = null; this.dashT = 0;
    this.downed = false;
    this.bleedT = 0;
    this.revivesLeft = 2;
    this.recalcStats();
    this.hp = this.stats.maxHp;
    this.mp = this.stats.maxMp;
  }

  recalcStats() {
    const k = CLASSES[this.klass];
    const s = {
      maxHp: k.hp + (this.level - 1) * 9,
      maxMp: k.mp + (this.level - 1) * 4,
      dmg: k.baseDmg + Math.floor((this.level - 1) * 1.2),
      def: 0, spd: 0, crit: 5, leech: 0, cdr: 0,
      dmgReduction: 0, moveDmgReduction: 0, hpRegenMove: 0,
    };
    for (const it of Object.values(this.equip)) {
      if (!it) continue;
      const is = itemStats(it);
      s.dmg += is.dmg; s.def += is.def; s.maxHp += is.hp; s.maxMp += is.mp;
      s.spd += is.spd; s.crit += is.crit; s.leech += is.leech; s.cdr += is.cdr;
    }
    const passives = getEquippedPassives(this.equip);
    if (passives.has('shield_ward'))    s.dmgReduction    += 0.15;
    if (passives.has('wanderer_ward'))  s.moveDmgReduction += 0.08;
    if (passives.has('regen_move'))     s.hpRegenMove     += 0.5;
    this.stats = s;
    this.speed = k.speed * (1 + s.spd / 100);
    this.hp = Math.min(this.hp ?? s.maxHp, s.maxHp);
    this.mp = Math.min(this.mp ?? s.maxMp, s.maxMp);
  }

  update(dt, input, world, game) {
    if (this.downed) {
      this.moving = false;
      this.bleedT -= dt;
      game.ui.updateDownedRing(this.bleedT);
      this.sprite.setFrame(this.dir, false, dt);
      this.sprite.group.position.copy(this.pos);
      return;
    }
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.stunned = Math.max(0, this.stunned - dt);
    this.mp = Math.min(this.stats.maxMp, this.mp + dt * 2.2);
    this.critSurgeT = Math.max(0, this.critSurgeT - dt);
    this.lastSkillHitT = Math.max(0, this.lastSkillHitT - dt);
    // regen_move passive: +0.5 HP/s while moving
    if (this.moving && this.stats.hpRegenMove > 0) {
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.hpRegenMove * dt);
    }
    // tree buff timers
    this.reflectT = Math.max(0, this.reflectT - dt);
    this.unstoppableT = Math.max(0, this.unstoppableT - dt);
    this.freecastT = Math.max(0, this.freecastT - dt);
    this.unseenT = Math.max(0, this.unseenT - dt);
    this.guardT = Math.max(0, this.guardT - dt);
    if (this.guardT <= 0) this.guardFrac = 0;

    if (this.ragdoll) {
      this.moving = false;
      this.dashT = 0;
      updateRagdoll(this, dt, world, game.fx);
    } else if (this.dashT > 0) {
      this.dashT -= dt;
      tryMove(this.pos, this.dashVec.x * dt, this.dashVec.z * dt, world);
      this.moving = true;
    } else if (this.stunned <= 0 && !game.uiLock) {
      let dx = 0, dz = 0;
      if (input.left) dx -= 1; if (input.right) dx += 1;
      if (input.up) dz -= 1; if (input.down) dz += 1;
      this.moving = !!(dx || dz);
      if (this.moving) {
        if (Math.abs(dx) > Math.abs(dz)) this.dir = dx > 0 ? 'right' : 'left';
        else if (dz !== 0) this.dir = dz > 0 ? 'down' : 'up';
        const len = Math.hypot(dx, dz) || 1;
        const v = this.speed * dt;
        tryMove(this.pos, (dx / len) * v, (dz / len) * v, world);
      }
    } else this.moving = false;

    this.sprite.group.position.copy(this.pos);
    this.sprite.setFrame(this.dir, this.moving, dt, 8);
    // ragdoll tumble / attack lunge flourish
    const rag = this.ragdoll;
    if (rag) {
      const pose = ragdollBillPose(rag, rag.bodyH, rag.bodyW);
      this.sprite.bill.position.set(pose.leanX, pose.y, 0);
      this.sprite.bill.rotation.z = pose.ang;
      this.sprite.shadow.scale.setScalar(pose.shadow);
    } else {
      this.sprite.bill.position.set(0, this.attackAnim > 0 ? 0.06 : 0, 0);
      this.sprite.bill.rotation.z = 0;
      this.sprite.shadow.scale.setScalar(1);
    }
    // squash & stretch from actual movement speed (dashes, launches)
    if (dt > 0) {
      let vx = (this.pos.x - this.prevPos.x) / dt, vz = (this.pos.z - this.prevPos.z) / dt;
      if (Math.hypot(vx, vz) > 20) { vx = 0; vz = 0; } // teleport, not motion
      const tgt = velocityStretch(vx, vz, rag ? rag.vy : 0);
      this.squash.update(dt, tgt.tx, tgt.ty);
      this.sprite.bill.scale.set(this.squash.sx, this.squash.sy, 1);
    }
    this.prevPos.copy(this.pos);
    if (this.iframes > 0) this.sprite.bill.material.opacity = (Math.sin(performance.now() / 40) > 0 ? 1 : 0.35);
    else this.sprite.bill.material.opacity = 1;
    this.sprite.bill.material.transparent = true;
  }

  cdScale() { return 1 - Math.min(0.5, this.stats.cdr / 100); }

  // grant a timed buff from a tree node
  addBuff(type, dur = 1, power = 0) {
    if (type === 'reflect') this.reflectT = Math.max(this.reflectT, dur);
    else if (type === 'unstoppable') this.unstoppableT = Math.max(this.unstoppableT, dur);
    else if (type === 'freecast') this.freecastT = Math.max(this.freecastT, dur);
    else if (type === 'unseen') this.unseenT = Math.max(this.unseenT, dur);
    else if (type === 'guard') { this.guardFrac = Math.min(0.6, power); this.guardT = Math.max(this.guardT, dur); }
  }

  // opts.from: attack origin Vector3 — strong attacks ragdoll the player away from it
  // opts.attacker: enemy reference — used by thorn_retaliate
  damage(amount, game, opts = {}) {
    if (this.iframes > 0) return false;
    let mitig = amount * (1 - this.guardFrac);
    // second_wind: first time per fight we'd drop below 30%, restore 10 HP instead
    const passives = getEquippedPassives(this.equip);
    if (!this.secondWindUsed && passives.has('second_wind')) {
      const projected = this.hp - Math.max(1, Math.round(mitig - this.stats.def * 0.6));
      if (projected < this.stats.maxHp * 0.3) {
        this.secondWindUsed = true;
        this.hp = Math.min(this.stats.maxHp, this.hp + 10);
        game.fx.damageText(this.pos, '+10', true, true);
      }
    }
    // passive damage reductions
    let reduction = this.stats.dmgReduction;
    if (this.moving && this.stats.moveDmgReduction) reduction += this.stats.moveDmgReduction;
    mitig *= (1 - reduction);
    const taken = Math.max(1, Math.round(mitig - this.stats.def * 0.6));
    this.hp -= taken;
    this.iframes = 0.7;
    // thorn_retaliate: deal 3 dmg back to attacker
    if (opts.attacker && passives.has('thorn_retaliate')) {
      const died = opts.attacker.hit(3, game, null, false, {});
      if (died) game.killEnemy(opts.attacker);
    }
    SFX.hurt();
    game.fx.particles(this.pos, 6, 2);
    game.fx.damageText(this.pos, taken, true);
    game.shake(0.25);
    if (opts.from && this.hp > 0 && this.unstoppableT <= 0) {
      const dx = this.pos.x - opts.from.x, dz = this.pos.z - opts.from.z;
      launchRagdoll(this, dx || (Math.random() - 0.5), dz || (Math.random() - 0.5), opts.power ?? amount);
      // invulnerable until back on your feet (plus a beat to react)
      this.iframes = Math.max(this.iframes, this.ragdoll.t + 0.4);
      SFX.thud();
      game.shake(0.45);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      if (game.net?.connected) {
        if (this.revivesLeft > 0) game.onPlayerDowned(this);
        else game.finishBleedOut();
      } else game.onPlayerDeath();
    }
    return true;
  }

  reviveFromDowned() {
    this.downed = false;
    this.bleedT = 0;
    this.hp = Math.max(1, Math.round(this.stats.maxHp * 0.3));
    this.iframes = 1.2;
  }

  addXp(amount, game) {
    this.xp += amount;
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.skillPoints++;
      this.recalcStats();
      this.hp = this.stats.maxHp;
      this.mp = this.stats.maxMp;
      SFX.levelup();
      game.toast(`LEVEL ${this.level}! Choose an upgrade [K]`, true);
      game.fx.levelBurst(this.pos);
      if (game.onLevelUp) game.onLevelUp();
    }
  }
}

/* ================= ENEMIES ================= */
export const ENEMY_TYPES = {
  slime: { hp: 22, dmg: 4, speed: 1.25, xp: 9, aggro: 4.5, atkR: 0.8, atkCd: 1.2, size: 0.8, gold: [1, 5], anim: 4 },
  bat:   { hp: 14, dmg: 3, speed: 2.7, xp: 8, aggro: 6, atkR: 0.7, atkCd: 1.0, size: 0.75, gold: [1, 4], fly: true, anim: 10 },
  husk:  { hp: 38, dmg: 7, speed: 1.9, xp: 16, aggro: 5.5, atkR: 0.85, atkCd: 1.3, size: 0.95, gold: [3, 8], anim: 6,
           heavy: { cd: 7, mult: 2.2, range: 1.3, windup: 0.75 } },
  shade: { hp: 28, dmg: 6, speed: 2.3, xp: 14, aggro: 7, atkR: 0.75, atkCd: 1.1, size: 0.85, gold: [2, 7], fly: true, anim: 5 },
  rat:   { hp: 13, dmg: 3, speed: 2.4, xp: 6, aggro: 5, atkR: 0.7, atkCd: 0.9, size: 0.7, gold: [1, 3], anim: 9 },
  warden:{ hp: 380, dmg: 9, speed: 1.6, xp: 130, aggro: 12, atkR: 1.5, atkCd: 1.8, size: 2.3, gold: [40, 70], anim: 3, boss: true },
};

let enemyUid = 1;
export class Enemy {
  constructor(type, x, z, scale = null) {
    this.id = enemyUid++;
    this.type = type;
    const t = ENEMY_TYPES[type];
    this.def = t;
    const hpMult = scale?.hp ?? 1;
    const dmgMult = scale?.dmg ?? 1;
    this.maxHp = Math.round(t.hp * hpMult);
    this.hp = this.maxHp;
    this.dmgMult = dmgMult;
    this.damagers = new Set();
    this.pos = new THREE.Vector3(x + 0.5, 0, z + 0.5);
    this.home = this.pos.clone();
    this.sprite = new CharSprite(Art.enemies[type], t.size, t.size);
    this.state = 'idle';
    this.stunned = 0;
    this.atkTimer = 0;
    this.ragdoll = null;
    this.squash = new SquashSpring();
    this.prevPos = this.pos.clone();
    this.heavyT = 0;       // heavy attack cooldown
    this.heavyCharge = 0;  // heavy attack windup
    this.wanderT = Math.random() * 2;
    this.wanderDir = new THREE.Vector3();
    this.hitFlash = 0;
    this.dead = false;
    this.status = {};       // kind -> { t, stacks }
    this.spdMul = 1;
    // boss
    this.phaseT = 2;
    this.slamCharge = 0;
    this.summoned = { 66: false, 33: false };
  }

  /* host-authoritative AI */
  update(dt, players, world, game) {
    const t = this.def;
    this.stunned = Math.max(0, this.stunned - dt);
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.heavyT = Math.max(0, this.heavyT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    // damage-over-time / chill / freeze from skill-tree statuses
    if (Object.keys(this.status).length && this.tickStatus(dt, game)) {
      game.killEnemy(this);
      return;
    }

    // launched: physics only, no AI until back up
    if (this.ragdoll) {
      this.heavyCharge = 0;
      this.slamCharge = 0;
      updateRagdoll(this, dt, world, game.fx);
      this.render(dt);
      return;
    }

    // nearest player (local + remotes)
    let target = null, best = 1e9;
    for (const p of players) {
      if (p.hp <= 0) continue;
      const d = this.pos.distanceTo(p.pos);
      if (d < best) { best = d; target = p; }
    }

    if (this.stunned <= 0) {
      if (t.boss) this.bossAI(dt, target, best, world, game);
      else if (this.heavyCharge > 0) {
        // winding up the big swing — rooted in place
        this.heavyCharge -= dt;
        if (this.heavyCharge <= 0) {
          this.atkTimer = Math.max(this.atkTimer, 0.6);
          game.enemyHeavyHit(this);
        }
      } else if (target && best < t.aggro) {
        if (t.heavy && best < t.heavy.range && this.heavyT <= 0) {
          this.heavyT = t.heavy.cd;
          this.heavyCharge = t.heavy.windup;
          game.fx.telegraph(this.pos, t.heavy.range + 0.35, t.heavy.windup);
          SFX.push();
        } else {
          if (best > t.atkR * 0.9) {
            const v = target.pos.clone().sub(this.pos).normalize().multiplyScalar(t.speed * this.spdMul * dt);
            tryMove(this.pos, v.x, v.z, world);
          }
          if (best < t.atkR && this.atkTimer <= 0) {
            this.atkTimer = t.atkCd;
            game.enemyAttack(this, target);
          }
        }
      } else {
        // wander near home
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          this.wanderDir.set(Math.cos(a), 0, Math.sin(a));
          if (this.pos.distanceTo(this.home) > 3) this.wanderDir.copy(this.home.clone().sub(this.pos).normalize());
          if (Math.random() < 0.4) this.wanderDir.set(0, 0, 0);
        }
        tryMove(this.pos, this.wanderDir.x * t.speed * 0.4 * this.spdMul * dt, this.wanderDir.z * t.speed * 0.4 * this.spdMul * dt, world);
      }
    }
    this.render(dt);
  }

  bossAI(dt, target, dist, world, game) {
    const t = this.def;
    this.phaseT -= dt;
    if (this.slamCharge > 0) {
      this.slamCharge -= dt;
      if (this.slamCharge <= 0) {
        SFX.slam(); game.shake(0.7);
        game.fx.shockwave(this.pos, 2.6);
        game.bossSlamHit(this, 2.6);
        this.phaseT = 1.2;
      }
      return;
    }
    if (!target) return;
    // summon adds at thresholds
    for (const th of [66, 33]) {
      if (!this.summoned[th] && this.hp < this.maxHp * th / 100) {
        this.summoned[th] = true;
        SFX.bossRoar();
        game.bossSummon(this);
        this.phaseT = 1.5;
        return;
      }
    }
    if (this.phaseT <= 0) {
      if (dist < 2.4) {
        // telegraph slam
        this.slamCharge = 0.8;
        game.fx.telegraph(this.pos, 2.6, 0.8);
        return;
      }
      this.phaseT = 0.4;
    }
    if (dist > t.atkR) {
      const enrage = game.partyEnrageSpeed ? game.partyEnrageSpeed() : 1.6;
      const v = target.pos.clone().sub(this.pos).normalize().multiplyScalar(
        t.speed * dt * (this.hp < this.maxHp * 0.33 ? enrage : 1),
      );
      tryMove(this.pos, v.x, v.z, world);
    } else if (this.atkTimer <= 0) {
      this.atkTimer = t.atkCd;
      game.enemyAttack(this, target);
    }
  }

  render(dt) {
    const t = this.def;
    this.sprite.group.position.copy(this.pos);
    this.sprite.setFrame(null, true, dt, t.anim);
    const rag = this.ragdoll;
    if (rag) {
      const pose = ragdollBillPose(rag, rag.bodyH, rag.bodyW);
      this.sprite.bill.position.set(pose.leanX, pose.y + (t.fly ? 0.1 : 0), 0);
      this.sprite.bill.rotation.z = pose.ang;
      this.sprite.shadow.scale.setScalar(pose.shadow);
    } else {
      this.sprite.bill.rotation.z = 0;
      this.sprite.bill.position.y = t.fly ? 0.25 + Math.sin(performance.now() / 200 + this.id) * 0.1 : 0;
      this.sprite.shadow.scale.setScalar(1);
    }
    if (this.slamCharge > 0 || this.heavyCharge > 0) {
      this.sprite.bill.material.color.setHex(0xffffff);
      this.sprite.group.scale.setScalar(1 + Math.sin(performance.now() / 50) * 0.05);
    } else {
      this.sprite.group.scale.setScalar(1);
    }
    // squash & stretch from actual movement speed
    if (dt > 0) {
      let vx = (this.pos.x - this.prevPos.x) / dt, vz = (this.pos.z - this.prevPos.z) / dt;
      if (Math.hypot(vx, vz) > 20) { vx = 0; vz = 0; } // spawn/teleport jump
      const tgt = velocityStretch(vx, vz, rag ? rag.vy : 0);
      this.squash.update(dt, tgt.tx, tgt.ty);
      this.sprite.bill.scale.set(this.squash.sx, this.squash.sy, 1);
      this.prevPos.copy(this.pos);
    }
    if (this.hitFlash > 0) this.sprite.bill.material.color.set(PAL[3]).multiplyScalar(2.5);
    else {
      const tint = this.statusTint?.();
      if (tint && !(this.slamCharge > 0 || this.heavyCharge > 0)) this.sprite.bill.material.color.set(tint);
      else this.sprite.bill.material.color.set(0xffffff);
    }
  }

  /* ---- statuses ---- */
  addStatus(kind, dur, stacks = 1) {
    if (!STATUSES[kind]) return;
    const cur = this.status[kind];
    if (cur) { cur.t = Math.max(cur.t, dur); cur.stacks = Math.min(8, cur.stacks + stacks); }
    else this.status[kind] = { t: dur, stacks };
  }
  hasStatus(kind) { return !!this.status[kind]; }
  elementalCount() {
    let n = 0;
    for (const k in this.status) if (STATUSES[k]?.elem) n++;
    return n;
  }
  dmgTakenMult() {
    let m = 1;
    for (const k in this.status) m *= (STATUSES[k].dmgTaken || 1);
    return Math.min(2.6, m);
  }
  // ticks DoT + timers; returns true if the status damage killed it
  tickStatus(dt, game) {
    this.spdMul = 1;
    let frozenOrDazed = false, dotTotal = 0;
    for (const k of Object.keys(this.status)) {
      const s = this.status[k];
      s.t -= dt;
      if (s.t <= 0) { delete this.status[k]; continue; }
      const def = STATUSES[k];
      if (def.dot) dotTotal += def.dot * s.stacks * dt;
      if (def.slow) this.spdMul = Math.min(this.spdMul, def.slow);
      if (def.stun) { frozenOrDazed = true; this.spdMul = 0; }
    }
    if (frozenOrDazed) this.stunned = Math.max(this.stunned, 0.12);
    if (dotTotal >= 0.0001 && !this.dead) {
      this.dotAccum = (this.dotAccum || 0) + dotTotal;
      if (this.dotAccum >= 1) {
        const tick = Math.floor(this.dotAccum);
        this.dotAccum -= tick;
        this.hp -= tick;
        game.fx.damageText(this.pos, tick, false, false);
        if (this.hp <= 0 && !this.dead) { this.dead = true; return true; }
      }
    }
    return false;
  }
  statusTint() {
    // brightest-priority tint so the dominant status reads at a glance
    for (const k of ['frozen', 'chill', 'charged', 'shock', 'burn', 'mark', 'sunder', 'daze', 'bleed', 'rune']) {
      if (this.status[k]) return STATUSES[k].tint;
    }
    return null;
  }

  hit(dmg, game, knock, crit = false, opts = {}) {
    this.hp -= dmg;
    this.hitFlash = 0.12;
    SFX.hit();
    game.fx.damageText(this.pos, dmg, false, crit);
    game.fx.particles(this.pos, 5, 1.6);
    if (knock && opts.ragdoll) {
      launchRagdoll(this, knock.x, knock.z, dmg, this.def.boss ? 0.35 : 1, !!opts.light);
      this.heavyCharge = 0;
    } else if (knock && !this.def.boss) {
      tryMove(this.pos, knock.x * 0.3, knock.z * 0.3, game.world);
    }
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      return true; // caller handles death
    }
    return false;
  }
}

/* ================= NPC ================= */
export class Npc {
  constructor(def) {
    this.def = def;
    this.sprite = new CharSprite(Art.chars[def.sprite] || Art.chars.villager);
    this.pos = new THREE.Vector3(def.x + 0.5, 0, def.y + 0.5);
    this.home = this.pos.clone();
    this.dir = def.dir || 'down';
    this.wanderT = Math.random() * 3;
    this.moveDir = null;
    this.talking = false;
  }
  update(dt, world, playerPos) {
    if (this.talking) {
      // face player
      const dx = playerPos.x - this.pos.x, dz = playerPos.z - this.pos.z;
      this.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
      this.sprite.setFrame(this.dir, false, dt);
    } else if (this.def.wander) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 3;
        const dirs = ['up', 'down', 'left', 'right', null, null];
        this.moveDir = dirs[(Math.random() * dirs.length) | 0];
        if (this.moveDir) this.dir = this.moveDir;
        if (this.pos.distanceTo(this.home) > this.def.wander) {
          this.dir = this.moveDir = Math.abs(this.home.x - this.pos.x) > Math.abs(this.home.z - this.pos.z)
            ? (this.home.x > this.pos.x ? 'right' : 'left') : (this.home.z > this.pos.z ? 'down' : 'up');
        }
      }
      if (this.moveDir) {
        const [dx, dz] = dirToVec(this.moveDir);
        tryMove(this.pos, dx * 1.1 * dt, dz * 1.1 * dt, world);
        this.sprite.setFrame(this.dir, true, dt, 5);
      } else this.sprite.setFrame(this.dir, false, dt);
    } else {
      this.sprite.setFrame(this.dir, false, dt);
    }
    this.sprite.group.position.copy(this.pos);
  }
}

/* ================= REMOTE PLAYER ================= */
export class RemotePlayer {
  constructor(id, name, klass) {
    this.id = id;
    this.name = name;
    this.klass = klass;
    this.sprite = new CharSprite(Art.chars[klass] || Art.chars.knight);
    this.nameplate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.45),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
    );
    this.nameplate.rotation.x = SPRITE_TILT;
    this.nameplate.position.y = 1.22;
    this.sprite.group.add(this.nameplate);
    this.pos = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.dir = 'down'; this.moving = false;
    this.hp = 1; this.maxHp = 1;     this.downed = false; this.bleed = 0;
    this.map = null;
    this.attackT = 0;
    this.squash = new SquashSpring();
    this.prevPos = new THREE.Vector3();
    this.init = false;
    this.refreshNameplate();
  }
  refreshNameplate() {
    const c = paintNameplate(this.name, this.hp, this.maxHp, this.downed);
    const tex = canvasTexture(c);
    this.nameplate.material.map?.dispose();
    this.nameplate.material.map = tex;
    this.nameplate.material.needsUpdate = true;
    this.nameplate.scale.set((c.width / 40) / 1.5, (c.height / 40) / 0.45, 1);
  }
  applyState(s) {
    this.target.set(s.x, 0, s.z);
    if (!this.init) { this.pos.copy(this.target); this.init = true; }
    this.dir = s.dir; this.moving = s.moving; this.map = s.map;
    this.hp = s.hp ?? this.hp;
    this.maxHp = s.maxHp ?? this.maxHp;
    const downed = !!s.downed;
    const bleed = s.bleed || 0;
    if (s.attacking) this.attackT = 0.2;
    if (downed !== this.downed || Math.abs(bleed - this.bleed) > 0.4
        || Math.abs(this.hp - (s.hp ?? this.hp)) > 1) {
      this.downed = downed;
      this.bleed = bleed;
      this.refreshNameplate();
    }
  }
  update(dt) {
    this.pos.lerp(this.target, Math.min(1, dt * 12));
    this.sprite.group.position.copy(this.pos);
    if (this.attackT > 0) {
      this.attackT -= dt;
      this.sprite.setFrame(this.dir, false, dt, 12);
    } else {
      this.sprite.setFrame(this.dir, this.moving, dt, 8);
    }
    if (dt > 0) {
      let vx = (this.pos.x - this.prevPos.x) / dt, vz = (this.pos.z - this.prevPos.z) / dt;
      if (Math.hypot(vx, vz) > 20) { vx = 0; vz = 0; }
      const tgt = velocityStretch(vx, vz);
      this.squash.update(dt, tgt.tx, tgt.ty);
      this.sprite.bill.scale.set(this.squash.sx, this.squash.sy, 1);
      this.prevPos.copy(this.pos);
    }
  }
}

/* ================= PROJECTILES ================= */

export class Projectile {
  constructor(owner, pos, vel, dmg, life, opts = {}) {
    this.owner = owner; // 'player' | 'remote'
    this.pos = pos.clone();
    this.vel = vel;
    this.dmg = dmg;
    this.life = life;
    this.pierce = opts.pierce || false;
    this.ragdoll = opts.ragdoll || false;
    this.knock = opts.knock || 0;
    this.kind = opts.kind || 'orb'; // 'arrow' | 'orb'
    this.big = opts.big || this.pierce; // power shot / heavy bolt read bigger
    this.hitSet = new Set();
    this.trailT = 0;
    this.cosmetic = opts.cosmetic || false;
    this.angle = Math.atan2(vel.z, vel.x);

    if (this.kind === 'arrow') {
      const c = paintArrow(this.big);
      const w = this.big ? 0.62 : 0.5;
      this.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w * c.height / c.width),
        new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      // lay flat and orient along travel — reads as an arrow flying that way
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.rotation.z = -this.angle;
      this.y0 = 0.4;
      this.baseGlow = 0; // arrows are physical, no magic glow
    } else {
      const c = paintOrb(this.big);
      const w = this.big ? 0.4 : 0.32;
      this.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w),
        new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false }),
      );
      this.mesh.rotation.x = SPRITE_TILT;
      this.y0 = 0.44;
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 1.5, w * 1.5),
        new THREE.MeshBasicMaterial({ color: PAL[2], transparent: true, opacity: 0.18, depthWrite: false }),
      );
      halo.rotation.x = SPRITE_TILT;
      halo.position.z = -0.01;
      this.mesh.add(halo);
      this.halo = halo;
      this.baseGlow = owner === 'player' ? 1.15 : 0.85;
    }
    this.mesh.position.copy(this.pos).setY(this.y0);

    // Halo mesh only — per-projectile PointLights tank FPS in spell spam.
    this.glowLight = null;
    this.dead = false;
  }
  update(dt, world) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (world.isSolid(this.pos.x, this.pos.z)) { this.dead = true; return; }
    if (this.kind === 'arrow') {
      // skim just above the ground with a faint bob; keep facing travel dir
      this.mesh.position.set(this.pos.x, this.y0 + Math.sin(this.life * 22) * 0.015, this.pos.z);
    } else {
      this.mesh.position.set(this.pos.x, this.y0 + Math.sin(this.life * 18) * 0.025, this.pos.z);
      this.mesh.rotation.z += dt * 5; // gentle orb shimmer-spin
    }
    if (this.halo) {
      this.halo.material.opacity = (0.14 + Math.sin(this.life * 14) * 0.06) * (this.baseGlow > 0 ? 1 : 0.6);
      const hs = 1 + Math.sin(this.life * 11) * 0.05;
      this.halo.scale.set(hs, hs, 1);
    }
    this.trailT += dt;
  }
}

/* ================= LOOT DROPS ================= */
let dropUid = 1;

export class Drop {
  constructor(kind, data, pos, opts = {}) {
    this.id = opts.id ?? dropUid++;
    this.kind = kind; // 'gold' | 'potion' | 'item'
    this.data = data;
    this.ownerId = opts.ownerId ?? 'local';
    this.ghost = !!opts.ghost;
    this.pos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8));
    const icon = kind === 'gold' ? Art.icons.gold : kind === 'potion' ? Art.icons.potion : Art.icons[data.icon];
    this.mesh = makeBillboard(icon, 0.45, 0.45, { glow: kind === 'item' && data.rarity !== 'common' ? 0.22 : 0 });
    if (this.ghost) {
      this.mesh.material.transparent = true;
      this.mesh.material.opacity = 0.42;
    }
    this.mesh.position.copy(this.pos);
    this.age = 0;
    this.dead = false;
    if (kind === 'item' && (data.rarity === 'rare' || data.rarity === 'legendary')) {
      const leg = data.rarity === 'legendary';
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, leg ? 0.12 : 0.09, leg ? 2.2 : 1.8, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: PAL[3], transparent: true, opacity: leg ? 0.22 : 0.16, depthWrite: false }),
      );
      beam.position.y = leg ? 1.1 : 0.95;
      this.mesh.add(beam);
    }
  }
  update(dt, playerPos, pickerId = 'local') {
    this.age += dt;
    this.mesh.position.y = Math.abs(Math.sin(this.age * 3)) * 0.12;
    const canPick = !this.ghost && (this.ownerId === pickerId || this.ownerId === 'local');
    if (canPick && this.age > 0.45) {
      const d = this.pos.distanceTo(playerPos);
      if (d < 1.5) {
        this.pos.lerp(playerPos, Math.min(1, dt * 8));
        this.mesh.position.x = this.pos.x; this.mesh.position.z = this.pos.z;
        if (d < 0.4) return true;
      }
    }
    this.mesh.position.x = this.pos.x; this.mesh.position.z = this.pos.z;
    return false;
  }
}
