// ASHEN VALE — custom map loader.
//
// Maps authored in the Map Builder (tools/map-builder/) export a JSON blob in
// the `ashen-vale-map@1` schema. Drop those files into src/maps/custom/*.json
// and they are auto-registered into the live game — terrain, props, NPCs,
// portals, enemies and any authored dialog — with no edits to maps.js.
//
// The JSON shape mirrors what buildAllMaps() produces, except the grid is
// stored as an array of row strings (`rows`) instead of a flat `grid.d` array,
// and authored interactable dialog lives in a `dialogs` map keyed by dialog id.

export const CUSTOM_MAP_SCHEMA = 'ashen-vale-map@1';

/** Rebuild the flat tile grid the game expects from row strings. */
function gridFromRows(rows, w, h, fill = '.') {
  const W = w || Math.max(0, ...rows.map(r => r.length));
  const H = h || rows.length;
  const d = new Array(W * H).fill(fill);
  for (let y = 0; y < H; y++) {
    const row = rows[y] || '';
    for (let x = 0; x < W; x++) d[y * W + x] = row[x] || fill;
  }
  return { w: W, h: H, d };
}

/** Convert one exported JSON object into a runtime map definition. */
export function mapFromJSON(json) {
  if (!json || typeof json !== 'object') throw new Error('custom map: not an object');
  if (json.schema && json.schema !== CUSTOM_MAP_SCHEMA) {
    console.warn(`custom map "${json.id}": unknown schema ${json.schema}, attempting load anyway`);
  }
  const grid = json.grid?.d
    ? json.grid                                   // already flat (round-tripped)
    : gridFromRows(json.rows || [], json.w, json.h, json.interior ? (json.floor || 'o') : '.');
  return {
    id: json.id,
    name: json.name || json.id,
    grid,
    ambient: json.ambient || (json.interior ? 'interior' : 'day'),
    music: json.music || 'town',
    interior: !!json.interior,
    buildings: json.buildings || [],
    portals: json.portals || [],
    props: json.props || [],
    npcs: json.npcs || [],
    enemies: json.enemies || [],
    custom: true,
  };
}

/**
 * Turn an authored dialog entry into the (g) => conversation function the game
 * calls. Authored dialogs are static page lists with an optional shop service.
 * Stage-gated / scripted dialog still belongs in quests.js — this covers the
 * common "NPC says some lines, maybe opens a shop" case so custom NPCs work
 * out of the box.
 */
function dialogFnFromAuthored(entry) {
  const pages = Array.isArray(entry) ? entry : (entry.pages || []);
  const shop = Array.isArray(entry) ? undefined : entry.shop;
  return () => {
    const conv = { pages: pages.map(p => ({ name: p.name || '', text: p.text || '' })) };
    if (shop) conv.shop = shop;
    return conv;
  };
}

/**
 * Merge one or more exported map JSON objects into the game's `maps` registry
 * and `DIALOGS` table. Existing ids are not overwritten unless `overwrite` is set.
 * Returns the list of ids that were added.
 */
export function registerCustomMaps(maps, DIALOGS, jsonList, { overwrite = false } = {}) {
  const added = [];
  for (const json of [].concat(jsonList || [])) {
    if (!json || !json.id) continue;
    if (maps[json.id] && !overwrite) {
      console.warn(`custom map "${json.id}" collides with an existing map — skipped`);
      continue;
    }
    maps[json.id] = mapFromJSON(json);
    for (const [key, entry] of Object.entries(json.dialogs || {})) {
      if (DIALOGS[key] && !overwrite) continue;
      DIALOGS[key] = dialogFnFromAuthored(entry);
    }
    added.push(json.id);
  }
  return added;
}

/**
 * Auto-load every JSON file under src/maps/custom/ and register it.
 * Uses Vite's import.meta.glob so new files are picked up on the next build/dev
 * reload with zero wiring. Call once after buildAllMaps().
 *
 * Custom maps take priority: a custom map sharing an id with a built-in map
 * REPLACES it, so portals (and every other `maps[id]` load) use the custom
 * version. Pass { overwrite: false } to keep built-ins instead.
 */
export function applyCustomMaps(maps, DIALOGS, { overwrite = true } = {}) {
  let modules = {};
  try {
    // eager glob — resolved at build time by Vite, no-op under plain node.
    modules = import.meta.glob('./maps/custom/*.json', { eager: true });
  } catch {
    return [];
  }
  const list = Object.values(modules).map(m => m.default ?? m);
  return registerCustomMaps(maps, DIALOGS, list, { overwrite });
}
