# Dev tools

## Sprite viewer

Browse every procedural sprite, tile, and icon from `src/art.js`.

**Run:** `npm run viewer` (opens the viewer), or start `npm run dev` and open any URL below.

| URL | Notes |
| --- | --- |
| http://localhost:5173/tools/sprite-viewer/ | Canonical |
| http://localhost:5173/sprite-viewer.html | Redirect → canonical |
| http://localhost:5173/sprite-viewer/ | Redirect → canonical |

**Files** (`tools/sprite-viewer/`):

- `index.html` — page shell
- `style.css` — viewer UI
- `main.js` — gallery logic (imports `@/art.js` → `src/art.js`)

Copy PNG, zoom, filter by category (chars, enemies, props, **sprinkles**, **patches**, **areas**, **biomes**, tiles, icons).

- **Sprinkles** — individual micro-patch prop sprites (`Art.sprinkles`)
- **Patches** — full composed stamp previews from `WORLD_AREAS.md` (`Art.patches`), filterable by group
- **Areas** — major region type icons (`Art.areas`)
- **Biomes** — biome floor tile variants (`Art.biomes`)
