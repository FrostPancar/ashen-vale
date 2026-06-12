// ASHEN VALE — visual markers + prompts for map-to-map transitions.
import * as THREE from 'three';
import { Art, PAL, makeCanvas, canvasTexture } from './art.js';
import { makeBillboard } from './world.js';
import { makeLabel } from './entities.js';

/** Short destination names shown on waymarkers. */
export const MAP_NAMES = {
  town: 'ELDERMOOR',
  route1: 'HOLLOW ROAD',
  cave: 'HOLLOW CAVE',
  boss: 'WARDEN\'S CHAMBER',
  ashfall: 'ASHFALL',
  elder_house: 'ELDER HALL',
  inn: 'THE DROWSY LANTERN',
  shop: 'VALE GOODS',
  smithy: 'SMITHY',
  tavern: 'THE GILDED GRYPHON',
  cellar: 'CELLAR',
  armory: 'ARMORY',
  arena: 'THE PIT',
  tabb_house: "TABB'S HOUSE",
};

const ARROW_TILE = (() => {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = PAL[3];
  // chevron pointing up (north); rotated per facing
  ctx.beginPath();
  ctx.moveTo(8, 3);
  ctx.lineTo(13, 10);
  ctx.lineTo(11, 10);
  ctx.lineTo(11, 13);
  ctx.lineTo(5, 13);
  ctx.lineTo(5, 10);
  ctx.lineTo(3, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PAL[0];
  ctx.globalAlpha = 0.35;
  ctx.fillRect(4, 13, 8, 2);
  ctx.globalAlpha = 1;
  return c;
})();

const ARROW_LOCKED = (() => {
  const [c, ctx] = makeCanvas(16, 16);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = PAL[2];
  ctx.fillRect(6, 5, 4, 7);
  ctx.fillRect(5, 7, 6, 4);
  ctx.strokeStyle = PAL[1];
  ctx.lineWidth = 1;
  ctx.strokeRect(5.5, 5.5, 5, 6);
  return c;
})();

function classifyPortal(portal, w, h) {
  const cx = portal.x + portal.w * 0.5;
  const cz = portal.y + (portal.h || 1) * 0.5;
  const m = 2.5;
  if (portal.y <= m) return 'north';
  if (portal.y + (portal.h || 1) >= h - m) return 'south';
  if (portal.x <= m) return 'west';
  if (portal.x + portal.w >= w - m) return 'east';
  if (cz >= h - m - 1) return 'south';
  if (cz <= m + 1) return 'north';
  if (cx <= m + 1) return 'west';
  if (cx >= w - m - 1) return 'east';
  return cz > h * 0.5 ? 'south' : 'north';
}

function markerPos(portal, facing, w, h) {
  const cx = portal.x + portal.w * 0.5;
  const cz = portal.y + (portal.h || 1) * 0.5;
  switch (facing) {
    case 'north': return [Math.min(w - 1.2, Math.max(1.2, cx)), Math.min(h - 1.5, portal.y + (portal.h || 1) + 1.1)];
    case 'south': return [Math.min(w - 1.2, Math.max(1.2, cx)), Math.max(1.2, portal.y - 1.1)];
    case 'west': return [Math.min(w - 1.5, portal.x + portal.w + 1.1), Math.min(h - 1.2, Math.max(1.2, cz))];
    case 'east': return [Math.max(1.2, portal.x - 1.1), Math.min(h - 1.2, Math.max(1.2, cz))];
    default: return [cx, cz - 1.1];
  }
}

function drawGroundMarkers(world, portal, facing, locked) {
  if (!world.groundCtx) return;
  const img = locked ? ARROW_LOCKED : ARROW_TILE;
  const rot = { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 }[facing] || 0;
  for (let ty = portal.y; ty < portal.y + (portal.h || 1); ty++) {
    for (let tx = portal.x; tx < portal.x + portal.w; tx++) {
      world.groundCtx.save();
      world.groundCtx.translate(tx * 16 + 8, ty * 16 + 8);
      world.groundCtx.rotate(rot);
      world.groundCtx.globalAlpha = locked ? 0.55 : 0.82;
      world.groundCtx.drawImage(img, -8, -8);
      world.groundCtx.restore();
    }
  }
  if (world.groundTex) world.groundTex.needsUpdate = true;
}

function makePortalLabel(text, locked) {
  const [c, ctx] = makeCanvas(text.length * 8 + 12, 16);
  ctx.fillStyle = locked ? 'rgba(48,50,48,0.9)' : 'rgba(48,50,48,0.88)';
  ctx.fillRect(0, 0, c.width, 16);
  ctx.fillStyle = locked ? PAL[2] : PAL[3];
  ctx.font = 'bold 10px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 5, 8);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(c.width / 28, 0.48),
    new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.atan2(9.5, 7.5);
  return m;
}

function spawnWaypoint(world, x, z, label, locked, glow) {
  const stone = Art.sprinkles?.milestoneStone;
  if (stone) {
    const m = makeBillboard(stone, 1, 1);
    m.position.set(x, 0, z + 0.15);
    world.group.add(m);
    if (glow && world.glow) world.glow.attach(m, 'shrine');
  }
  const lbl = makePortalLabel(label, locked);
  lbl.position.set(x, 1.35, z + 0.1);
  world.group.add(lbl);
}

function playerInPortal(pos, portal) {
  return pos.x >= portal.x - 0.15 && pos.x < portal.x + portal.w + 0.15 &&
         pos.z >= portal.y - 0.15 && pos.z < portal.y + (portal.h || 1) + 0.15;
}

/**
 * Paint transition markers for every walk-through portal on the current map.
 * @param {import('./world.js').World} world
 * @param {object} def
 * @param {object} flags
 */
export function buildPortalIndicators(world, def, flags) {
  world.portalMarkers = [];
  const { w, h } = def.grid;

  for (const portal of def.portals) {
    // Building entrances on overworld maps already have door labels.
    if (portal.isDoor && !def.interior) continue;

    const dest = MAP_NAMES[portal.to] || portal.to.toUpperCase();
    const locked = !!(portal.requires && !flags?.[portal.requires]);
    const facing = classifyPortal(portal, w, h);
    drawGroundMarkers(world, portal, facing, locked);

    const [mx, mz] = markerPos(portal, facing, w, h);
    const prefix = locked ? 'LOCK ' : '-> ';
    spawnWaypoint(world, mx, mz, `${prefix}${dest}`, locked, !locked);

    world.portalMarkers.push({
      portal,
      label: dest,
      locked,
      facing,
      x: portal.x,
      y: portal.y,
      w: portal.w,
      h: portal.h || 1,
    });
  }
}

/** Nearest portal transition the player is standing on. */
export function findActivePortal(world, playerPos) {
  for (const m of world.portalMarkers || []) {
    if (playerInPortal(playerPos, m.portal)) return m;
  }
  return null;
}
