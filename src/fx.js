// ASHEN VALE — glow lights + particle VFX.
import * as THREE from 'three';
import { PAL, makeCanvas, canvasTexture } from './art.js';
import { SPRITE_TILT } from './world.js';

const GLOW_COLOR = new THREE.Color(PAL[3]);
const GLOW_UPDATE_DIST = 26;

const GLOW_PRESETS = {
  fireplace: {
    emissive: 0.52, bakedHalo: { size: 2.6, opacity: 0.16, y: 0.55 },
    flickerSpeed: 8.5, flickerAmt: 0.14, resize: 0.04, resizeSpeed: 5.5, fadeSpeed: 1.8,
  },
  lamp: {
    emissive: 0.42, bakedHalo: { size: 1.7, opacity: 0.13, y: 1.05 },
    flickerSpeed: 2.8, flickerAmt: 0.05, resize: 0.025, resizeSpeed: 3.5, fadeSpeed: 2,
  },
  candle: {
    emissive: 0.38, bakedHalo: { size: 0.9, opacity: 0.1, y: 0.45 },
    flickerSpeed: 10, flickerAmt: 0.18, resize: 0.03, resizeSpeed: 9, fadeSpeed: 2.2,
  },
  shrine: {
    emissive: 0.36, bakedHalo: { size: 1.9, opacity: 0.11, y: 1.1 },
    flickerSpeed: 2, flickerAmt: 0.1, fadeSpeed: 1.5,
  },
  charm: {
    emissive: 0.32, bakedHalo: { size: 0.75, opacity: 0.08, y: 0.45 },
    flickerSpeed: 4, flickerAmt: 0.16, fadeSpeed: 2,
  },
  lever_on: {
    emissive: 0.55,
    flickerSpeed: 5, flickerAmt: 0.12, y: 0.55, fadeSpeed: 3,
  },
  fishspot: {
    emissive: 0.18, flickerSpeed: 1.2, flickerAmt: 0.22, y: 0.2, fadeSpeed: 1.2,
  },
};

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

let _particleGeo = null;
function particleGeo() {
  if (!_particleGeo) _particleGeo = new THREE.PlaneGeometry(1, 1);
  return _particleGeo;
}

function particlePlane(size, color) {
  const m = new THREE.Mesh(
    particleGeo(),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }),
  );
  m.rotation.x = SPRITE_TILT;
  m.scale.setScalar(size);
  return m;
}

function addHalo(parent, size, color, opacity = 0.2) {
  const halo = particlePlane(size, color);
  halo.material.opacity = opacity;
  halo.position.z = -0.01;
  parent.add(halo);
  return halo;
}

/** Baked emissive + static halo planes — no per-prop PointLights. */
export class GlowSystem {
  constructor() {
    this.nodes = [];
    this._tmp = new THREE.Vector3();
  }

  attach(mesh, kind, opts = {}) {
    const cfg = GLOW_PRESETS[kind];
    if (!mesh || !cfg) return;
    const node = {
      mesh, kind, phase: Math.random() * Math.PI * 2,
      fade: opts.skipFade ? 1 : 0,
      fadeSpeed: cfg.fadeSpeed ?? 2,
      baseScaleX: mesh.scale.x,
      baseScaleY: mesh.scale.y,
    };
    if (cfg.emissive != null && mesh.material) {
      node.baseEmissive = cfg.emissive;
      mesh.material.emissive = mesh.material.emissive || new THREE.Color(PAL[0]);
      mesh.material.emissiveIntensity = opts.skipFade ? cfg.emissive : 0;
    }
    if (cfg.bakedHalo) {
      const h = cfg.bakedHalo;
      node.bakedHalo = addHalo(mesh, h.size, GLOW_COLOR, h.opacity);
      node.bakedHalo.position.y = h.y ?? 0.6;
      node.bakedHaloBase = h.opacity;
    }
    this.nodes.push(node);
    return node;
  }

  setLever(prop, on) {
    if (prop.glowNode) {
      const idx = this.nodes.indexOf(prop.glowNode);
      if (idx >= 0) this.nodes.splice(idx, 1);
      prop.glowNode = null;
    }
    if (on && prop.mesh) prop.glowNode = this.attach(prop.mesh, 'lever_on', { skipFade: true });
  }

  update(_dt, t, focusPos = null) {
    for (const n of this.nodes) {
      const cfg = GLOW_PRESETS[n.kind];
      if (!cfg || !n.mesh?.material) continue;

      let dist = Infinity;
      if (focusPos) {
        n.mesh.getWorldPosition(this._tmp);
        dist = Math.hypot(this._tmp.x - focusPos.x, this._tmp.z - focusPos.z);
      }

      if (focusPos && dist > GLOW_UPDATE_DIST) {
        if (n.baseEmissive != null) n.mesh.material.emissiveIntensity = n.baseEmissive * 0.55;
        if (n.bakedHalo) n.bakedHalo.material.opacity = n.bakedHaloBase * 0.45;
        continue;
      }

      if (n.fade < 1) n.fade = Math.min(1, n.fade + _dt * n.fadeSpeed);
      const fade = smoothstep(n.fade);

      const flicker = 1 + Math.sin(t * cfg.flickerSpeed + n.phase) * cfg.flickerAmt;
      const em = (n.baseEmissive ?? 0) * flicker * fade;
      if (n.baseEmissive != null) n.mesh.material.emissiveIntensity = em;
      if (n.bakedHalo) n.bakedHalo.material.opacity = n.bakedHaloBase * flicker * fade;

      if (cfg.resize) {
        const pulse = 1 + Math.sin(t * cfg.resizeSpeed + n.phase) * cfg.resize;
        n.mesh.scale.set(n.baseScaleX * pulse, n.baseScaleY * pulse, 1);
      }
    }
  }

  clear() {
    this.nodes = [];
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.glow = new GlowSystem();
    this.list = [];
    this.orbs = [];
    this.flashes = [];
  }

  add(mesh, life, fn) {
    this.scene.add(mesh);
    this.list.push({ mesh, life, max: life, fn });
  }

  addFlash(pos, intensity = 5, distance = 3, life = 0.28) {
    const light = new THREE.PointLight(GLOW_COLOR, intensity, distance, 2);
    light.position.set(pos.x, 0.75, pos.z);
    this.scene.add(light);
    this.flashes.push({ light, life, max: life, base: intensity });
  }

  /** Detach a projectile light and fade it out in world space. */
  fadeLight(light, pos) {
    if (!light) return;
    if (light.parent) light.parent.remove(light);
    light.position.set(pos.x, 0.42, pos.z);
    this.scene.add(light);
    this.flashes.push({ light, life: 0.16, max: 0.16, base: light.intensity });
  }

  /* ---- core particles ---- */
  particles(pos, n, spread = 2, opts = {}) {
    const colorA = opts.colorA ?? PAL[3];
    const colorB = opts.colorB ?? PAL[2];
    const upBias = opts.up ?? 0;
    const count = Math.min(n, opts.cap ?? 24);
    for (let i = 0; i < count; i++) {
      const size = 0.06 + Math.random() * 0.04;
      const m = particlePlane(size, Math.random() > 0.45 ? colorA : colorB);
      m.position.set(pos.x, 0.32 + Math.random() * 0.2, pos.z);
      const vx = (Math.random() - 0.5) * spread;
      const vy = 1.2 + Math.random() * 1.6 + upBias;
      const vz = (Math.random() - 0.5) * spread;
      const life = 0.38 + Math.random() * 0.28;
      this.add(m, life, (e, k) => {
        const fade = smoothstep(k);
        e.mesh.position.x += vx * 0.016;
        e.mesh.position.z += vz * 0.016;
        e.mesh.position.y += (vy - (1 - k) * 4.5) * 0.016;
        e.mesh.material.opacity = fade * (opts.fade ?? 1);
        e.mesh.scale.setScalar(size * (0.55 + fade * 0.45));
      });
    }
  }

  sparks(pos, n = 8, spread = 1.4) {
    const count = Math.min(n, 14);
    for (let i = 0; i < count; i++) {
      const size = 0.04 + Math.random() * 0.02;
      const m = particlePlane(size, PAL[3]);
      m.position.set(pos.x, 0.45, pos.z);
      const a = Math.random() * Math.PI * 2;
      const spd = 0.7 + Math.random() * spread;
      const vx = Math.cos(a) * spd, vz = Math.sin(a) * spd;
      const vy = 1.6 + Math.random() * 2;
      this.add(m, 0.28 + Math.random() * 0.18, (e, k) => {
        const fade = smoothstep(k);
        e.mesh.position.x += vx * 0.018;
        e.mesh.position.z += vz * 0.018;
        e.mesh.position.y += (vy - (1 - k) * 6) * 0.018;
        e.mesh.material.opacity = fade;
        e.mesh.scale.setScalar(size * (0.5 + fade * 0.5));
      });
    }
  }

  /** Projectile / collision burst. */
  impact(pos, opts = {}) {
    const bright = opts.bright ?? false;
    const big = opts.big ?? false;
    this.sparks(pos, big ? 7 : 4, big ? 1.2 : 0.9);
    this.ring(pos, big ? 0.42 : 0.3, big ? 0.24 : 0.18);
    this.particles(pos, big ? 5 : 3, bright ? 1.1 : 0.85, { cap: 8, up: 0.3 });
    this.addFlash(pos, bright ? 3.2 : 2, 1.8, 0.14);
  }

  /* ---- XP orbs: enemy death → player ---- */
  xpAbsorb(from, to, xpAmount) {
    const count = Math.min(8, Math.max(3, Math.round(xpAmount / 4)));
    this.particles(from, 4, 1.4, { up: 0.4, cap: 6 });
    for (let i = 0; i < count; i++) {
      const size = 0.07;
      const m = particlePlane(size, PAL[3]);
      const halo = addHalo(m, size * 2.2, PAL[2], 0.14);
      const off = new THREE.Vector3((Math.random() - 0.5) * 0.45, 0.35 + Math.random() * 0.25, (Math.random() - 0.5) * 0.45);
      m.position.copy(from).add(off);
      const delay = i * 0.045;
      const life = 0.52 + Math.random() * 0.18;
      this.orbs.push({
        mesh: m, halo, life, max: life, delay,
        from: from.clone().add(off),
        to: to.clone().setY(0.55),
        phase: Math.random() * Math.PI * 2,
        size,
      });
      this.scene.add(m);
    }
  }

  /* ---- chest open ---- */
  chestOpen(pos) {
    this.sparks(pos, 10, 1.8);
    this.ring(pos, 0.65, 0.38);
    this.particles(pos, 6, 1.2, { up: 0.8, cap: 8 });
    this.addFlash(pos, 5.5, 4, 0.32);
    for (let i = 0; i < 5; i++) {
      const size = 0.05;
      const m = particlePlane(size, i % 2 ? PAL[3] : PAL[2]);
      m.position.set(pos.x + (Math.random() - 0.5) * 0.35, 0.28, pos.z + (Math.random() - 0.5) * 0.35);
      const vy = 2 + Math.random() * 1.2;
      this.add(m, 0.52, (e, k) => {
        e.mesh.position.y += vy * 0.011;
        e.mesh.material.opacity = smoothstep(k);
        e.mesh.scale.setScalar(size * (0.45 + (1 - k) * 0.7));
      });
    }
  }

  /* ---- level up ---- */
  levelBurst(pos) {
    this.ring(pos, 1.6, 0.58);
    this.ring(pos, 1.05, 0.4);
    this.addFlash(pos, 8, 5, 0.45);
    this.particles(pos, 16, 2.6, { up: 1.4, cap: 18 });
    for (let i = 0; i < 10; i++) {
      const size = 0.08;
      const m = particlePlane(size, PAL[3]);
      addHalo(m, size * 2, PAL[2], 0.12);
      m.position.set(pos.x, 0.18, pos.z);
      const a = (i / 10) * Math.PI * 2;
      const r = 0.28;
      const vx = Math.cos(a) * r, vz = Math.sin(a) * r;
      this.add(m, 0.78, (e, k) => {
        const fade = smoothstep(k);
        e.mesh.position.x += vx * 0.013;
        e.mesh.position.z += vz * 0.013;
        e.mesh.position.y += (2.4 - (1 - k) * 1.8) * 0.015;
        e.mesh.material.opacity = fade;
        e.mesh.scale.setScalar(size * (0.65 + Math.sin((1 - k) * 7) * 0.12));
      });
    }
  }

  /* ---- combat VFX ---- */
  slash(pos, ang, range, arc) {
    const geo = new THREE.RingGeometry(range * 0.42, range, 14, 1, 0, arc);
    const mat = new THREE.MeshBasicMaterial({ color: PAL[3], transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -ang - arc / 2;
    m.position.set(pos.x, 0.32, pos.z);
    this.add(m, 0.18, (e, k) => {
      e.mesh.material.opacity = 0.65 * smoothstep(k);
      e.mesh.scale.setScalar(1 + (1 - k) * 0.28);
    });
    this.sparks(new THREE.Vector3(
      pos.x + Math.cos(ang + arc * 0.5) * range * 0.65,
      0,
      pos.z + Math.sin(ang + arc * 0.5) * range * 0.65,
    ), 4, 0.65);
  }

  ring(pos, radius, life = 0.35) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.22, 20),
      new THREE.MeshBasicMaterial({ color: PAL[3], transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.14, pos.z);
    this.add(m, life, (e, k) => {
      const fade = smoothstep(k);
      const s = (1 - k) * radius / 0.2;
      e.mesh.scale.setScalar(Math.max(0.01, s));
      e.mesh.material.opacity = 0.7 * fade;
    });
  }

  shockwave(pos, radius) {
    this.ring(pos, radius, 0.45);
    this.particles(pos, 10, 2.4, { cap: 12 });
    this.addFlash(pos, 4, radius * 0.65, 0.2);
  }

  telegraph(pos, radius, life) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.15, radius, 28),
      new THREE.MeshBasicMaterial({ color: PAL[2], transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.12, pos.z);
    this.add(m, life, (e, k) => { e.mesh.material.opacity = 0.15 + 0.4 * Math.abs(Math.sin((1 - k) * 18)); });
  }

  projectileTrail(pos, bright = false, kind = 'orb') {
    // arrows leave a thin, fast-fading dust streak; orbs leave a glowing wake
    const arrow = kind === 'arrow';
    const size = arrow ? 0.03 : 0.045;
    const m = particlePlane(size, arrow ? PAL[2] : (bright ? PAL[3] : PAL[2]));
    m.position.set(pos.x, (arrow ? 0.36 : 0.4) + Math.random() * 0.05, pos.z);
    this.add(m, arrow ? 0.18 : 0.28, (e, k) => {
      const fade = smoothstep(k);
      e.mesh.material.opacity = fade * (arrow ? 0.5 : 0.75);
      e.mesh.scale.setScalar(size * (0.35 + fade * 0.55));
    });
  }

  skillSpawn(pos) {
    this.sparks(pos, 3, 0.5);
    this.addFlash(pos, 2.5, 2, 0.12);
  }

  damageText(pos, amount, isPlayer = false, crit = false) {
    const str = String(amount) + (crit ? '!' : '');
    const fs = crit ? 16 : 12;
    const [c, ctx] = makeCanvas(str.length * (fs - 2) + 4, fs + 6);
    ctx.font = `bold ${fs}px monospace`;
    ctx.fillStyle = PAL[0];
    ctx.fillText(str, 3, fs + 1);
    ctx.fillStyle = isPlayer ? PAL[2] : PAL[3];
    ctx.fillText(str, 2, fs);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(c.width / 28, crit ? 0.7 : 0.55),
      new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false }),
    );
    m.rotation.x = SPRITE_TILT;
    m.position.set(pos.x + (Math.random() - 0.5) * 0.35, 1.0, pos.z);
    this.add(m, 0.65, (e, k) => {
      e.mesh.position.y += 0.016;
      e.mesh.material.opacity = Math.min(1, smoothstep(k) * 1.8);
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.life -= dt;
      const k = Math.max(0, e.life / e.max);
      if (e.fn) e.fn(e, k);
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.material.dispose();
        this.list.splice(i, 1);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.delay -= dt;
      if (o.delay > 0) continue;
      o.life -= dt;
      const k = Math.max(0, o.life / o.max);
      const t = 1 - k;
      const ease = smoothstep(t);
      o.mesh.position.lerpVectors(o.from, o.to, ease);
      o.mesh.position.y = 0.42 + Math.sin(o.phase + t * 11) * 0.1 + t * 0.3;
      const fade = smoothstep(k);
      o.mesh.material.opacity = Math.min(1, fade * 1.2);
      o.mesh.scale.setScalar(o.size * (0.5 + Math.sin(t * 9) * 0.1));
      if (o.halo) {
        o.halo.material.opacity = 0.1 + fade * 0.18;
        o.halo.scale.setScalar(1.8 + Math.sin(t * 8) * 0.15);
      }
      if (o.life <= 0) {
        this.scene.remove(o.mesh);
        o.mesh.material.dispose();
        this.orbs.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      f.light.intensity = f.base * smoothstep(k);
      if (f.life <= 0) {
        this.scene.remove(f.light);
        this.flashes.splice(i, 1);
      }
    }
  }

  clear() {
    for (const e of this.list) {
      this.scene.remove(e.mesh);
      e.mesh.material.dispose();
    }
    this.list = [];
    for (const o of this.orbs) {
      this.scene.remove(o.mesh);
      o.mesh.material.dispose();
    }
    this.orbs = [];
    for (const f of this.flashes) this.scene.remove(f.light);
    this.flashes = [];
    this.glow.clear();
  }
}
