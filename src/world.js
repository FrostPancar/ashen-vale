// ASHEN VALE — 3D world construction from map data.
import * as THREE from 'three';
import { Art, PAL, makeCanvas, canvasTexture } from './art.js';
import { TILDEF } from './maps.js';
import { applyMapSprinkles, TILE_MAP, SOLID_CHARS, validateStamp } from './worldSprinkles.js';
import { buildPortalIndicators } from './portalIndicators.js';

export const TILE = 1;                       // 1 tile = 1 world unit
export const CAM_OFF = new THREE.Vector3(0, 9.5, 7.5);
export const SPRITE_TILT = -Math.atan2(CAM_OFF.y, CAM_OFF.z); // billboards face camera

const texCache = new Map();
function tileTex(name) {
  if (!texCache.has(name)) texCache.set(name, canvasTexture(Art.tiles[name]));
  return texCache.get(name);
}

function groundTexFor(ch, td) {
  if (ch === 'F') return 'grass2';
  if (ch === ',') return 'grassGround';
  return td.tex;
}

function fenceAlongX(x, y, d, w, h) {
  const isF = (a, b) => a >= 0 && b >= 0 && a < w && b < h && d[b * w + a] === 'F';
  const ew = isF(x - 1, y) || isF(x + 1, y);
  const ns = isF(x, y - 1) || isF(x, y + 1);
  if (ns && !ew) return false;
  return true;
}

function tileHash(x, y) { return (x * 73856093) ^ (y * 19349663); }

/* Build an upright billboard plane whose origin is its bottom-center. */
export function makeBillboard(canvas, w, h, opts = {}) {
  const tex = canvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const mat = new THREE.MeshLambertMaterial({
    map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    emissive: new THREE.Color(PAL[0]), emissiveIntensity: opts.glow || 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = SPRITE_TILT;
  return mesh;
}

export function makeBlobShadow(r = 0.32) {
  const [c, ctx] = makeCanvas(32, 32);
  const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  g.addColorStop(0, 'rgba(72,74,72,0.50)');
  g.addColorStop(1, 'rgba(72,74,72,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  const mat = new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.def = null;
    this.solid = null;     // Uint8Array per tile
    this.waterMeshes = [];
    this.waterFlip = 0;
    this.props = [];       // interactable prop instances
    this.dynamicSolids = []; // {x,y,w,h,id,active}
    this.playerLight = null;
    this.glow = null; // GlowSystem — set by Game before load()
  }

  isSolid(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (!this.def) return true;
    const { w, h } = this.def.grid;
    if (tx < 0 || tz < 0 || tx >= w || tz >= h) return true;
    if (this.solid[tz * w + tx]) return true;
    for (const s of this.dynamicSolids) {
      if (s.active && tx >= s.x && tx < s.x + (s.w || 1) && tz >= s.y && tz < s.y + (s.h || 1)) return true;
    }
    return false;
  }

  // Cut a tall-grass tile at world coords: repaint it to stubble on the ground
  // mega-texture. Returns true if grass was actually cut.
  cutGrass(wx, wz) {
    if (!this.def || !this.groundCtx) return false;
    const tx = Math.floor(wx), tz = Math.floor(wz);
    const { w, h, d } = this.def.grid;
    if (tx < 0 || tz < 0 || tx >= w || tz >= h) return false;
    const td = TILDEF[d[tz * w + tx]];
    if (!td || !td.grass) return false;
    const key = tz * w + tx;
    if (this.cutSet.has(key)) return false;
    this.cutSet.add(key);
    this.groundCtx.drawImage(Art.tiles.cutgrass, tx * 16, tz * 16);
    this.groundTex.needsUpdate = true;
    const tuft = this.grassTufts?.get(key);
    if (tuft) {
      this.group.remove(tuft);
      this.grassTufts.delete(key);
    }
    return true;
  }

  tileChar(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    const { w, h, d } = this.def.grid;
    if (tx < 0 || tz < 0 || tx >= w || tz >= h) return '_';
    return d[tz * w + tx];
  }

  load(def, flags) {
    this.dispose();
    this.def = def;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.props = [];
    this.dynamicSolids = [];
    this.waterMeshes = [];

    const { w, h, d } = def.grid;
    this.solid = new Uint8Array(w * h);

    /* ---- ground mega-texture ---- */
    const [gc, gctx] = makeCanvas(w * 16, h * 16);
    const [wc1, wctx1] = makeCanvas(w * 16, h * 16);
    const [wc2, wctx2] = makeCanvas(w * 16, h * 16);
    let hasWater = false;
    const treeSpots = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = d[y * w + x];
        const td = TILDEF[ch] || TILDEF['.'];
        gctx.drawImage(Art.tiles[groundTexFor(ch, td)], x * 16, y * 16);
        if (td.solid) this.solid[y * w + x] = 1;
        if (td.water) {
          hasWater = true;
          wctx1.drawImage(Art.tiles.water, x * 16, y * 16);
          wctx2.drawImage(Art.tiles.water2, x * 16, y * 16);
        }
        if (td.prop) treeSpots.push({ x, y, kind: td.prop });
      }
    }
    const groundTex = canvasTexture(gc);
    // keep refs so tiles can be repainted live (cut grass)
    this.groundCtx = gctx;
    this.groundTex = groundTex;
    this.cutSet = new Set();
    this.grassTufts = new Map();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshLambertMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w / 2, 0, h / 2);
    this.group.add(ground);

    if (hasWater) {
      const t1 = canvasTexture(wc1), t2 = canvasTexture(wc2);
      const wmat = new THREE.MeshBasicMaterial({ map: t1, transparent: true });
      const wmesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wmat);
      wmesh.rotation.x = -Math.PI / 2;
      wmesh.position.set(w / 2, 0.01, h / 2);
      wmesh.userData = { t1, t2 };
      this.group.add(wmesh);
      this.waterMeshes.push(wmesh);
    }

    /* ---- tall tiles (cliffs / cave walls / interior walls) as instanced boxes ---- */
    this.buildWalls(def, w, h, d);

    /* ---- 3D fences & grass tufts ---- */
    this.buildFences(w, h, d);
    this.buildGrassTufts(w, h, d);

    /* ---- trees as billboards ---- */
    for (const t of treeSpots) {
      const canvas = t.kind === 'pine' ? Art.props.pine : Art.props.tree;
      const hgt = t.kind === 'pine' ? 1.65 : 1.75;
      const b = makeBillboard(canvas, 1.45, hgt);
      b.position.set(t.x + 0.5, 0, t.y + 0.85);
      this.group.add(b);
    }

    /* ---- buildings ---- */
    for (const b of def.buildings) this.buildBuilding(b, w, h);

    /* ---- props ---- */
    for (const p of def.props) this.spawnProp(p, flags);
    applyMapSprinkles(this, def.id, flags);
    buildPortalIndicators(this, def, flags);

    /* ---- lighting per ambient ---- */
    this.buildLights(def, w, h);

    return { w, h };
  }

  buildWalls(def, w, h, d) {
    const spots = { cliff: [], cavewall: [], iwall: [], counter: [], citywall: [] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const td = TILDEF[d[y * w + x]];
      if (td && td.tall) spots[td.tex] && spots[td.tex].push([x, y]);
    }
    const heights = { cliff: 0.8, cavewall: 1.6, iwall: 1.4, counter: 0.62, citywall: 2.0 };
    for (const [tex, list] of Object.entries(spots)) {
      if (!list.length) continue;
      const hh = heights[tex];
      const geo = new THREE.BoxGeometry(1, hh, 1);
      const mat = new THREE.MeshLambertMaterial({ map: tileTex(tex) });
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      const m4 = new THREE.Matrix4();
      list.forEach(([x, y], i) => {
        m4.setPosition(x + 0.5, hh / 2, y + 0.5);
        inst.setMatrixAt(i, m4);
      });
      this.group.add(inst);
    }
  }

  buildFences(w, h, d) {
    const fences = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x] === 'F') fences.push([x, y]);
    }
    if (!fences.length) return;
    const postGeo = new THREE.BoxGeometry(0.08, 0.56, 0.08);
    const railGeoX = new THREE.BoxGeometry(0.88, 0.055, 0.06);
    const railGeoZ = new THREE.BoxGeometry(0.06, 0.055, 0.88);
    const postMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL[0]) });
    const railMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL[1]) });
    const posts = new THREE.InstancedMesh(postGeo, postMat, fences.length * 2);
    const railsX = [];
    const railsZ = [];
    const m4 = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    fences.forEach(([x, y], fi) => {
      const alongX = fenceAlongX(x, y, d, w, h);
      const cx = x + 0.5, cz = y + 0.5;
      const hw = 0.4;
      const postPts = alongX ? [[-hw, 0.28, 0], [hw, 0.28, 0]] : [[0, 0.28, -hw], [0, 0.28, hw]];
      postPts.forEach(([px, py, pz], pi) => {
        pos.set(cx + px, py, cz + pz);
        q.identity();
        m4.compose(pos, q, sc);
        posts.setMatrixAt(fi * 2 + pi, m4);
      });
      for (const ry of [0.38, 0.22]) {
        pos.set(cx, ry, cz);
        q.identity();
        m4.compose(pos, q, sc);
        (alongX ? railsX : railsZ).push(m4.clone());
      }
    });
    posts.instanceMatrix.needsUpdate = true;
    this.group.add(posts);
    if (railsX.length) {
      const inst = new THREE.InstancedMesh(railGeoX, railMat, railsX.length);
      railsX.forEach((mat, i) => inst.setMatrixAt(i, mat));
      inst.instanceMatrix.needsUpdate = true;
      this.group.add(inst);
    }
    if (railsZ.length) {
      const inst = new THREE.InstancedMesh(railGeoZ, railMat, railsZ.length);
      railsZ.forEach((mat, i) => inst.setMatrixAt(i, mat));
      inst.instanceMatrix.needsUpdate = true;
      this.group.add(inst);
    }
  }

  _grassBillboard(canvas, w, h) {
    const tex = canvasTexture(canvas);
    const mat = new THREE.MeshLambertMaterial({
      map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    return new THREE.Mesh(geo, mat);
  }

  _spawnGrassTuftsAt(tx, ty, w, h, tall = true) {
    const key = ty * w + tx;
    if (this.grassTufts.has(key)) return;
    const group = new THREE.Group();
    const cx = tx + 0.5, cz = ty + 0.5;
    const hsh = tileHash(tx, ty);
    const spots = tall
      ? [[-0.28, -0.12], [0.02, -0.22], [0.26, -0.1], [0.38, 0.08]]
      : [[(hsh & 3) / 16 - 0.1, ((hsh >> 2) & 3) / 16 - 0.1]];
    const sprites = tall ? Art.grassTufts : Art.grassBlades;
    const scale = tall ? 0.028 : 0.022;
    for (let i = 0; i < spots.length; i++) {
      const [ox, oz] = spots[i];
      const canvas = sprites[(hsh + i * 5) % sprites.length];
      const bh = canvas.height * scale;
      const bw = canvas.width * scale;
      for (const rot of [0, Math.PI / 2]) {
        const plane = this._grassBillboard(canvas, bw, bh);
        plane.rotation.x = SPRITE_TILT * 0.5;
        plane.rotation.y = rot;
        plane.position.set(cx + ox, 0, cz + oz);
        group.add(plane);
      }
    }
    group.position.set(0, 0, 0);
    this.group.add(group);
    this.grassTufts.set(key, group);
  }

  buildGrassTufts(w, h, d) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = d[y * w + x];
      if (ch === ',') this._spawnGrassTuftsAt(x, y, w, h, true);
      else if ((ch === '.' || ch === ':') && (tileHash(x, y) & 7) === 0) {
        this._spawnGrassTuftsAt(x, y, w, h, false);
      }
    }
  }

  _spawnFenceAt(tx, ty) {
    const { w, h, d } = this.def.grid;
    const alongX = fenceAlongX(tx, ty, d, w, h);
    const cx = tx + 0.5, cz = ty + 0.5;
    const hw = 0.4;
    const postMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL[0]) });
    const railMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(PAL[1]) });
    const group = new THREE.Group();
    const postPts = alongX ? [[-hw, 0.28, 0], [hw, 0.28, 0]] : [[0, 0.28, -hw], [0, 0.28, hw]];
    for (const [px, py, pz] of postPts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.08), postMat);
      m.position.set(cx + px, py, cz + pz);
      group.add(m);
    }
    const railGeo = alongX
      ? new THREE.BoxGeometry(0.88, 0.055, 0.06)
      : new THREE.BoxGeometry(0.06, 0.055, 0.88);
    for (const ry of [0.38, 0.22]) {
      const m = new THREE.Mesh(railGeo, railMat);
      m.position.set(cx, ry, cz);
      group.add(m);
    }
    this.group.add(group);
    if (!this.fenceExtras) this.fenceExtras = [];
    this.fenceExtras.push(group);
  }

  // Gabled roof prism: ridge runs along the x axis, eaves at y=0, ridge at y=h.
  // UVs are in world units so the roof texture tiles without stretching.
  static gableRoofGeometry(w, d, h) {
    const hw = w / 2, hd = d / 2;
    const slope = Math.hypot(hd, h);
    const pos = [], uv = [];
    const tri = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
    const quad = (a, b, c, d2, ua, ub, uc, ud) => { tri(a, b, c, ua, ub, uc); tri(a, c, d2, ua, uc, ud); };
    // south slope
    quad([-hw, 0, hd], [hw, 0, hd], [hw, h, 0], [-hw, h, 0],
         [0, 0], [w, 0], [w, slope], [0, slope]);
    // north slope
    quad([hw, 0, -hd], [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0],
         [0, 0], [w, 0], [w, slope], [0, slope]);
    // gable ends (west, east)
    tri([-hw, 0, -hd], [-hw, 0, hd], [-hw, h, 0], [0, 0], [d, 0], [d / 2, h]);
    tri([hw, 0, hd], [hw, 0, -hd], [hw, h, 0], [0, 0], [d, 0], [d / 2, h]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  }

  buildBuilding(b, mapW, mapH) {
    const H = 1.7, ROOF_H = 0.9;
    // mark footprint solid
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      this.solid[y * this.def.grid.w + x] = 1;
    }
    // doorway stays walkable so the portal can trigger
    this.solid[b.door.y * this.def.grid.w + b.door.x] = 0;
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
    const wallMat = new THREE.MeshLambertMaterial({ map: tileTex('wall') });
    wallMat.map = wallMat.map.clone();
    wallMat.map.repeat.set(b.w, 2); wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping;
    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, H, b.h - 0.4), wallMat);
    body.position.set(cx, H / 2, cz - 0.2);
    this.group.add(body);
    // roof: gabled (ridge along x), built to the building's footprint with a small overhang
    const roofMat = new THREE.MeshLambertMaterial({ map: tileTex('roof') });
    roofMat.map = roofMat.map.clone();
    roofMat.map.wrapS = roofMat.map.wrapT = THREE.RepeatWrapping;
    const roof = new THREE.Mesh(World.gableRoofGeometry(b.w + 0.5, b.h - 0.4 + 0.5, ROOF_H), roofMat);
    roof.position.set(cx, H - 0.04, cz - 0.2);
    this.group.add(roof);
    // door plane on south face
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.15),
      new THREE.MeshLambertMaterial({ map: tileTex('door'), transparent: true })
    );
    door.position.set(b.door.x + 0.5, 0.58, b.y + b.h - 0.39);
    this.group.add(door);
    // windows
    const winMat = new THREE.MeshLambertMaterial({ map: tileTex('window') });
    for (const wx of [b.x + 1.2, b.x + b.w - 2.2]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), winMat);
      win.position.set(wx + 0.5, 0.9, b.y + b.h - 0.39);
      this.group.add(win);
    }
    // label sign above door
    if (b.label) {
      const [lc, lctx] = makeCanvas(b.label.length * 9 + 10, 16);
      lctx.fillStyle = PAL[0]; lctx.fillRect(0, 0, lc.width, 16);
      lctx.fillStyle = PAL[3]; lctx.font = 'bold 10px monospace'; lctx.textBaseline = 'middle';
      lctx.fillText(b.label, 5, 8);
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(lc.width / 26, 0.55),
        new THREE.MeshBasicMaterial({ map: canvasTexture(lc), transparent: true })
      );
      lbl.position.set(b.door.x + 0.5, 1.45, b.y + b.h - 0.36);
      this.group.add(lbl);
    }
    // door is a portal
    this.def.portals.push({ x: b.door.x, y: b.y + b.h - 1, w: 1, h: 1, to: b.to, isDoor: true });
  }

  spawnProp(p, flags) {
    // physics-driven objects (pots, crates...) are spawned by Game, not World
    if (p.type === 'pot' || p.type === 'crate' || p.type === 'barrel' || p.type === 'rock') return null;
    // conditional spawns: ifFlag 'key' or 'key:value', unlessFlag 'key'
    if (p.ifFlag) {
      const [k, v] = p.ifFlag.split(':');
      const f = flags ? flags[k] : undefined;
      if (v != null ? String(f) !== v : !f) return null;
    }
    if (p.unlessFlag && flags && flags[p.unlessFlag]) return null;
    const inst = { ...p, mesh: null, opened: false };
    const add = (canvas, w, h, glow) => {
      const m = makeBillboard(canvas, w, h, { glow });
      m.position.set(p.x + 0.5, 0, p.y + 0.9);
      this.group.add(m);
      inst.mesh = m;
      return m;
    };
    switch (p.type) {
      case 'sign': add(Art.props.sign, 0.9, 0.9); inst.solid = true; break;
      case 'chest': {
        const opened = flags && flags[`opened_${p.id}`];
        add(opened ? Art.props.chestOpen : Art.props.chest, 0.85, 0.85);
        inst.opened = !!opened; inst.solid = true;
        break;
      }
      case 'dummy': add(Art.props.dummy, 0.95, 0.95); inst.solid = true; inst.hp = 3; break;
      case 'lever': {
        const on = flags && flags[p.id];
        add(on ? Art.props.leverOn : Art.props.leverOff, 0.9, 0.9);
        inst.on = !!on;
        if (on) this._attachGlow(inst, 'lever_on');
        break;
      }
      case 'boulder': {
        const key = `boulder_${p.id}`;
        const saved = flags && flags[key];
        const bx = saved ? saved.x : p.x, by = saved ? saved.y : p.y;
        add(Art.props.boulder, 0.95, 0.95).position.set(bx + 0.5, 0, by + 0.9);
        inst.tx = bx; inst.ty = by;
        inst.dyn = { x: bx, y: by, w: 1, h: 1, active: true, id: p.id };
        this.dynamicSolids.push(inst.dyn);
        break;
      }
      case 'gate': case 'gateBig': {
        const open = flags && flags[p.openIf];
        const wid = p.w || 1;
        if (!open) {
          const big = p.type === 'gateBig';
          const m = makeBillboard(Art.props.gate, wid, big ? 1.9 : 1.2);
          m.position.set(p.x + wid / 2, 0, p.y + 0.95);
          this.group.add(m);
          inst.mesh = m;
        }
        inst.dyn = { x: p.x, y: p.y, w: wid, h: 1, active: !open, id: p.id };
        this.dynamicSolids.push(inst.dyn);
        break;
      }
      case 'grave': add(Art.props.grave, 0.8, 0.8); inst.solid = true; break;
      case 'fountain': {
        const m = add(Art.props.fountain, 1.3, 1.3);
        m.position.set(p.x, 0, p.y + 0.6);
        inst.solid = true;
        break;
      }
      /* ---- decoration & cozy interactables ---- */
      case 'table': add(Art.props.table, 0.95, 0.95); inst.solid = true; break;
      case 'stool': add(Art.props.stool, 0.7, 0.7); break;
      case 'bed': add(Art.props.bed, 0.9, 1.0); inst.solid = true; break;
      case 'bookshelf': add(Art.props.bookshelf, 0.95, 0.95); inst.solid = true; break;
      case 'fireplace': add(Art.props.fireplace, 1.0, 1.0, 0.32); inst.solid = true; this._attachGlow(inst, 'fireplace'); break;
      case 'plant': add(Art.props.plant, 0.8, 0.8); inst.solid = true; break;
      case 'lamp': add(Art.props.lamp, 0.85, 1.3, 0.24); inst.solid = true; this._attachGlow(inst, 'lamp'); break;
      case 'anvil': add(Art.props.anvil, 0.85, 0.85); inst.solid = true; break;
      case 'rack': add(Art.props.rack, 0.95, 0.95); inst.solid = true; break;
      case 'bench': add(Art.props.bench, 1.0, 0.85); inst.solid = true; break;
      case 'basket': add(Art.props.basket, 0.7, 0.7); break;
      case 'cat': add(Art.props.cat, 0.7, 0.7); break;
      case 'charm': add(Art.props.charm, 0.6, 0.6, 0.38); this._attachGlow(inst, 'charm'); break;
      case 'shrine': add(Art.props.shrine, 1.0, 1.5, 0.2); inst.solid = true; this._attachGlow(inst, 'shrine'); break;
      case 'stall': {
        const m = add(Art.props.stall, 2.0, 1.65);
        m.position.set(p.x + 1, 0, p.y + 0.9);
        inst.solid = true; // main tile
        const dyn2 = { x: Math.floor(p.x) + 1, y: Math.floor(p.y), w: 1, h: 1, active: true };
        this.dynamicSolids.push(dyn2); // stall is 2 tiles wide
        break;
      }
      case 'fishspot': add(Art.props.fishspot, 0.8, 0.5).position.y = 0.04; this._attachGlow(inst, 'fishspot'); break;
      default:
        if (this._spawnSprinkle(inst, p.type, p)) break;
        return null;
    }
    if (inst.solid) {
      const dyn = { x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1, active: true };
      inst.solidDyn = dyn;
      this.dynamicSolids.push(dyn);
    }
    this.props.push(inst);
    return inst;
  }

  _sprinkleSize(type, canvas) {
    const meta = Art.sprinkleMeta?.[type];
    if (meta) return [meta.w / 16, meta.h / 16];
    return [canvas.width / 16, canvas.height / 16];
  }

  _spawnSprinkle(inst, type, opts = {}) {
    const canvas = Art.sprinkles[type] || Art.props[type];
    if (!canvas) return false;
    const [bw, bh] = this._sprinkleSize(type, canvas);
    const glow = opts.glow ?? this._sprinkleGlow(type);
    const m = makeBillboard(canvas, bw, bh, { glow });
    const ox = (opts.ox || 0) / 16, oy = (opts.oy || 0) / 16;
    m.position.set(inst.x + 0.5 + ox, 0, inst.y + 0.9 + oy);
    this.group.add(m);
    inst.mesh = m;
    inst.type = type;
    if (opts.solid) inst.solid = true;
    if (opts.text) inst.text = opts.text;
    if (opts.signName) inst.signName = opts.signName;
    if (opts.interact) inst.interact = opts.interact;
    if (opts.patchId) inst.patchId = opts.patchId;
    if (opts.id) inst.id = opts.id;
    this._attachGlowKind(inst, type);
    return true;
  }

  _sprinkleGlow(type) {
    if (type === 'charm') return 0.42;
    if (type === 'lamp') return 0.28;
    if (type === 'lanternPost' || type === 'lanternString') return 0.26;
    if (type === 'campfireLit' || type === 'campfireRing' || type === 'brazier') return 0.34;
    if (type === 'crystalCluster' || type === 'offeringBowl') return 0.22;
    return 0;
  }

  _attachGlowKind(inst, type) {
    const glowMap = {
      candleStick: 'candle', lanternPost: 'lamp', campfireLit: 'fireplace',
      campfireRing: 'fireplace', brazier: 'fireplace', chimeStrand: 'shrine',
      lanternString: 'lamp', mothCage: 'charm', crystalCluster: 'shrine',
      offeringBowl: 'shrine', echoSign: 'lamp',
    };
    const kind = glowMap[type];
    if (kind) this._attachGlow(inst, kind);
  }

  /** Standalone sprinkle decor (not from a patch stamp). */
  spawnDecor(p, flags) {
    if (p.unlessFlag && flags?.[p.unlessFlag]) return null;
    const inst = { ...p, x: p.x, y: p.y, mesh: null };
    if (!this._spawnSprinkle(inst, p.type, p)) return null;
    if (inst.solid) {
      const dyn = { x: Math.floor(p.x), y: Math.floor(p.y), w: 1, h: 1, active: true };
      inst.solidDyn = dyn;
      this.dynamicSolids.push(dyn);
    }
    this.props.push(inst);
    return inst;
  }

  /** Paint a micro-patch tile overlay and spawn its prop list. */
  stampPatch(def, ox, oy, patchId) {
    if (!validateStamp(this, ox, oy, def)) return false;
    const { w: mw, h: mh } = this.def.grid;
    const rows = def.rows;

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const tx = ox + x, ty = oy + y;
        if (tx < 0 || ty < 0 || tx >= mw || ty >= mh) continue;
        const tex = TILE_MAP[ch] || (TILDEF[ch]?.tex) || 'grass';
        if (Art.tiles[tex] && this.groundCtx) {
          const td = TILDEF[ch] || TILDEF['.'];
          this.groundCtx.drawImage(Art.tiles[groundTexFor(ch, td)], tx * 16, ty * 16);
        }
        if (TILDEF[ch]?.solid || SOLID_CHARS.has(ch)) {
          this.solid[ty * mw + tx] = 1;
        }
        if (ch === 'F') this._spawnFenceAt(tx, ty);
        if (ch === ',') this._spawnGrassTuftsAt(tx, ty, mw, mh, true);
      }
    }
    if (this.groundTex) this.groundTex.needsUpdate = true;

    for (const prop of def.props) {
      const tx = ox + prop.x, ty = oy + prop.y;
      const inst = this.spawnProp({ ...prop, x: tx, y: ty, patchId }, null);
      if (inst?.mesh && (prop.ox || prop.oy)) {
        inst.mesh.position.x += (prop.ox || 0) / 16;
        inst.mesh.position.z += (prop.oy || 0) / 16;
        if (prop.oy < 0) inst.mesh.position.y += Math.min(0.6, -prop.oy / 28);
      }
    }
    return true;
  }

  _attachGlow(inst, kind) {
    if (this.glow && inst.mesh) inst.glowNode = this.glow.attach(inst.mesh, kind);
  }

  openGate(id) {
    for (const pr of this.props) {
      if ((pr.type === 'gate' || pr.type === 'gateBig') && pr.id === id) {
        if (pr.dyn) pr.dyn.active = false;
        if (pr.mesh) { this.group.remove(pr.mesh); pr.mesh = null; }
      }
    }
  }

  moveBoulder(prop, nx, ny) {
    prop.tx = nx; prop.ty = ny;
    prop.dyn.x = nx; prop.dyn.y = ny;
    prop.mesh.position.set(nx + 0.5, 0, ny + 0.9);
  }

  buildLights(def, w, h) {
    const amb = def.ambient;
    if (amb === 'cave') {
      this.group.add(new THREE.AmbientLight(PAL[1], 0.55));
      this.playerLight = new THREE.PointLight(PAL[3], 16, 8.5, 1.5);
      this.playerLight.position.set(w / 2, 1.5, h / 2);
      this.group.add(this.playerLight);
      this.scene.fog = new THREE.FogExp2(new THREE.Color('#525452'), 0.10);
      this.scene.background = new THREE.Color('#484a48');
    } else if (amb === 'interior') {
      this.group.add(new THREE.AmbientLight(PAL[2], 0.85));
      const warm = new THREE.PointLight(PAL[3], 8, 12, 1.2);
      warm.position.set(w / 2, 2.4, h / 2);
      this.group.add(warm);
      this.playerLight = null;
      this.scene.fog = new THREE.Fog(new THREE.Color(PAL[0]), 14, 30);
      this.scene.background = new THREE.Color(PAL[0]);
    } else {
      this.group.add(new THREE.AmbientLight(PAL[2], 0.75));
      const sun = new THREE.DirectionalLight(PAL[3], 1.6);
      sun.position.set(-6, 12, 4);
      this.group.add(sun);
      this.playerLight = null;
      this.scene.fog = new THREE.Fog(new THREE.Color('#888a87'), 16, 34);
      this.scene.background = new THREE.Color('#727470');
    }
  }

  update(dt, t, playerPos) {
    // water flip-book
    this.waterFlip += dt;
    if (this.waterFlip > 0.55) {
      this.waterFlip = 0;
      for (const m of this.waterMeshes) {
        const u = m.userData;
        m.material.map = m.material.map === u.t1 ? u.t2 : u.t1;
        m.material.needsUpdate = true;
      }
    }
    if (this.playerLight && playerPos) {
      this.playerLight.position.set(playerPos.x, 1.4, playerPos.z + 0.4);
      this.playerLight.intensity = 9 + Math.sin(t * 6.5) * 0.8;
    }
    if (this.glow) this.glow.update(dt, t, playerPos);
  }

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => { if (m.map && !texCache.has(m.map.name)) m.map.dispose(); m.dispose(); });
        }
      });
      this.group = null;
    }
  }
}
