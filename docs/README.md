# ASHEN VALE — Documentation

Design and world-building references for the demo. Read these before adding content.

## Design guides

| Doc | Purpose |
| --- | --- |
| [Tech Demo Roadmap](./TECH_DEMO_ROADMAP.md) | Prioritized plan to polish the v0.1 vertical slice |
| [NPC Voice](./design/NPC_VOICE.md) | Tone, language, cast sheet, and dialog checklist |
| [Items & Loot](./design/ITEMS_AND_LOOT.md) | Item system, loot pipelines, shops, difficulty curve |
| [World Areas](./design/WORLD_AREAS.md) | Major regions, micro-patches, sprinkle system for maps |

## Dev tools

| Tool | URL (with `npm run dev`) | Location |
| --- | --- | --- |
| **Game** | http://localhost:5173/ | `/index.html` |
| **Sprite viewer** | http://localhost:5173/tools/sprite-viewer/ | [`tools/sprite-viewer/`](../tools/sprite-viewer/) · `npm run viewer` |
| **Sprite viewer (shortcuts)** | `/sprite-viewer.html` or `/sprite-viewer/` | Both redirect to `/tools/sprite-viewer/` |
| **Co-op server** | ws://localhost:8081 | `server.js` (run `npm run server`) |

**Sprite viewer categories:** chars, enemies, props, **sprinkles** (35 prop sprites), **patches** (62 composed stamps), **areas** (17 region icons), **biomes** (8 tile variants), icons, tiles.

## Project layout

```
MonsterBattler/
├── README.md              ← start here (run, controls, demo overview)
├── docs/                  ← you are here
│   └── design/            ← game design source-of-truth files
├── tools/
│   └── sprite-viewer/     ← browse procedural sprites & tiles
├── src/                   ← game source (art, maps, main loop)
├── index.html             ← game entry
└── server.js              ← co-op relay
```
