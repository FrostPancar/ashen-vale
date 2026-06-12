// ASHEN VALE — lightweight "ragdoll" physics.
import * as THREE from 'three';
import { Art } from './art.js';
import { makeBillboard, makeBlobShadow } from './world.js';
import { SFX } from './audio.js';

const GRAV = 18;
const WALL_BOUNCE = 0.42;
const GROUND_BOUNCE = 0.38;
const RAD = 0.26;
const SUBSTEPS = 3;

/* ================= SQUASH & STRETCH ================= */
export class SquashSpring {
  constructor() {
    this.sx = 1; this.sy = 1;
    this.kx = 0; this.ky = 0;
  }
  impulse(ix, iy) { this.kx += ix; this.ky += iy; }
  update(dt, tx = 1, ty = 1) {
    dt = Math.min(dt, 0.033);
    const K = 140, D = 14;
    this.kx += (tx - this.sx) * K * dt; this.kx *= Math.max(0, 1 - D * dt);
    this.ky += (ty - this.sy) * K * dt; this.ky *= Math.max(0, 1 - D * dt);
    this.sx = Math.min(1.6, Math.max(0.45, this.sx + this.kx * dt));
    this.sy = Math.min(1.6, Math.max(0.45, this.sy + this.ky * dt));
  }
}

export function velocityStretch(vx, vz, vy = 0) {
  const ground = Math.hypot(vx, vz);
  const amt = Math.min(0.4, Math.max(0, (ground - 1.6) * 0.04) + Math.min(0.25, Math.abs(vy) * 0.03));
  if (amt < 0.02) return { tx: 1, ty: 1 };
  const vert = Math.abs(vy) * 1.4 + Math.abs(vz);
  if (vert > Math.abs(vx)) return { tx: 1 - amt * 0.6, ty: 1 + amt };
  return { tx: 1 + amt, ty: 1 - amt * 0.6 };
}

export function ragdollDuration(power) {
  return Math.min(2.6, 0.45 + power * 0.055);
}

/* Body size for ground-contact math (billboard pivot = feet). */
export function entityBodySize(ent) {
  if (ent.sprite?.bill) {
    const geo = ent.sprite.bill.geometry;
    return { h: geo.parameters.height, w: geo.parameters.width };
  }
  if (ent.def?.size) return { h: ent.def.size, w: ent.def.size * 0.94 };
  return { h: 0.95, w: 0.9 };
}

/* Lowest Y of a bottom-pivot billboard after Z rotation — used to keep feet on ground. */
function rotatedFootClearance(ang, bodyW, bodyH) {
  const hw = bodyW * 0.5;
  const ys = [
    0,
    -hw * Math.sin(ang) + bodyH * Math.cos(ang),
    hw * Math.sin(ang) + bodyH * Math.cos(ang),
  ];
  return Math.min(...ys);
}

/* Visual pose from ragdoll state: center-of-mass height + rotation without floor clip. */
export function ragdollBillPose(r, bodyH, bodyW) {
  const clearance = rotatedFootClearance(r.ang, bodyW, bodyH);
  const groundLift = r.airborne ? 0 : Math.max(0, -clearance);
  const y = Math.max(0, r.y) + groundLift;
  // lean the torso slightly in the direction of travel (center of mass shift)
  const lean = Math.min(0.14, Math.hypot(r.vx, r.vz) * 0.018);
  const leanX = lean * Math.sign(r.vx || r.vz || 1);
  const shadow = Math.max(0.25, 1 - Math.min(1, r.y / (bodyH * 1.1)));
  return { y, ang: r.ang, leanX, shadow, airborne: r.airborne };
}

export function launchRagdoll(ent, dx, dz, power, massK = 1, light = false) {
  const { h, w } = entityBodySize(ent);
  const len = Math.hypot(dx, dz) || 1;
  const pScale = light ? 0.55 : 1;
  const mScale = light ? 0.82 : 1;
  const spd = Math.min(light ? 6.5 : 10, (light ? 2.2 : 3.0) + power * (light ? 0.16 : 0.28)) * massK * mScale;
  ent.ragdoll = {
    t: ragdollDuration(power * pScale) * massK,
    vx: (dx / len) * spd,
    vz: (dz / len) * spd,
    vy: Math.min(light ? 4.5 : 7.5, (light ? 1.4 : 2.2) + power * (light ? 0.07 : 0.12)) * massK * mScale,
    y: 0,
    ang: 0,
    spin: (Math.random() < 0.5 ? -1 : 1) * Math.min(light ? 9 : 14, (light ? 3 : 5) + power * (light ? 0.22 : 0.4)),
    bodyH: h,
    bodyW: w,
    airborne: false,
    groundedT: 0,
    light,
  };
}

function solidAt(world, x, z) {
  return world.isSolid(x - RAD, z - RAD) || world.isSolid(x + RAD, z - RAD) ||
         world.isSolid(x - RAD, z + RAD) || world.isSolid(x + RAD, z + RAD);
}

function integrateRagdollStep(ent, sdt, world, fx) {
  const r = ent.ragdoll;

  const nx = ent.pos.x + r.vx * sdt;
  if (solidAt(world, nx, ent.pos.z)) {
    if (Math.abs(r.vx) > 1.2 && ent.squash) ent.squash.impulse(-3.5, 2.5);
    r.vx *= -WALL_BOUNCE; r.spin *= -0.55;
  } else ent.pos.x = nx;

  const nz = ent.pos.z + r.vz * sdt;
  if (solidAt(world, ent.pos.x, nz)) {
    if (Math.abs(r.vz) > 1.2 && ent.squash) ent.squash.impulse(2.5, -3.5);
    r.vz *= -WALL_BOUNCE;
  } else ent.pos.z = nz;

  r.vy -= GRAV * sdt;
  r.y += r.vy * sdt;

  if (r.y <= 0) {
    if (r.y < 0) r.y = 0;
    if (r.vy < -1.8) {
      if (ent.squash) ent.squash.impulse(3.2, -4.5);
      r.vy = -r.vy * GROUND_BOUNCE;
      r.vx *= 0.68; r.vz *= 0.68; r.spin *= 0.62;
      if (fx) fx.particles(ent.pos, 4, 1.3);
      SFX.thud();
    } else {
      r.vy = 0;
    }
    r.airborne = false;
    r.groundedT += sdt;
  } else {
    r.airborne = true;
    r.groundedT = 0;
  }

  if (!r.airborne) {
    const f = Math.max(0, 1 - sdt * 3.4);
    r.vx *= f; r.vz *= f;
  }

  const speed = Math.hypot(r.vx, r.vz) + Math.abs(r.vy);
  if (speed > 1.1) {
    r.ang += r.spin * sdt;
    // nudge tumble toward travel direction when sliding on the ground
    if (!r.airborne && Math.hypot(r.vx, r.vz) > 0.8) {
      const travel = Math.atan2(r.vz, r.vx);
      const target = travel + (r.spin > 0 ? Math.PI / 2 : -Math.PI / 2);
      r.ang += (target - r.ang) * Math.min(1, sdt * 4);
    }
  } else if (!r.airborne) {
    const lie = r.ang >= 0 ? Math.PI / 2 : -Math.PI / 2;
    r.ang += (lie - r.ang) * Math.min(1, sdt * 9);
  }

  if (r.t <= 0.28) r.ang *= Math.max(0, 1 - sdt * 11);
}

export function updateRagdoll(ent, dt, world, fx) {
  const r = ent.ragdoll;
  if (!r) return false;
  r.t -= dt;
  const sdt = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) integrateRagdollStep(ent, sdt, world, fx);
  if (r.t <= 0) { ent.ragdoll = null; return false; }
  return true;
}

/* ================= KNOCKABLE SCENERY OBJECTS ================= */
export const PHYS_TYPES = {
  pot:    { art: 'pot',    w: 0.62, h: 0.62, hp: 1, gold: [1, 3], goldChance: 0.3 },
  crate:  { art: 'crate',  w: 0.78, h: 0.78, hp: 2, gold: [2, 6], goldChance: 0.4, potionChance: 0.08 },
  barrel: { art: 'barrel', w: 0.7,  h: 0.85, hp: 2, gold: [2, 5], goldChance: 0.35 },
  rock:   { art: 'rockS',  w: 0.58, h: 0.5,  hp: Infinity },
};

function physGroundLift(ang, w, h, y) {
  return Math.max(0, y) + Math.max(0, -rotatedFootClearance(ang, w, h));
}

let physUid = 1;
export class PhysObj {
  constructor(type, x, z) {
    this.id = physUid++;
    this.type = type;
    this.def = PHYS_TYPES[type];
    this.hp = this.def.hp;
    this.pos = new THREE.Vector3(x + 0.5, 0, z + 0.5);
    this.group = new THREE.Group();
    this.bill = makeBillboard(Art.props[this.def.art], this.def.w, this.def.h);
    this.shadow = makeBlobShadow(this.def.w * 0.3);
    this.group.add(this.bill, this.shadow);
    this.group.position.copy(this.pos);
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.y = 0; this.ang = 0; this.spin = 0;
    this.squash = new SquashSpring();
    this.dead = false;
  }

  hit(dmg, origin, game) {
    if (this.dead) return;
    const dx = this.pos.x - origin.x, dz = this.pos.z - origin.z;
    const len = Math.hypot(dx, dz) || 1;
    const spd = Math.min(11, 3.5 + dmg * 0.3);
    this.vx = (dx / len) * spd;
    this.vz = (dz / len) * spd;
    this.vy = Math.max(this.vy, Math.min(7, 2.6 + dmg * 0.12));
    this.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.min(12, dmg * 0.4));
    if (Math.abs(this.vx) > Math.abs(this.vz)) this.squash.impulse(3, -2.2);
    else this.squash.impulse(-2.2, 3);
    if (this.hp !== Infinity && --this.hp <= 0) { this.break_(game); return; }
    SFX.thud();
    game.fx.particles(this.pos, 3, 1.2);
  }

  break_(game) {
    this.dead = true;
    SFX.shatter();
    game.fx.particles(this.pos, 12, 2.6);
    const d = this.def;
    if (d.goldChance && Math.random() < d.goldChance) {
      game.spawnDrop('gold', d.gold[0] + ((Math.random() * (d.gold[1] - d.gold[0])) | 0), this.pos);
    }
    if (d.potionChance && Math.random() < d.potionChance) game.spawnDrop('potion', 1, this.pos);
  }

  update(dt, world, game) {
    if (this.dead) return;
    const p = game.player;
    const pdx = this.pos.x - p.pos.x, pdz = this.pos.z - p.pos.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd < 0.5 && p.moving && Math.hypot(this.vx, this.vz) < 1.5) {
      this.vx = (pdx / (pd || 0.01)) * 1.6;
      this.vz = (pdz / (pd || 0.01)) * 1.6;
      this.spin = (pdx > 0 ? 1 : -1) * 4;
    }

    if (Math.hypot(this.vx, this.vz) < 0.05 && this.y <= 0 && Math.abs(this.vy) < 0.05) {
      if (Math.abs(this.ang) > 0.01) {
        this.ang *= Math.max(0, 1 - dt * 8);
        this.bill.rotation.z = this.ang;
      }
      this.squash.update(dt);
      this.bill.scale.set(this.squash.sx, this.squash.sy, 1);
      this.bill.position.set(0, physGroundLift(this.ang, this.def.w, this.def.h, 0), 0);
      this.shadow.scale.setScalar(1);
      return;
    }

    const sdt = dt / SUBSTEPS;
    const { w, h } = this.def;
    for (let i = 0; i < SUBSTEPS; i++) {
      const nx = this.pos.x + this.vx * sdt;
      if (solidAt(world, nx, this.pos.z)) {
        if (Math.abs(this.vx) > 1.5) this.squash.impulse(-3.5, 2.5);
        this.vx *= -0.5; this.spin *= -0.7;
      } else this.pos.x = nx;
      const nz = this.pos.z + this.vz * sdt;
      if (solidAt(world, this.pos.x, nz)) {
        if (Math.abs(this.vz) > 1.5) this.squash.impulse(2.5, -3.5);
        this.vz *= -0.5;
      } else this.pos.z = nz;

      this.vy -= GRAV * sdt;
      this.y += this.vy * sdt;
      if (this.y <= 0) {
        if (this.y < 0) this.y = 0;
        if (this.vy < -2.5) {
          this.squash.impulse(3.2, -4.5);
          this.vy = -this.vy * 0.38;
          this.vx *= 0.7; this.vz *= 0.7; this.spin *= 0.7;
          game.fx.particles(this.pos, 3, 1);
        } else this.vy = 0;
      }
      if (this.y <= 0.001) {
        const f = Math.max(0, 1 - sdt * 3.5);
        this.vx *= f; this.vz *= f;
      }
    }

    if (Math.hypot(this.vx, this.vz) + Math.abs(this.vy) > 1) this.ang += this.spin * dt;
    else this.ang *= Math.max(0, 1 - dt * 8);

    const tgt = velocityStretch(this.vx, this.vz, this.vy);
    this.squash.update(dt, tgt.tx, tgt.ty);

    const billY = physGroundLift(this.ang, w, h, this.y);
    this.group.position.copy(this.pos);
    this.bill.position.set(0, billY, 0);
    this.bill.rotation.z = this.ang;
    this.bill.scale.set(this.squash.sx, this.squash.sy, 1);
    const sh = Math.max(0.25, 1 - Math.min(1, this.y / (h * 1.1)));
    this.shadow.scale.setScalar(sh);
  }
}
