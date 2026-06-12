# ASHEN VALE — World Areas & Sprinkle System

Source of truth for **major regions** (towns, routes, caves, biomes) and **minor micro-areas**
(graveyards, patios, rain pools, market spillover, etc.) that get hand-placed or procedurally
sprinkled into larger maps.

Tone: fantasy RPG stakes + cozy-life warmth (Animal Crossing energy: the world is lived-in,
slightly messy, and worth lingering in). The vale is gray and tired, not grimdark — even the
trash heap has a story.

---

## 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **Major area** | A loadable map with its own id, music, ambient, portals — e.g. `town`, `route1`, `ashfall`. |
| **Major type** | Category tag on a major area — e.g. `hamlet`, `forest_route`, `limestone_cave`. |
| **Micro-patch** | A small authored or procedural stamp (typically 3×3 to 12×8 tiles) placed inside a major area. |
| **Sprinkle** | One instance of a micro-patch at a world coordinate, optionally with props/NPC hooks. |
| **Anchor** | Where a sprinkle is allowed to attach — `road_edge`, `building_backyard`, `plaza_corner`, etc. |
| **Biome tag** | Environmental flavor that filters which micro-patches and scatter rules apply. |

---

## 2. Major area types

### 2.1 Settlements *(cozy density ↑, combat usually off)*

| Type | Scale | Fantasy role | Cozy hook | Demo status |
| --- | --- | --- | --- | --- |
| **Hamlet** | 30–50 tiles | Last hearth before the wild | Everyone knows your name by day two | **Eldermoor** (`town`) |
| **Market town** | 40–60 | Trade crossroads, guild stalls | Bulletin board drama, fish on clotheslines | — |
| **Walled city** | 40–55 | Garrison + commerce | Fountain gossip, rooftop laundry | **Ashfall** (`ashfall`) |
| **Fortress-town** | 50–70 | Siege-ready, civilian quarter inside walls | Soup lines, shrine queues | — |
| **Port / river town** | 45–65 | Barges, tolls, smugglers | Dock cats, rope coils, gull arguments | — |
| **Mining camp** | 35–50 | Ore, lung-dust, superstition | Lunch pails, betting on beetles | — |
| **Pilgrim village** | 30–45 | Shrine road terminus | Candle stubs, donation shoes | — |
| **Ruined settlement** | 40–60 | Abandoned but not empty | Moss mailboxes, one stubborn resident | — |
| **Caravan rest** | 25–40 | No buildings, just rings of fire pits | Shared stew pot, story hour | — |

### 2.2 Interiors *(enterable, `interior: true`)*

| Type | Role | Demo status |
| --- | --- | --- |
| **Civic hall** | Quest hub, records | Elder Hall (`elder_house`) |
| **Inn / tavern** | Rest, gossip, cellar quests | Inn, Gilded Gryphon (`inn`, `tavern`) |
| **Shop** | Consumables, curios | Vale Goods (`shop`) |
| **Smithy / armory** | Weapons, upgrades | Smithy, Armory (`smithy`, `armory`) |
| **Home** | Side quests, pettable cat | Tabb's House (`tabb_house`) |
| **Arena** | Minigame combat | The Pit (`arena`) |
| **Cellar / basement** | Pest quests, rats, loot | Gryphon Cellar (`cellar`) |
| **Temple / shrine** *(planned)* | Turn-ins, blessings | — |
| **Library / archive** *(planned)* | Lore, skill tomes | — |
| **Guild hall** *(planned)* | Class quests, trophies | — |

### 2.3 Overworld connectors *(combat ramps up with distance)*

| Type | Role | Cozy hook | Demo status |
| --- | --- | --- | --- |
| **Forest route** | Tree borders, ambush grass | Wayside shrines, overturned carts | **Hollow Road** (`route1`) |
| **Cliff route** | Ledges, gates, vistas | Milestone stones, wind chimes | partial on `route1` |
| **River crossing** | Bridge, sandbars | Fishing spots, rain pools | bridge on `route1` |
| **Badlands route** | Sand, ash scrub, sparse trees | Bone cairns, barbed wire | Ashfall gate approach |
| **King's highway** *(planned)* | Wide paved, patrols | Toll booths, mile markers | — |
| **Goat path** *(planned)* | Narrow, shortcuts | Snail trails, mushroom rings | — |
| **Haunted lane** *(planned)* | Low visibility, whispers | Offering bowls, scarecrow | — |

### 2.4 Underground & danger zones

| Type | Role | Demo status |
| --- | --- | --- |
| **Limestone cave** | Puzzles, pools, shades | **Hollow Cave** (`cave`) |
| **Boss vault** | Capstone fight | **Warden's Vault** (`boss`) |
| **Flooded grotto** *(planned)* | Water tiles, bats, boat | — |
| **Catacombs** *(planned)* | Graves, husks, lever chains | — |
| **Mine shaft** *(planned)* | Verticality, carts, collapse | — |
| **Sewers** *(planned)* | Rats++, urban underbelly | cellar is a preview |
| **Echo well** *(planned)* | Sound puzzle, vertical drop | — |

### 2.5 Biomes *(regional flavor — often spans multiple maps)*

These are **tags**, not always separate maps. A route can pass through two biomes.

| Biome | Palette feel | Scatter bias | Threat |
| --- | --- | --- | --- |
| **Vale meadow** | grass / grass2 / flower | trees `#`, bushes `h`, tallgrass `,` | low |
| **Hollow thornwood** | grass2, dense `#`/`^` | fallen logs, spider silk | medium |
| **Ash scrub** | sand `s`, sparse `#` | cinders, wire, bone | medium |
| **Bone marsh** *(planned)* | water `w`, reeds | will-o wisps, sunken paths | medium-high |
| **Salt flats** *(planned)* | sand, cracked path | mirage pools, bleached driftwood | low |
| **Moonlit fen** *(planned)* | dark grass, glow props | firefly patches, owl perches | medium |
| **Bell ruins** *(planned)* | stonefloor, broken `#` | charm shards, chime props | lore-heavy |
| **Mushroom grove** *(planned)* | carpet `m`, damp | spore puffs, cozy gnome stools | low combat |
| **Tide flats** *(planned)* | sand + water edge | shell piles, tide pools | seasonal |

### 2.6 Unimplemented world concepts *(high creative temperature)*

Ideas for post-demo expansion — each should be one **major area** or a **biome overlay**:

| Concept | One-line pitch | Micro-patch goldmine |
| --- | --- | --- |
| **The Hanging Gardens** | Cliff terraces above the road; rope bridges | herb rows, scarecrows, bee skeps |
| **Moth Market** | Night-only bazaar that appears after rain | lantern strings, moth cages, tea steam |
| **The Laundry Flats** | Windy plateau where whole towns dry clothes | clothing poles, sheet mazes, peg baskets |
| **Gravel Choir** | Quarry where stones "ring" when struck | tuning mallets, choir benches, echo marks |
| **Snail Quarter** | District where snail racing is religion | track loops, salt circles, trophy jars |
| **The Borrowed Library** | Books checked out never returned; outdoor stacks | reading benches, overdue slips, dew pages |
| **Witch's Lane** | Not evil — just inconvenient | drying herbs, cauldron birdbath, polite warnings |
| **Troll Toll (retired)** | Bridge troll moved to a lawn chair | comment box, "free lemons" sign |
| **The Pit's Underpit** | Arena basement, older than the city | chalk fight circles, old bloodstains (dry) |
| **Bellfall Crater** | Where the sky bell landed | cracked stone, pilgrim camps, wish ribbons |
| **The Soft Marsh** | Marsh so soft it remembers footsteps | boot stuck props, boardwalk, frog choir |
| **Cloudherd Pass** | High route; literal cloud sheep | wool snags on fences, shearing stool |
| **The Kind Graveyard** | Graves tended like gardens | topiary, picnic tables, "visit hours" sign |
| **Rubbish Oracle** | Trash heap that answers questions | oracle bins, magpie nests, prophecy wrappers |
| **The Waiting Room** | Limbo pocket between maps | numbered tiles, stale tea, one potted fern |

---

## 3. Current demo registry

| id | Name | Major type(s) | Biome | Notes |
| --- | --- | --- | --- | --- |
| `town` | Eldermoor | hamlet | vale_meadow | Plaza, pond, training yard, 4 buildings |
| `elder_house` | Elder Hall | civic interior | — | |
| `inn` | Inn | inn interior | — | Het's rest spot |
| `shop` | Vale Goods | shop interior | — | |
| `smithy` | Smithy | smithy interior | — | |
| `route1` | The Hollow Road | forest_route, river_crossing, cliff_route | vale_meadow → hollow_thornwood | 72 tiles long, 3 grass ambush fields |
| `cave` | Hollow Cave | limestone_cave | — | Dual-lever puzzle |
| `boss` | Warden's Vault | boss_vault | — | Stone Warden |
| `ashfall` | Ashfall | walled_city | ash_scrub | Market, garden, Pit, side quests |
| `tavern` | Gilded Gryphon | tavern interior | — | |
| `cellar` | Gryphon Cellar | cellar | — | Rat quest |
| `armory` | Armory | armory interior | — | |
| `arena` | The Pit | arena interior | — | Wave minigame |
| `tabb_house` | Tabb's House | home interior | — | Cat quest |

---

## 4. Micro-patch catalog

Each entry is a **sprinkle candidate**. Implementation = a stamp function + prop list + optional
dialog flag. Size is approximate tile footprint.

### 4.1 Residential & backyard *(towns, home-adjacent)*

| id | Name | Size | Props / tiles | Vibe |
| --- | --- | --- | --- | --- |
| `patio_stone` | Stone patio | 4×3 | bench, table, plant | morning coffee |
| `laundry_line` | Clothing line | 5×2 | poles (signpost reskin), basket | AC classic |
| `herb_garden` | Herb patch | 4×4 | plant×3, flower `f`, path `p` | witch-adjacent but cozy |
| `chicken_coop` | Coop corner | 4×4 | fence `F`, crate, sign | eggs as lore |
| `porch_steps` | Porch stoop | 3×2 | bench, lamp, pot | gossip spot |
| `boot_scraper` | Mud corner | 2×2 | barrel, sand `s` patch | rainy day detail |
| `compost_charm` | Compost heap | 3×3 | crate, bush `h`, basket | somehow wholesome |
| `pet_bowl` | Pet corner | 2×2 | basket, charm (optional) | cat/dog quest hook |
| `bird_feeder` | Feeder tree | 3×3 | `#` single, bench nearby | idle animation bait |
| `tool_shed` | Shed nook | 4×3 | crate, rack, barrel | smith overflow |
| `rain_barrel` | Rain catch | 2×2 | barrel under roof drip | weather fantasy |
| `flower_box` | Window boxes | 2×1 | `f` row on `p` | cheap cozy win |

### 4.2 Community & social *(plazas, near civic buildings)*

| id | Name | Size | Notes |
| --- | --- | --- | --- |
| `bulletin_board` | Notice board | 3×2 | sign + bench; quest stubs |
| `meeting_stump` | Story stump | 4×4 | bench ring, fire pit (fireplace reskin) |
| `well_circle` | Village well | 5×5 | fountain reskin, path ring, lamp |
| `shrine_nook` | Roadside shrine | 3×3 | shrine prop, flower, bench |
| `market_stall_row` | Stall row | 8×3 | stall×2–3, basket, sign | Ashfall already has stalls — template |
| `cart_overflow` | Spilled cart | 4×4 | crate, pot, barrel, `:` scatter |
| `spice_spill` | Merchant accident | 3×3 | colorful = lighter tile specks + pot |
| `bargain_chalk` | Chalk prices | 2×2 | sign on path, stall adjacent |
| `musician_corner` | Busker spot | 3×3 | bench, lamp, NPC anchor |
| `childrens_circle` | Play circle | 5×5 | sand patch, bench, sign ("PIP WAS HERE") |
| `community_garden` | Shared beds | 6×6 | `f` rows, fence, bench, plant |
| `notice_pole` | Pole stack | 2×2 | sign, lamp | quest layering |

### 4.3 Route & wilderness *(sprinkle on routes, biome edges)*

| id | Name | Size | Notes |
| --- | --- | --- | --- |
| `wayside_grave` | Lone grave | 3×3 | grave, flower, sign | **exists** on route1 — template |
| `graveyard_small` | Grave cluster | 8×6 | grave×3–5, fence, bush, bench | route dead-ends |
| `trash_heap` | Rubbish heap | 4×4 | crate, pot, barrel, rock scatter | loot joke / oracle hook |
| `overturned_cart` | Broken cart | 5×4 | crate, barrel, wheel (sign), `:` | ambush cover |
| `rain_pool` | Puddle pool | 4×3 | water `w` shallow, sand rim, reed = `,` | post-rain event |
| `barbed_wire` | Wire tangle | 6×2 | fence `F` broken, rock, sign warning | ash_scrub biome |
| `milestone` | Mile stone | 2×2 | sign, path | distance flavor |
| `toll_ruin` | Old toll booth | 4×4 | counter tile, sign, bench | lore |
| `campfire_cold` | Cold fire ring | 4×4 | rock ring, bench, pot | travelers rested |
| `hunter_blind` | Blind | 3×3 | bush `h`, tallgrass `,`, crate | ranger NPC |
| `snail_trail` | Snail path | 6×1 | `:` + `f` dots, sign | cozy absurd |
| `mushroom_ring` | Fairy ring | 5×5 | `f` circle, `#` center tree optional | no combat — vibe |
| `spider_silk` | Webbed trees | 4×4 | `#` + fence strands | thornwood |
| `bone_cairn` | Cairn | 3×3 | rock stack, grave optional | badlands |
| `offering_bowl` | Travel shrine | 2×2 | shrine small, charm | interact → buff joke |
| `bridge_shrine` | Bridge niche | 3×2 | sign, flower, lamp | before crossings |
| `cliff_vista` | Lookout | 6×4 | bench, sign, `=` backdrop | no dead-end without view |

### 4.4 Water & garden *(ponds, parks — both towns)*

| id | Name | Size | Notes |
| --- | --- | --- | --- |
| `fishspot_nook` | Fishing spot | 4×3 | fishspot, bench, sign | minigame anchor |
| `pond_lily` | Lily pond | 6×5 | water, `f`, bench, bush | Eldermoor/Ashfall parks |
| `stepping_stones` | Stone path | 5×2 | `p` + `w` alternating | garden traversal |
| `memorial_bench` | Quiet bench | 3×3 | bench, flower, sign name | grief + warmth |
| `fountain_plaza` | Mini fountain | 5×5 | fountain, lamp×4 | plaza sub-patch |
| `hedge_maze_tiny` | Hedge nook | 7×7 | `h` walls, bench center | one-screen maze |
| `gazebo` | Gazebo | 5×5 | table, bench ring, lamp | event space |
| `bee_skep` | Bee corner | 3×3 | plant, fence, sign | honey quest stub |

### 4.5 Urban grit *(Ashfall-weighted, still cozy)*

| id | Name | Size | Notes |
| --- | --- | --- | --- |
| `alley_laundry` | Alley lines | 3×8 | laundry_line compressed | vertical stamp |
| `market_spill` | After-hours market | 6×4 | stall, crate, basket, lamp |
| `pit_chalk` | Fight posters | 4×3 | sign×2, bench | arena exterior |
| `rat_hole` | Suspicious grate | 2×2 | cellar door feel, sign joke | leads to cellar quest tone |
| `guard_post` | Guard nook | 4×3 | bench, lamp, sign | Hale's domain |
| `prison_yard` | Exercise yard | 6×5 | fence, bench, sand | future content |
| `chimney_smoke` | Smokestack corner | 3×3 | lamp, sign, ash scatter `:` | industrial cozy |

### 4.6 Cave & underground sprinkles

| id | Name | Size | Notes |
| --- | --- | --- | --- |
| `miners_lunch` | Lunch spot | 3×3 | crate, pot, bench (fireplace) | Hollow Cave break |
| `flooded_niche` | Pool niche | 4×3 | water, rock, shade spawn | |
| `bone_pile` | Bone pile | 3×3 | rock, grave, pot | |
| `candle_row` | Candle trail | 1×6 | lamp props | guidance |
| `collapsed_rail` | Mine cart | 4×3 | crate, rock, lever tease | |
| `echo_mark` | Echo wall | 3×3 | sign ("shout here") | audio gag |

---

## 5. Sprinkle system (for hand maps + procedural gen)

### 5.1 Data shape

Each major map definition can declare sprinkles explicitly, or call a generator:

```javascript
// Future: src/worldSprinkles.js
{
  id: 'laundry_line',
  tags: ['cozy', 'residential', 'urban'],
  size: { w: 5, h: 2 },
  biomes: ['vale_meadow', 'ash_scrub'],
  majorTypes: ['hamlet', 'walled_city', 'market_town'],
  anchors: ['building_backyard', 'road_adjacent', 'fence_line'],
  forbids: ['plaza_center', 'portal_tile', 'water_deep'],
  minDist: { building: 1, portal: 3, sprinkle: 4 },
  weight: 10,
  stamp(grid, ox, oy, rng),   // writes TILDEF chars into grid
  props: [{ type, dx, dy, ... }],  // offsets from stamp origin
  npcChance: 0.08,
  npcPool: ['villager', 'kid'],
}
```

### 5.2 Anchor types

| Anchor | Placement rule |
| --- | --- |
| `plaza_corner` | Corner of largest open `p`/`t` rectangle |
| `plaza_center` | Centroid of plaza — fountains, shrines only |
| `building_backyard` | 3–6 tiles behind a building door, on `.` or `:` |
| `building_side` | Beside wall, parallel to path to door |
| `road_edge` | Single tile adjacent to route path, not blocking |
| `road_fork` | Where 3+ path tiles meet — signs, milestones |
| `road_dead_end` | Path terminus — graveyards, trash, camps |
| `fence_line` | Along `F` or `h` borders |
| `water_shore` | Tile adjacent to `w`, sand `s` preferred |
| `cliff_overlook` | Tile adjacent to `=` with open view |
| `tree_grove` | Inside `#`/`^` scatter clusters |
| `ambush_grass` | Inside `,` fields — props only, no solid block |
| `market_row` | Along stall axis in cities |
| `alley` | Narrow gap between buildings (width 2–3) |

### 5.3 Generation pipeline

```
1. Build base major map (hand DSL or template).
2. Tag major type + biome on the map def.
3. Scatter base terrain (existing scatter() calls).
4. Reserve forbidden zones (buildings, portals, quests, doors).
5. Collect anchor candidates (scan grid).
6. Weighted pick micro-patches matching tags + biome + majorType.
7. Stamp tile overlay; merge props; dedupe by minDist.
8. Optional: spawn micro-NPC from npcPool.
9. Validate reachability (BFS from portals) — reject stamps that seal paths.
```

### 5.4 Tag groups *(filter micro-patches)*

| Tag | Includes |
| --- | --- |
| `cozy` | laundry, patio, bench, garden, snail_trail, mushroom_ring |
| `grit` | trash_heap, barbed_wire, rat_hole, bone_cairn |
| `lore` | shrine, grave, milestone, offering_bowl, bell hooks |
| `commerce` | stall_row, cart_overflow, bargain_chalk, spice_spill |
| `danger` | barbed_wire, hunter_blind, spider_silk — often near combat tiles |
| `interact` | fishspot, shrine, bed, bench — must wire to interact() |
| `quest_hook` | bulletin_board, lost_cat_spot, courier_drop, charm_hide |

### 5.5 Density guidelines

| Major type | Sprinkles / 100 tiles | Combat props OK? |
| --- | --- | --- |
| Hamlet | 8–14 | knockables yes, spawns no |
| Walled city | 10–18 | yes |
| Forest route | 4–8 | yes + ambush grass props |
| Cliff route | 3–6 | yes |
| Cave | 2–5 | yes, mostly lore |
| Boss vault | 0–2 | debris only |
| Interior | 4–10 | no enemy spawns |

---

## 6. Demo sprinkle plan *(IMPLEMENTED — see `src/worldSprinkles.js`)*

The live per-map plan now lives in `MAP_SPRINKLES` (patches + standalone `extras`,
both audited by `tools/audit-sprinkles.mjs`). Interactable lore is keyed by patch id
in `SPRINKLE_LORE`. The tables below were the original suggestions; the shipped
plan supersedes them.

### Eldermoor (`town`)

| Patch | Anchor | Where |
| --- | --- | --- |
| `laundry_line` | building_backyard | Behind shop (6,21) or smithy |
| `patio_stone` | building_side | Beside inn, table + bench |
| `herb_garden` | fence_line | Near pond fence |
| `bulletin_board` | plaza_corner | NW plaza corner (16,13) |
| `community_garden` | water_shore | Opposite pond bench |
| `flower_box` | building_side | Elder Hall front |
| `boot_scraper` | road_adjacent | North road mud before gate |

### Hollow Road (`route1`)

| Patch | Anchor | Where |
| --- | --- | --- |
| `graveyard_small` | road_dead_end | West fork near Ashfall gate (expand single grave) |
| `rain_pool` | road_edge | Near river (y≈52), sand + shallow `w` |
| `barbed_wire` | cliff_overlook | Ledge nook approach (y≈35) — ash_scrub hint |
| `overturned_cart` | ambush_grass | Tall grass field (23,54) |
| `milestone` | road_fork | Cave / Ashfall fork (14,10) |
| `campfire_cold` | tree_grove | East border mid-map |
| `bridge_shrine` | water_shore | Bridge south approach |
| `trash_heap` | road_dead_end | Near wanderer NPC (12,57) — "oracle" joke sign |

### Hollow Cave (`cave`)

| Patch | Anchor | Where |
| --- | --- | --- |
| `miners_lunch` | road_adjacent | Entry chamber |
| `candle_row` | road_adjacent | Corridor to boss door |
| `flooded_niche` | water_shore | Expand existing pool |
| `echo_mark` | cliff_overlook | Main hall dead wall |

### Ashfall (`ashfall`)

| Patch | Anchor | Where |
| --- | --- | --- |
| `market_spill` | market_row | Near Hob/Lira stalls |
| `alley_laundry` | alley | Between armory and Tabb's |
| `memorial_bench` | plaza_corner | Garden park |
| `pit_chalk` | building_side | Outside The Pit |
| `guard_post` | road_adjacent | South gate beside Hale |
| `snail_trail` | plaza_corner | Quiet corner — Penny NPC tie-in |
| `shrine_nook` | plaza_center | Secondary shrine near hidden charms |

---

## 7. Procedural major templates *(future)*

When generating new maps, pick **one template** + **biome overlay** + **sprinkle pass**:

| Template | Size | Skeleton |
| --- | --- | --- |
| `gen_hamlet` | 44×36 | border trees, central plaza, 3–4 building slots, pond optional |
| `gen_route` | 40×64 | south portal, north portal, S-path or L-path, one puzzle pocket |
| `gen_cave` | 36×28 | entry → hall → fork → boss door |
| `gen_city_block` | 48×40 | wall `X`, gate south, avenue north, 4 building slots |
| `gen_grove` | 32×32 | low combat, mushroom_ring + snail_trail mandatory |
| `gen_rest` | 20×20 | campfire, 1 NPC, no enemies — connector between routes |

**Biome overlay** mutates scatter tables:

```javascript
BIOME_SCATTER = {
  vale_meadow:   { '#': 0.04, '^': 0.01, 'f': 0.02, ',': 0.01, 'h': 0.008 },
  hollow_thornwood: { '#': 0.06, '^': 0.03, ',': 0.03, 'h': 0.02 },
  ash_scrub:     { 's': 0.15, ':': 0.08, 'h': 0.01, '#': 0.005 },
};
```

---

## 8. Implementation checklist

When adding a micro-patch to the codebase:

- [ ] Stamp fits palette (only TILDEF chars + existing prop types)
- [ ] Does not block portals, doors, or quest-critical tiles
- [ ] BFS reachability passes after stamp
- [ ] At least one interact OR pure ambience (not dead props)
- [ ] NPC dialog references landmark + compass if quest-relevant
- [ ] Entry added to this doc with id, tags, anchors
- [ ] If cozy: bench, lamp, or sit target within 3 tiles

When adding a **new major area**:

- [ ] `majorType` + `biome` tags on map def
- [ ] Music + ambient assigned
- [ ] Sprinkle pass run (hand or generated)
- [ ] One "reason to linger" (minigame, shop, rest, or view)
- [ ] One "reason to leave" (portal, gate, or boss)

---

## 9. Quick reference — major type → micro-patch weights

|  | cozy | grit | lore | commerce | danger |
| --- | --- | --- | --- | --- | --- |
| hamlet | **high** | low | med | med | low |
| walled_city | med | med | med | **high** | low |
| forest_route | med | low | med | low | med |
| cliff_route | low | med | **high** | low | med |
| limestone_cave | low | med | med | low | **high** |
| ash_scrub | low | **high** | med | low | med |
| boss_vault | — | med | low | — | **high** |

---

*Last updated: demo v0.2 — 14 maps. 86 sprinkle props + 83 micro-patches implemented
(`src/areaArt.js`), hand-placed across all maps via `src/worldSprinkles.js`, validated
by `node tools/audit-sprinkles.mjs` (bounds, overlaps, solids-on-paths, BFS reachability).*
