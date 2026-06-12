# ASHEN VALE

A 90's monochrome (4-shade gray palette) top-down action RPG demo — Zelda-like exploration and
puzzles, Diablo-like classes / loot / skills, rendered in 2.5D with Three.js, with built-in
online co-op. Every sprite, tile, texture, and sound is generated procedurally at runtime —
zero asset files.

## Run it

```bash
npm install
npm run dev        # game client  -> http://localhost:5173
npm run server     # co-op server -> ws://localhost:8081  (optional, only for online co-op)
```

Open `http://localhost:5173`, choose a **save slot**, pick a class (or continue), then **PLAY SOLO**
or **PLAY CO-OP**.

## Co-op (2–4 players)

1. **Start the relay** — `npm run server` (listens on `ws://localhost:8081`)
2. **Host** — pick a save slot → **PLAY CO-OP** → enter a **room name** and **hero name**
3. **Guests** — same room name on their machine; load their own save slot first
4. **Over the internet** — host runs the server and shares their public IP + port `8081`
   (optional custom URL in the SERVER field, e.g. `ws://203.0.113.10:8081`)

### What syncs vs what stays personal

| Shared (follows **host**) | Personal (each player) |
| --- | --- |
| Main quest stage & world gates | Level, XP, gold, gear |
| Levers, boulders, boss flags | Side quests & bell charms |
| Chest *open* state (first opener gets curated loot) | Mob drops, gold piles (instanced) |
| Map travel when using portals (party must stay within 4 tiles) | Save slot progress |

- **First joiner** in a room is the **host** (simulates enemies). If the host leaves, another
  player is promoted automatically.
- **Guests warp to the host** on join. Stay on the same map; portals require the whole party nearby.
- If the server is down or the room is full (4 players), the game continues **solo** with a notice.

See [Co-op architecture](#co-op-architecture) below for technical details.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| LEFT CLICK | Basic attack (aimed at cursor) |
| RIGHT CLICK | Skill 1 (aimed at cursor) |
| SPACE | Skill 2 |
| SHIFT | Mobility skill (Shield Rush / Tumble / Blink) |
| E / Enter | Talk · interact · push boulders · advance dialog |
| Q | Drink Vale Tonic (potion) |
| I | Inventory & equipment |
| K | Skills & skill points |
| ESC | Close menus |

## The demo

- **Eldermoor** — starting town: 4 enterable buildings (Elder Hall, Inn, Shop, Smithy),
  wandering NPCs, a tutorial quest chain, training yard, shops, and an inn that heals you.
- **The Hollow Road** — route to the second town: slimes, bats and husks, tall-grass
  ambush fields, a river bridge, a boulder-push puzzle hiding a rare chest, and a
  lever-gate guarding the cave.
- **Hollow Cave** — darkness lit by your torchlight, shades and husks, a two-rune-lever
  puzzle (one lever buried behind boulders, one guarded) that opens the Warden's Vault.
- **The Stone Warden** — tutorial boss with telegraphed AOE slams, add summons at
  66%/33% HP, and an enrage. Drops a rare class weapon; the vault chest holds the
  named milestone trophy (Warden's Toll / Bellshot / Last Light Staff).
- **Ashfall** — the second city, unlocked by beating the Warden. A walled stone town
  with a plaza, market stalls, a memorial garden, and four enterable buildings:
  - **The Gilded Gryphon** (tavern) — rest, a bard, and a rat-infested cellar to clear.
  - **Ashfall Armory** — Kettle sells rare-tier gear, a clear step up from Eldermoor.
  - **The Pit** (arena) — pay 10g, survive 3 waves, carry out gold + a rare. Repeatable.
  - **Tabb's House** — cozy; her cat Whiskers is missing somewhere in the city.
- **Ashfall side content** — 4 side quests (The Courier, Pest Control, The Lost Cat,
  Chime Fishing), a timing-based fishing minigame at both ponds, 5 hidden bell charms
  that feed a shrine reward, and cozy interactions everywhere (benches, beds, fireplaces,
  pettable cat).

## Diablo layer

- 3 classes — **Knight** (Cleave / Whirlwind / Shield Rush), **Ranger** (Power Shot /
  Multishot / Tumble), **Mage** (Spark Bolt / Nova / Blink), each with a distinct basic attack
  and a SHIFT mobility skill.
- Loot with rarities (Common / Magic / Rare — Legendary reserved for post-demo content)
  and rolled affixes: damage, life,
  mana, defense, move speed, crit, life-on-hit, cooldown reduction.
- XP, levels, skill points, 5 skill ranks per skill, gold, potions, shops, instanced loot
  in co-op (everyone gets their own drops).
- Progress auto-saves to **3 local save slots** (per-slot `localStorage`).

## Co-op architecture

- `server.js` — tiny `ws` room relay (max **4** players per room). First member is **host**.
- Host simulates enemy AI (~8Hz sync); guests send hits to the host. Enemies scale with party
  size (+60% HP / +15% damage per extra player).
- World events (levers, gates, boulders, Warden death, chest opens) relay to all clients;
  **mob loot and XP** roll per player who damaged the enemy.
- **Warden vault** — each fighter claims their own class trophy once (`CLAIM VAULT`).
- **Host migration** on disconnect; solo fallback if the relay is unreachable.

## Tech

- Three.js perspective camera at a Pokémon-style pitch; characters/props are tilted
  billboard sprites over a 3D world (extruded buildings, instanced cave walls, fog,
  per-map lighting, torch flicker in caves, particles, screen shake, scanline overlay).
- All pixel art generated on `<canvas>` in a 4-shade monochrome gray palette (see `style.css`).
- Music & SFX are WebAudio chiptune, sequenced at runtime (town / route / cave / boss themes).

## Dev tools

With `npm run dev` running:

| Tool | URL |
| --- | --- |
| Game | http://localhost:5173/ |
| Sprite viewer | http://localhost:5173/tools/sprite-viewer/ |
| Sprite viewer (shortcut) | http://localhost:5173/sprite-viewer.html |

Run `npm run viewer` to open the sprite viewer directly.

## Design docs

Full index: [`docs/README.md`](./docs/README.md)

| Doc | Summary |
| --- | --- |
| [NPC Voice](./docs/design/NPC_VOICE.md) | Dialog tone, cast sheet, writing checklist |
| [Items & Loot](./docs/design/ITEMS_AND_LOOT.md) | Loot pipelines, shops, difficulty curve |
| [World Areas](./docs/design/WORLD_AREAS.md) | Towns, routes, biomes, sprinkle system |
| [Tech Demo Roadmap](./docs/TECH_DEMO_ROADMAP.md) | Prioritized polish plan for the v0.1 vertical slice |
