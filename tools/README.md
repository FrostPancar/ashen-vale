# Dev tools

## Pixel art generator

AI-assisted prop creator for `src/art.js`. Enter an object name, get 4 ASCII sprite variants in the game's 4-shade format, preview them, and copy paste-ready `const` blocks.

**Run:** `npm run pixel-gen` (opens the tool), or start `npm run dev` and open http://localhost:5173/tools/pixel-generator/

**API key:** set `CURSOR_API_KEY` in `.env` (uses your [Cursor subscription credits](https://cursor.com/dashboard/usage)), or paste a key from [Dashboard → Integrations](https://cursor.com/dashboard/integrations). Optional override saved to browser localStorage.

**Files** (`tools/pixel-generator/`):

- `index.html` — page shell
- `style.css` — UI (matches sprite viewer)
- `main.js` — form, preview, clipboard
- `api.js` — Cursor SDK agent call + validation (Vite dev middleware)
- `prompt.js` — style/system prompts with game examples
- `validate.js` — row sanitization + JS const formatting

After picking a variant, paste the `const` into `src/art.js`, register it in `Art.init()` (`this.props.foo = asciiCanvas(FOO)`), and verify in the sprite viewer.

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
