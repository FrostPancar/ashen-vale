# ASHEN VALE — Tech Demo Roadmap

A prioritized plan to take the current v0.1 build from **playable prototype** to **polished early-game tech demo** — one complete vertical slice where a new player can learn, explore, fight, loot, quest, and linger in Ashfall without hitting dead ends, mismatched rewards, or empty-feeling maps.

**Scope:** everything in the existing demo arc (Eldermoor → Hollow Road → Cave → Warden → Ashfall). Post-demo expansion (new regions, Legendary tier, procedural map gen) is listed only as *future hooks*.

**Related docs:** [Items & Loot](./design/ITEMS_AND_LOOT.md) · [World Areas](./design/WORLD_AREAS.md) · [NPC Voice](./design/NPC_VOICE.md)

---

## What “great” looks like

A first-time player should be able to:

1. **Start** — pick a class, understand controls, and feel the monochrome world immediately.
2. **Learn** — complete the Elder tutorial chain without confusion (dummies → weapon → road briefing).
3. **Explore** — find secrets, puzzles, and cozy spots that reward curiosity.
4. **Fight** — feel class identity in combat; enemies ramp difficulty along the route.
5. **Loot** — get meaningful gear upgrades from chests, drops, shops, and milestones.
6. **Progress** — beat the Warden, see a payoff moment, and unlock Ashfall.
7. **Linger** — do side quests, fish, fight in the Pit, hunt charms, rest at inns — the “Animal Crossing in a gray vale” fantasy.

Co-op should be a **bonus layer**, not required — but two players in the same room should not desync on levers, gates, or boss state.

---

## Current state (v0.1)

### ✅ In place

| System | Status | Code |
| --- | --- | --- |
| 3 classes + skills + hotbar | Working | `skills.js`, `ui.js` |
| Inventory, equip, rarities, affixes | Working | `items.js`, `ui.js` |
| 14 maps + interiors | Hand-authored | `maps.js` |
| Tutorial quest chain (stages 0–6) | Working | `quests.js`, `main.js` |
| 4 Ashfall side quests + bell shrine | Working | `quests.js`, `main.js` |
| Fishing + Pit arena minigames | Working | `main.js` |
| Boss fight (Stone Warden) | Working | `entities.js`, `main.js` |
| Save / continue (`localStorage`) | Working | `main.js` |
| Co-op relay (host-authoritative) | Working | `server.js`, `net.js` |
| Procedural art (chars, props, icons, sprinkles, patches) | Generated at runtime | `art.js`, `areaArt.js` |
| Per-item icon variants | Recent pass | `art.js`, `items.js` |
| Design docs (loot curve, world spec, voice) | Strong | `docs/design/` |
| Sprite viewer dev tool | Working | `tools/sprite-viewer/` |

### ⚠️ Gaps blocking “demo quality”

| Gap | Impact | Notes |
| --- | --- | --- |
| **Chest loot ≠ design spec** | Puzzle/boss rewards feel random | ~~`maps.js` chest `loot:` strings don't match [ITEMS_AND_LOOT.md](./design/ITEMS_AND_LOOT.md) §4C~~ **Fixed (Phase 0)** |
| **Sprinkle art not placed in maps** | Towns/routes feel sparse vs. design intent | ~~Only core props placed~~ **Hand-placed via `worldSprinkles.js`** |
| **No sprinkle pipeline** | Can't scale cozy density | ~~Not implemented~~ **`worldSprinkles.js` + `stampPatch` in place** |
| **README vs. code mismatch** | Player expectation break | ~~README says Warden drops Legendary~~ **Fixed (Phase 0)** |
| **Biome tiles unused in live maps** | Visual variety on paper only | `marsh`, `mossfloor`, `bellstone`, etc. in `areaArt.js`, not in `TILDEF` / maps |
| **Guard = knight reskin** | NPC visual sameness | `art.js` `buildCharFrames('knight')` for guard |
| **Area icon row lengths** | Some icons render cropped | ~~Several `AREA_ICONS` rows ≠ 16 chars~~ **Fixed (Phase 0)** |
| **Docs sprite counts stale** | Dev confusion | `docs/README.md` says 35 sprinkles / 62 patches; code has more |
| **`key` icon unused** | Dead art | Defined in `ICONS`, no gameplay reference |

---

## Prioritized roadmap

### Phase 0 — Correctness & spec alignment *(1–2 days)*

Fix things that are **implemented wrong** relative to the design docs. Highest ROI for demo feel.

- [x] **Align chest loot with ITEMS_AND_LOOT.md** (`maps.js`)
  - `town_chest` → `bundle:gold:18-28|potion:1|item:trinket:common`
  - `route_chest1` (boulder puzzle) → `milestone:road_keeper`
  - `route_chest2` → `bundle:gold:35-50|item:trinket:magic:spd+crit`
  - `route_chest3` → `bundle:potion:2|item:armor:magic:hp+def`
  - `cave_chest1` / `cave_chest2` → curated bundles per spec
  - `boss_chest` → `bundle:milestone:warden_trophy|potion:2|gold:30-45` (not `item:legendary`)
- [x] **Reconcile README** — Warden drop described as Rare milestone, not Legendary
- [x] **Verify boss chest reveal** — hidden until Warden dead; milestone item class-matched (`main.js` `revealBossChest`, `ifFlag: warden_dead`)
- [x] **Audit `resolveLootSpec` paths** — run through every chest once per class in a test save
- [x] **Fix `AREA_ICONS` row widths** — normalize all rows to 16 chars (`areaArt.js`)

**Done when:** A full playthrough's chest rewards match the loot doc; no Legendary drops in demo.

---

### Phase 1 — Core loop polish *(2–4 days)*

Make the **Zeldiablo loop** feel tight: fight → loot → equip → notice you're stronger.

- [x] **Loot feedback**
  - Rare pickup toast + beam already exist; add distinct SFX pitch per rarity (`audio.js`)
  - Compare tooltip on first magic/rare equip in inventory
- [x] **Shop clarity**
  - Show stat preview vs. equipped item in shop rows (`ui.js`)
  - Tag Bram's rare weapon row when it unlocks at level 2
- [x] **Skill panel UX**
  - Show current rank (e.g. `Cleave III/IV`) and next-rank effect (`ui.js`, `skills.js`)
  - Gray out skills at max rank; show SP cost on hover
- [x] **Quest tracker**
  - Stage 6 “roam Ashfall” should checklist side quests (Courier, Rats, Cat, Fish, Charms, Pit win) — partial today via `sideLines` in `main.js`; make it scannable
  - Compass hints already in dialog; add `[!]` pulse on tracker when objective is in current map
- [x] **Death / respawn**
  - Respawn position: town fountain, keep loot — verify co-op guests respawn correctly
- [x] **Ashfall arrival moment**
  - End screen exists; add brief camera hold + music sting on first `ashfall` load (`main.js` ~L186)
- [x] **Potion economy sanity pass**
  - Confirm ~3g/kill vs 12g tonic pricing feels fair through Route 1 + Cave without farming

**Done when:** A playtester can explain their build (weapon + 2 affixes) and knows what to do next at every quest stage.

---

### Phase 2 — World density & cozy feel *(4–7 days)*

The biggest visual/ambient gap: **sprinkle art exists but maps don't use it.**

- [x] **Hand-place Section 6 sprinkles** ([WORLD_AREAS.md](./design/WORLD_AREAS.md) §6) on existing maps first — no codegen yet
  - Eldermoor: laundry line, patio, herb garden, bulletin board, community garden, flower box, boot scraper
  - Hollow Road: graveyard cluster, rain pool, overturned cart, milestone, campfire, bridge shrine, trash heap
  - Hollow Cave: miner's lunch, candle row, flooded niche, echo mark
  - Ashfall: market spill, alley laundry, memorial bench, pit chalk, guard post, snail trail, shrine nook
- [x] **Wire patch props into `world.js`** — sprinkle prop types via `_spawnSprinkle` + `_attachGlowKind`
- [x] **Implement `src/worldSprinkles.js` (minimal)**
  - Data shape from WORLD_AREAS §5.1
  - `applyMapSprinkles()` — stamp tiles + merge props from `PATCH_DEFS`
  - BFS reachability check before accepting a stamp (`validateStamp`)
- [x] **Density pass per major type** — hit targets from WORLD_AREAS §5.5 (8–14 sprinkles / 100 tiles in hamlets, etc.)
- [x] **Interact hooks on cozy props**
  - Bulletin board → 2–3 rotating quest stubs / lore lines
  - Bench / bed / fireplace heal values already in loot doc — verify all placed instances work
  - Echo mark → one-shot audio gag

**Done when:** Eldermoor and Ashfall feel “lived-in” at a glance; Route 1 has discoverable landmarks between fights.

---

### Phase 3 — Presentation & onboarding *(2–3 days)*

Help strangers at a conference booth **get it in 60 seconds.**

- [ ] **Title screen**
  - One-line pitch under subtitle (“Zelda exploration · Diablo loot · co-op optional”)
  - Class cards: one skill line each (already partial)
- [ ] **First-run hints** (dismiss after stage 2)
  - After Elder stage 0: “Training yard → south-east”
  - After weapon: “Press I to equip”
  - On Route 1 entry: “Tall grass hides ambushes”
- [ ] **Map title card** — brief area name fade on portal (`ui.js`, already have `#hud-area-name`)
- [ ] **Interact prompt polish** — consistent `[E]` labels; show distance fade
- [ ] **Minigame UX**
  - Fishing: visual bite indicator (not text-only)
  - Pit: wave counter + between-wave countdown on HUD
- [ ] **Unique guard NPC sprite** — not knight reskin (`art.js`)
- [ ] **Fishing / arena results screen** — small summary panel (gold earned, items)

**Done when:** Someone with no README can reach Bram's forge in under 5 minutes.

---

### Phase 4 — Co-op hardening *(2–3 days)*

Co-op is a demo differentiator — it should **not** embarrass us in a live session.

- [ ] **Flag sync audit** — levers, gates, boulders, `warden_dead`, chest flags, charm flags, quest flags (`net.js`, `shareableFlags()`)
- [ ] **Guest loot instancing** — verify `enemyDie` rolls per-client drops; no double-spend on chests
- [ ] **Host migration** — document behavior when host leaves; test guest promotion
- [ ] **Boss fight co-op** — Warden adds scale with 2 players? (optional tuning in `ENEMY_TYPES`)
- [ ] **UI: peer names** — show co-op partner on HUD (`coop-status` exists; add peer HP or map ping)
- [ ] **Connection failure UX** — graceful solo fallback message (partial today)

**Done when:** Two clients complete Route 1 → Cave → Warden without desync; each gets own loot.

---

### Phase 5 — Demo packaging *(1–2 days)*

Make it easy to **show, share, and reset.**

- [ ] **“Demo path” script** — internal checklist: 45-min full clear with expected levels/gear at each beat (from ITEMS_AND_LOOT §5)
- [ ] **Reset save** button on title screen (clear `ashen_vale_save_v1`)
- [ ] **Update `docs/README.md`** — sprite counts, link this roadmap
- [ ] **Build size** — `art.js` bundle ~560KB; consider lazy-init for sprite viewer only (game already init-on-load)
- [ ] **Deploy notes** — Vercel/static host for client + separate WS server instructions
- [ ] **Known issues list** in README (browser support, co-op requires same network)

**Done when:** You can hand someone a URL + room name and run a rehearsed demo without surprises.

---

## Early-game feature matrix

Use this as the **completeness checklist** for the tech demo scope.

| Feature | Eldermoor | Route 1 | Cave | Boss | Ashfall | Priority fix |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Movement + camera | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Basic attack + aim | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| 3 skills + mobility | ✅ | ✅ | ✅ | ✅ | ✅ | Skill rank UX |
| Enemies + XP | dummies | slimes/bats/husks | shades/husks | Warden | rats (cellar) | — |
| Loot drops | — | ✅ | ✅ | ✅ | Pit waves | — |
| Chests (curated) | ✅ | ✅ | ✅ | ✅ | ✅ cellar | — |
| Shops | Posy, Bram | — | — | — | Kettle | Shop compare UI ✅ |
| Inn rest | Het | — | — | — | Tilly | — |
| Inventory / equip | ✅ | ✅ | ✅ | ✅ | ✅ | Compare tooltips ✅ |
| Main quest chain | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Side quests | — | — | — | — | 4 + shrine | Checklist UI ✅ |
| Puzzles | — | boulder, lever | dual levers | — | cat hide | — |
| Minigames | — | — | — | — | fish, Pit | HUD polish |
| Cozy interact | bench, bed | grave | — | — | many props | — |
| Save / continue | ✅ | ✅ | ✅ | ✅ | ✅ | Reset button |
| Co-op | ✅ | ✅ | ✅ | ⚠️ | ✅ | Phase 4 audit |
| Audio (music + SFX) | ✅ | ✅ | ✅ | ✅ | ✅ | Rarity pickup SFX ✅ |
| Map sprinkles | ✅ placed | ✅ placed | ✅ placed | — | ✅ placed | — |

---

## Suggested execution order

```
Phase 0  Correctness          ██████████  Complete
Phase 1  Core loop polish     ██████████  Complete
Phase 2  World density        ██████████  Complete
Phase 3  Onboarding           ███░░░░░░░  Before any public demo
Phase 4  Co-op hardening      ████░░░░░░  Before showcasing multiplayer
Phase 5  Packaging            ██░░░░░░░░  Last — documents what shipped
```

**Recommended milestone:** **“Demo Alpha”** = Phase 0 + Phase 1 + hand-placed sprinkles for Eldermoor & Ashfall only.  
**“Demo Beta”** = all phases through 4 on Route 1 + Cave.  
**“Demo Ready”** = all phases + rehearsed 45-min run logged.

---

## Success criteria (demo ready)

- [ ] New player reaches Ashfall in ~30–45 minutes without external help
- [x] Every puzzle chest pays the documented curated bundle (class-aware milestones)
- [ ] At least **8 cozy micro-patches** visible in Eldermoor and **10** in Ashfall without hunting
- [ ] All 4 side quests + bell shrine completable; tracker reflects progress
- [ ] Pit repeatable; fishing works at both ponds; inn rest works in both towns
- [ ] Co-op: 2 players beat Warden with synced gates/levers and separate loot
- [x] No Legendary drops in normal demo flow; README matches behavior
- [ ] Save/continue works across browser refresh; reset available on title screen

---

## Future hooks (post-demo — do not block v0.1)

These are **explicitly out of scope** for the early-game tech demo but already teased in code or docs:

| Hook | Where teased |
| --- | --- |
| Legendary tier + post-Ashfall gear | `items.js` `legendary.weight: 0` |
| Procedural map templates (`gen_hamlet`, etc.) | WORLD_AREAS §7 |
| New biomes on live maps (marsh, bell ruins) | `areaArt.js` biomes |
| Temple, library, guild interiors | WORLD_AREAS §2.2 |
| `worldSprinkles.js` full codegen | WORLD_AREAS §5 |
| Guard/post unique NPC roster expansion | NPC_VOICE cast sheet |
| Key item / locked doors | `ICONS.key` unused |

---

## Maintenance rule

When shipping roadmap items that touch tuning or content:

1. Update the matching design doc in the same change ([ITEMS_AND_LOOT](./design/ITEMS_AND_LOOT.md), [WORLD_AREAS](./design/WORLD_AREAS.md)).
2. Verify in sprite viewer if adding new prop types.
3. Add a line to this doc's **Current state** section when a phase completes.

---

*Last updated: Jun 2026 — Phases 0–2 complete; Demo Alpha next (onboarding + packaging).*
