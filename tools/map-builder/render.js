// ASHEN VALE — Map Builder canvas renderer.
// Draws a doc to a 2D canvas in two interchangeable modes:
//   'top'  — flat top-down grid
//   '2.5d' — tilted look: vertical compression, extruded tall tiles, lifted
//            billboard sprites with ground shadows (matches the game's feel
//            without pulling in three.js / the live game loop).
import { Art } from '@/art.js';
import { TILDEF } from '@/maps.js';
import { previewCanvas, tileCanvas, entryFor, footprintFor } from './catalog.js';

const BASE_TS = 26;            // px per tile at zoom 1
const Y_SCALE_25 = 0.74;       // vertical squash in 2.5d
const WALL_H = 0.55;           // tall-tile extrusion, in tile units
const LIFT_25 = 0.35;          // billboard lift, in tile units

const BADGE_COLORS = {
  dialog: '#7fd0ff', sign: '#ffd479', read: '#c4a6ff',
  chest: '#ffd479', lever: '#9effa0', use: '#ff9ec4', portal: '#8effe6',
};
const BADGE_GLYPH = {
  dialog: '💬', sign: '▤', read: '❏', chest: '▣', lever: '⌐', use: '✦', portal: '⬡',
};

export class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.cam = { mode: 'top', zoom: 1, panX: 40, panY: 40 };
    this.opts = { grid: true, badges: true, solids: false, structures: true };
  }

  get ts() { return BASE_TS * this.cam.zoom; }
  get yScale() { return this.cam.mode === '2.5d' ? Y_SCALE_25 : 1; }

  // tile coord -> screen (top-left of tile)
  s(x, y) {
    return [this.cam.panX + x * this.ts, this.cam.panY + y * this.ts * this.yScale];
  }
  // screen -> tile coord (floored)
  toTile(px, py) {
    const x = Math.floor((px - this.cam.panX) / this.ts);
    const y = Math.floor((py - this.cam.panY) / (this.ts * this.yScale));
    return { x, y };
  }

  fit(doc) {
    const cw = this.canvas.width, ch = this.canvas.height;
    const zx = cw / (doc.w * BASE_TS + 80);
    const zy = ch / (doc.h * BASE_TS * this.yScale + 80);
    this.cam.zoom = Math.max(0.35, Math.min(2.5, Math.min(zx, zy)));
    this.cam.panX = (cw - doc.w * this.ts) / 2;
    this.cam.panY = (ch - doc.h * this.ts * this.yScale) / 2;
  }

  centerOf(obj) {
    if (obj.kind === 'npc' || obj.kind === 'enemy') return [obj.x, obj.y];
    return [obj.x + 0.5, obj.y + 0.5];
  }

  draw(doc, state = {}) {
    const { ctx } = this;
    const ts = this.ts, ys = this.yScale, is25 = this.cam.mode === '2.5d';
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#1a1c1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // --- ground tiles (and tall extrusions in 2.5d) ---
    const tileProps = []; // tiles that carry a prop (tree/pine) — drawn after ground
    for (let y = 0; y < doc.h; y++) {
      for (let x = 0; x < doc.w; x++) {
        const ch = doc.grid[y * doc.w + x];
        const def = TILDEF[ch];
        if (!def) continue;
        const [sx, sy] = this.s(x, y);
        const tile = tileCanvas(def.tex);
        const tall = is25 && def.tall;
        if (tall) {
          const wallPx = WALL_H * ts * ys;
          ctx.fillStyle = '#0d0e0d';
          ctx.fillRect(sx, sy - wallPx, ts, wallPx + 1);            // side face
          if (tile) ctx.drawImage(tile, sx, sy - wallPx, ts, ts * ys); // raised top
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(sx, sy - wallPx, ts, ts * ys);
        } else if (tile) {
          ctx.drawImage(tile, sx, sy, ts, ts * ys);
        }
        if (def.prop && Art.props[def.prop]) tileProps.push({ x, y, cv: Art.props[def.prop] });
        if (this.opts.solids && def.solid) {
          ctx.fillStyle = 'rgba(255,90,90,0.18)';
          ctx.fillRect(sx, sy, ts, ts * ys);
        }
      }
    }
    // terrain props (trees/pines) as lifted billboards, painter-sorted
    tileProps.sort((a, b) => a.y - b.y);
    for (const tp of tileProps) {
      const px = this.cam.panX + (tp.x + 0.5) * ts;
      const baseY = this.cam.panY + (tp.y + 0.5) * ts * ys;
      const w = ts * 1.3, h = w * (tp.cv.height / tp.cv.width);
      const lift = is25 ? LIFT_25 * ts : 0;
      if (is25) {
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.beginPath();
        ctx.ellipse(px, baseY + (ts * ys) / 2, w * 0.28, ts * ys * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(tp.cv, px - w / 2, baseY + (ts * ys) / 2 - h - lift, w, h);
    }

    // --- grid lines ---
    if (this.opts.grid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= doc.w; x++) {
        const [sx, sy0] = this.s(x, 0); const [, sy1] = this.s(x, doc.h);
        ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx, sy1); ctx.stroke();
      }
      for (let y = 0; y <= doc.h; y++) {
        const [sx0, sy] = this.s(0, y); const [sx1] = this.s(doc.w, y);
        ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
      }
    }

    // --- buildings (houses) + size bounding box ---
    for (const b of doc.buildings) {
      if (this.opts.structures) this.drawBuilding(b, state.selected === b);
      this.dimBox(b.x, b.y, b.w, b.h, `${b.w}×${b.h}`, state.selected === b, '#cdd0cb', !this.opts.structures);
    }

    // --- portals ---
    for (const p of doc.portals) {
      const [sx, sy] = this.s(p.x, p.y);
      ctx.fillStyle = 'rgba(142,255,230,0.22)';
      ctx.fillRect(sx, sy, (p.w || 1) * ts, (p.h || 1) * ts * ys);
      ctx.strokeStyle = state.selected === p ? '#ffd479' : '#8effe6';
      ctx.lineWidth = state.selected === p ? 2.5 : 1.5;
      ctx.strokeRect(sx, sy, (p.w || 1) * ts, (p.h || 1) * ts * ys);
      this.badge(sx + (p.w || 1) * ts - 9, sy + 9, 'portal');
    }

    // --- objects, painter-sorted by y (so 2.5d overlap reads right) ---
    const objs = [...doc.objects].sort((a, b) => this.centerOf(a)[1] - this.centerOf(b)[1]);
    for (const obj of objs) {
      const entry = entryFor(obj);
      const cv = previewCanvas(entry || { previewKind: obj.kind === 'enemy' ? 'enemy' : 'prop', type: obj.type, sprite: obj.sprite });
      const fp = footprintFor(obj);
      const isProp = !(obj.kind === 'npc' || obj.kind === 'enemy');
      const left = isProp ? obj.x : obj.x - 0.5;               // footprint top-left in tiles
      const top = isProp ? obj.y : obj.y - 0.5;
      const px = this.cam.panX + (left + fp.w / 2) * ts;       // footprint center x
      const baseY = this.cam.panY + (top + fp.h) * ts * ys;    // footprint bottom edge
      const w = fp.w > 1 ? fp.w * ts : ts * 1.15;
      const h = cv ? w * (cv.height / cv.width) : ts;
      const lift = is25 ? LIFT_25 * ts : 0;
      const drawX = px - w / 2;
      const drawY = baseY - h - lift;
      // ground shadow
      if (is25) {
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.beginPath();
        ctx.ellipse(px, baseY, w * 0.32, ts * ys * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cv) ctx.drawImage(cv, drawX, drawY, w, h);
      else { ctx.fillStyle = '#8e908e'; ctx.fillRect(drawX, drawY, w, h); }

      // multi-tile footprint bounding box (gates, stalls)
      if (fp.w > 1 || fp.h > 1) this.dimBox(left, top, fp.w, fp.h, `${fp.w}×${fp.h}`, state.selected === obj, '#8effe6', true);

      // selection ring
      if (state.selected === obj) {
        ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2;
        ctx.strokeRect(drawX - 1, drawY - 1, w + 2, h + 2);
      }
      // interactable badge
      if (this.opts.badges && entry?.interactable) {
        this.badge(drawX + w - 5, drawY + 5, entry.badge || 'use');
      }
    }

    // --- hover highlight ---
    if (state.hover && state.hover.x >= 0 && state.hover.y >= 0 && state.hover.x < doc.w && state.hover.y < doc.h) {
      const [hx, hy] = this.s(state.hover.x, state.hover.y);
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 1.5;
      ctx.strokeRect(hx, hy, ts, ts * ys);
    }
  }

  badge(cx, cy, kind) {
    const { ctx } = this;
    const r = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#16181a'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = BADGE_COLORS[kind] || '#fff'; ctx.stroke();
    ctx.fillStyle = BADGE_COLORS[kind] || '#fff';
    ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(BADGE_GLYPH[kind] || '•', cx, cy + 0.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Dashed footprint box + size tag, in tile coords. `fill` shades the area.
  dimBox(tx, ty, w, h, label, selected, color, fill) {
    const { ctx } = this;
    const ts = this.ts, ys = this.yScale;
    const [sx, sy] = this.s(tx, ty);
    const pw = w * ts, ph = h * ts * ys;
    if (fill) { ctx.fillStyle = 'rgba(142,255,230,0.08)'; ctx.fillRect(sx, sy, pw, ph); }
    ctx.strokeStyle = selected ? '#ffd479' : color;
    ctx.lineWidth = selected ? 2 : 1.25;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sx, sy, pw, ph);
    ctx.setLineDash([]);
    // size tag, top-left
    ctx.font = `bold ${8 * this.cam.zoom}px monospace`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(22,24,26,0.85)'; ctx.fillRect(sx + 1, sy + 1, tw + 5, 11);
    ctx.fillStyle = selected ? '#ffd479' : color;
    ctx.fillText(label, sx + 3, sy + 9);
  }

  tile(name) { return Art.tiles[name] || null; }

  // tile a texture canvas across a screen rect (clipped), one cell per `cell` px
  fillTiledAt(tex, x, y, w, h, cell = this.ts) {
    const { ctx } = this;
    if (!tex) { ctx.fillStyle = '#3a3d40'; ctx.fillRect(x, y, w, h); return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let yy = y; yy < y + h; yy += cell)
      for (let xx = x; xx < x + w; xx += cell) ctx.drawImage(tex, xx, yy, cell + 1, cell + 1);
    ctx.restore();
  }

  // Draw a house from a building footprint. Top-down shows the shingled roof
  // sized to the footprint; 2.5d extrudes walls + a raised roof so the volume
  // (and the door/windows on the south face) reads at a glance.
  drawBuilding(b, selected) {
    const { ctx } = this;
    const ts = this.ts, ys = this.yScale, is25 = this.cam.mode === '2.5d';
    const [sx, sy] = this.s(b.x, b.y);
    const wpx = b.w * ts, dpx = b.h * ts * ys;
    const thorn = b.style === 'thorn';
    const wallTex = this.tile(thorn ? 'timber' : 'wall');
    const roofTex = this.tile(thorn ? 'thatch' : 'roof');
    const doorTex = this.tile('door');
    const winTex = this.tile('window');

    if (!is25) {
      this.fillTiledAt(roofTex, sx, sy, wpx, dpx);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, wpx, dpx);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';                  // ridge
      ctx.beginPath(); ctx.moveTo(sx, sy + dpx / 2); ctx.lineTo(sx + wpx, sy + dpx / 2); ctx.stroke();
      if (doorTex && b.door) { const [dx, dy] = this.s(b.door.x, b.door.y); ctx.drawImage(doorTex, dx, dy, ts, ts * ys); }
    } else {
      const wallH = ts * 1.05, frontBase = sy + dpx;
      this.fillTiledAt(roofTex, sx, sy - wallH, wpx, dpx);  // raised roof (footprint)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(sx, sy - wallH, wpx, dpx);
      this.fillTiledAt(wallTex, sx, frontBase - wallH, wpx, wallH); // south wall
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx, frontBase - wallH, wpx, wallH);
      // windows + door on the south wall
      if (winTex) for (const wx of [b.x + 1.2, b.x + b.w - 2.2]) {
        if (wx + 0.8 > b.x && wx < b.x + b.w) ctx.drawImage(winTex, sx + (wx - b.x) * ts, frontBase - wallH * 0.78, ts * 0.7, ts * 0.7);
      }
      if (doorTex && b.door) ctx.drawImage(doorTex, sx + (b.door.x - b.x) * ts + ts * 0.08, frontBase - wallH * 0.72, ts * 0.84, wallH * 0.72);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy - wallH, wpx, dpx + wallH);
    }

    if (b.label) {
      ctx.font = `bold ${9 * this.cam.zoom}px monospace`;
      const tw = ctx.measureText(b.label).width;
      const lx = sx + wpx / 2 - tw / 2 - 3, ly = sy - (is25 ? ts * 1.05 : 0) - 14;
      ctx.fillStyle = 'rgba(22,24,26,0.85)'; ctx.fillRect(lx, ly, tw + 6, 13);
      ctx.fillStyle = '#ffd479'; ctx.fillText(b.label, lx + 3, ly + 10);
    }
    if (selected) {
      ctx.strokeStyle = '#ffd479'; ctx.lineWidth = 2.5;
      ctx.strokeRect(sx - 1, sy - (is25 ? ts * 1.05 : 0) - 1, wpx + 2, dpx + (is25 ? ts * 1.05 : 0) + 2);
    }
  }

  // topmost object whose footprint covers tile (tx,ty); prefers smaller footprints
  objectAt(doc, tx, ty) {
    let best = null, bestArea = Infinity;
    for (const obj of doc.objects) {
      const fp = footprintFor(obj);
      const isProp = !(obj.kind === 'npc' || obj.kind === 'enemy');
      const left = Math.floor(isProp ? obj.x : obj.x - 0.5);
      const top = Math.floor(isProp ? obj.y : obj.y - 0.5);
      if (tx < left || tx >= left + fp.w || ty < top || ty >= top + fp.h) continue;
      const area = fp.w * fp.h;
      if (area <= bestArea) { bestArea = area; best = obj; }
    }
    return best;
  }
}
