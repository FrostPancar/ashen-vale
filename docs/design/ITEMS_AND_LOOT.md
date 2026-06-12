# ASHEN VALE — Items, Loot & Difficulty Curve

Source of truth for the item system, every loot source in the demo, and how both feed
the difficulty curve. Numbers cited here are the live values — if you retune code,
update this doc in the same change.

Code owners: `src/items.js` (generation, loot DSL, shops), `src/main.js` (`rollLoot`,
`giveLoot`, `openShopFor`), `src/entities.js` (`recalcStats`, `damage`), `src/skills.js`
(`skillDamage`, `xpForLevel`), `src/maps.js` (placement).

---

## 1. Design intent

The Diablo layer exists to answer one question after every fight: **"did I get
stronger?"** The Zelda layer (exploration, puzzles) gates *where* you can go; the item
layer gates *how hard you hit when you get there*.

- **Items are the main power lever.** Player base damage grows ~1.2/level, but a weapon
  upgrade adds 5–15. The weapon slot is ~60–70% of total damage at any point in the
  demo. Armor/trinkets are smaller, build-flavoring picks.
- **Loot is a faucet, gold is a sink.** Drops are enemy-specific and chests are curated;
  shops offer deterministic catch-up for unlucky players (Bram sells a rare weapon at
  level+1 once you reach level 2).
- **Scarcity creates tension, not grind.** Potions heal a lot (40) but drop rarely from
  most foes and cost real money (12g vs ~3g/kill). The demo should never *require*
  farming.
- **Early demo caps at Rare.** Legendary tier exists in code for future content but has
  zero weight and does not appear in the demo. Milestone rewards are named Rare items,
  not Legendary.

## 2. Item anatomy (`src/items.js`)

### Slots & bases

| Slot | Bases | Core stat | Notes |
| --- | --- | --- | --- |
| `weapon` | **Knight:** Rustblade (5) · Road Cleaver (5) · Sword (6) | dmg | Class-filtered; tier 0 = starter variants |
| | **Ranger:** Scout Bow (4) · Hollow Bow (4) · Shortbow (5) | dmg | |
| | **Mage:** Willow Staff (4) · Bellwood Staff (4) · Ashwood Staff (5) | dmg | |
| `armor` | Cloth Wrap (def 1) · Tunic (def 2) · Leather Jerkin (def 3) · Chainmail (def 4) | def | Universal; tier 0 favored at low level |
| `trinket` | Ring · Charm · Woven Band · Moss Pendant | affixes only | Pure affix carrier — the "fun" slot |

### Rarities (demo)

| Rarity | Weight | Stat mult | Affixes | Demo role |
| --- | --- | --- | --- | --- |
| Common | 48 | ×1.0 | 0 | Vendor trash / early filler |
| Magic | 38 | ×1.2 | 1 | Workhorse tier; starter weapon is magic |
| Rare | 14 | ×1.45 | 2 | Build moments; boss & puzzle rewards |
| Legendary | **0** | ×1.8 | 3 | **Not used in demo** — reserved for post-Ashfall |

`rollRarity(luck, maxRarity)`: capped at `DEMO_MAX_RARITY` (`rare`). Luck shifts weight
from common into higher tiers. Boss milestone items are forced Rare via curated tables.

### Class affix bias

When `classAffix: true` (drops, shops, milestones), affix rolls favor:

| Class | Preferred affixes |
| --- | --- |
| Knight | leech, hp, def, dmg |
| Ranger | crit, spd, dmg |
| Mage | mp, cdr, dmg |

### Scaling formulas

- Weapon damage: `round((base + level × 1.5) × rarityMult)`
- Armor defense: `round((base + level × 0.7) × rarityMult)`
- Affix value: `round(roll(min..max, quality floor) × (1 + level × 0.10))`
- Rarity quality floors: magic 45%, rare 72% toward max roll; curated chests 74%; milestones fixed affixes at 82%
- Price: `round((10 + level × 6) × rarityMult × (affixCount + 1))`

`level` is the *player's* level at generation time — all loot is level-matched, there
are no "zones with item levels" in the demo.

### Affixes

| Affix | Range (lv 1) | Slots | Role in builds |
| --- | --- | --- | --- |
| `+dmg` | 1–4 | weapon, trinket | Direct power; always good |
| `+hp` | 5–20 | armor, trinket | Biggest effective-HP swing in the game |
| `+mp` | 4–15 | trinket, weapon | Skill uptime (mage/ranger care most) |
| `+def` | 1–3 | armor | Each point ≈ −0.6 damage taken per hit |
| `+spd%` | 4–12 | armor, trinket | Kiting & dodge power — quietly the best defensive stat |
| `+crit%` | 3–10 | weapon, trinket | ×1.6 on proc, stacks with base 5% |
| `+leech%` | 2–6 | weapon | Sustain; turns knights immortal in packs |
| `−cdr%` | 4–12 | trinket, weapon | More skill casts; multiplies with mp affixes |

**Invariant:** affixes never roll duplicates on one item, and slots constrain identity —
leech is weapon-only, def is armor-only. Keep it that way; it's what makes slots feel
different.

### Naming
Magic = `PREFIX Base`. Rare = `PREFIX Base SUFFIX`. Milestone items use fixed names
(`Road-Keeper's Cleaver`, `Warden's Toll`, …). Names are flavor only — never encode stats.

### Milestone items (named Rare rewards)

| ID | Knight | Ranger | Mage |
| --- | --- | --- | --- |
| `road_keeper` (boulder puzzle) | Road-Keeper's Cleaver | Foxpath Shortbow | Hollow Whisper |
| `warden_trophy` (boss chest) | Warden's Toll | Bellshot | Last Light Staff |

Boss milestone weapons generate at **player level + 1** with guaranteed class affixes (no random off-bias rolls).

## 3. Stat pipeline (`src/entities.js`)

```
recalcStats():
  maxHp = classHp + (level−1) × 9        dmg = classDmg + floor((level−1) × 1.2)
  maxMp = classMp + (level−1) × 4        crit = 5 (base), def/spd/leech/cdr = 0
  + sum of itemStats() across the 3 equip slots
```

- Player damage dealt: `skillDamage = round(stats.dmg × skillMult)`, crit ×1.6,
  leech heals `final × leech%`.
- Player damage taken: `max(1, round(enemyDmg − def × 0.6))`, then 0.7s i-frames.
- Potion: flat 40 HP (≈ full heal at lv 1–2, ~50% at lv 5). `Q`, anywhere, no cooldown.

## 4. Loot pipelines — every source in the demo

### A. Scripted (quest)
| Source | What | Why |
| --- | --- | --- |
| Bram, stage 2 (`giveStarterWeapon`) | **Magic weapon, lv 1, class-matched** | Tutorial power spike; never random-tier |
| Inn (Old Het) / Gryphon (Tilly) | Full HP/MP restore, free | Safety valve before/after the road |
| **The Courier** (Hale → Oggen → Hale) | 25g + 15 XP | City tour quest; teaches Ashfall geography |
| **Pest Control** (Tilly, cellar, 5 rats) | 30g + 1 potion + **magic item** + 25 XP | First Ashfall combat beat |
| **The Lost Cat** (Mrs Tabb, 3 possible spots) | 20g + **magic trinket** + 20 XP | Pure exploration; spot rolled on accept |
| **Chime Fishing** (Jun, 3 catches) | 20g + **rare trinket** + 20 XP | Minigame mastery reward |
| **Bell shrine** (5 hidden charms) | **rare trinket, lv+1** | Completionist sweep of the whole city |
| **The Pit victory** (3 waves, 10g entry) | 30g + 8g/lv + **rare item, lv+1** (25% potion) | Repeatable gold/item faucet; the demo's endgame loop |
| Fishing catch (per fish) | 5–12g | Cozy trickle income |
| Beds / fireplaces / benches | Full / +15 / +6 HP | Cozy healing, replaces potion tax in town |

### B. Enemy drops (`rollEnemyLoot`, per kill, client-instanced in co-op)

Each enemy type has its own profile in `ENEMY_LOOT`:

| Enemy | Item chance | Potion chance | Slots | Rarity mix |
| --- | --- | --- | --- | --- |
| Slime | 10% | 5% | trinket, armor | 72% common / 28% magic |
| Bat | 18% | 8% | trinket | 55% / 40% / 5% rare |
| Husk | 30% | 14% | armor, weapon | 40% / 50% / 10% rare |
| Shade | 26% | 10% | trinket, weapon | 35% / 55% / 10% rare |
| Stone Warden | 100% | 35% | weapon (class) | 100% rare, level+1 |

Gold always drops (enemy `gold[min..max]`). Affix bias per enemy type (e.g. bats → spd/crit,
shades → mp/cdr). Class affix bias applies on all item drops.

Expected items per full Route 1 clear (~12 enemies): ~2–3 items plus type-appropriate
trinkets/armor from slimes and bats.

### C. Chests (curated loot DSL, one-shot, saved via flags)

Loot spec grammar (`resolveLootSpec`):

- `gold:N` or `gold:min-max`
- `potion:N`
- `item:slot:rarity[:+level][:affix1+affix2]`
- `milestone:road_keeper` / `milestone:warden_trophy`
- `bundle:part1|part2|…`

| Chest | Map / placement | Loot | Curve role |
| --- | --- | --- | --- |
| `town_chest` | Town, behind inn (41,4) | gold 18–28 + 1 potion + common trinket | Tutorial bundle; funds first shop visit |
| `route_chest3` | Route 1 north, near husks (33,20) | 2 potions + magic armor (hp+def bias) | Pre-cave survival kit |
| `route_chest1` | Route 1, boulder nook (31,37) | **Milestone class weapon** (`road_keeper`) | Puzzle pays a named Rare weapon for your class |
| `route_chest2` | Route 1 south-west, off-path (6,60) | gold 35–50 + magic trinket (spd+crit) | Exploration reward for detour |
| `cave_chest2` | Cave west chamber (5,7) | 2 potions + magic trinket (mp+cdr) | Pre-boss mana/utility stock |
| `cave_chest1` | Cave east chamber (33,8) | magic armor (def+hp) | Fight-for-loot on lever-B path |
| `boss_chest` | Warden's Vault (13,5) | **Milestone weapon** + 2 potions + gold 30–45 | Demo trophy — named Rare, not Legendary |
| `cellar_chest` | Gryphon cellar (11,9) | 2 potions | Pest Control side-loot |

**Pattern to preserve:** every puzzle or guarded detour pays out in a curated bundle
matched to effort and area theme. Boss chest is the capstone Rare, not a Legendary spike.

### D. Shops (deterministic, regenerated per open, priced by formula)

| Shop | Stock recipe | Role |
| --- | --- | --- |
| **VALE GOODS** (Posy) | 2× Vale Tonic (12g) · magic class-biased trinket · magic armor (knight→def/hp, others→spd) · budget common trinket · budget common armor | Survival + accessories + cheap filler |
| **BRAM'S FORGE** | magic class weapon (lv) · magic class weapon (lv+1, tier-1 base) · magic armor · **rare weapon (lv+1)** *(lv 2+ only)* | Weapon catch-up; rare appears once you've hit the road |
| **ASHFALL ARMORY** (Kettle) | **rare class weapon (lv+1, tier-2)** · **rare armor (lv+1)** · magic armor (tier-1) · rare class trinket · Vale Tonic | Post-Warden tier; everything a step above Bram |

Gold income (~25–60g per area incl. chests) prices roughly one shop item per area.

## 5. Difficulty curve

### Enemy roster (`ENEMY_TYPES`)
| Enemy | HP | DMG | Speed | XP | Threat identity |
| --- | --- | --- | --- | --- | --- |
| Slime | 14 | 4 | 1.25 | 9 | Tutorial punching bag; slow, swarmy |
| Rat | 8 | 3 | 2.4 | 6 | Cellar-only swarm; fast but fragile |
| Bat | 9 | 3 | 2.7 | 8 | Fast flyer — punishes standing still |
| Husk | 24 | 7 | 1.9 | 16 | First "real" enemy; demands potions or kiting |
| Shade | 18 | 6 | 2.3 | 14 | Fast + hits hard; cave pressure unit |
| **Stone Warden** | 260 | 9 (slam ×1.5) | 1.6 | 130 | Boss: slam AoE + summons 2 shades per phase |

### Spatial gradient
- **Town:** zero combat. Dummies teach attacking.
- **Route 1 (south → north):** slimes → bats → husks. South = easy.
- **Hollow Cave:** shades + bats in the dark; husk+shade pack on lever B path.
- **Warden's Vault:** DPS check + dodge check.
- **Ashfall:** zero street combat (it's the reward). Fights are opt-in: the cellar
  (5 rats, easy) and the Pit (3 waves: slimes/bats → husks/bats → shades/husk,
  +1 shade at lv 6+). The Pit is the post-demo difficulty ceiling.

### XP / level pacing (`xpForLevel = round(24 × lv^1.65)`)
| Beat | XP available (cumulative) | Expected level | Power source at this beat |
| --- | --- | --- | --- |
| Town dummies + intro | ~10 | 1 | Starter magic weapon (scripted) |
| Route 1 cleared | ~130 | 2–3 | Milestone puzzle weapon + enemy drops |
| Cave cleared | ~235 | 3 | Cave chests, shade/husk drops |
| Warden killed | ~365 | 4 | Boss drop (rare lv+1) + milestone chest |
| Ashfall / free roam | side quests ~80 XP + Pit runs | 4–6 | Armory rares (lv+1) + repeatable Pit rewards |

Level thresholds: lv2 = 24, lv3 = 99, lv4 = 246, lv5 = 482 cumulative XP.

### Death policy
Death costs nothing but position (respawn in town, full HP/MP, keep everything).

## 6. Tuning knobs (one-stop list)

| Knob | Location | Current |
| --- | --- | --- |
| Rarity weights / multipliers | `items.js RARITIES` | 48/38/14/0 · ×1.0/1.2/1.45/1.8 |
| Demo max rarity | `items.js DEMO_MAX_RARITY` | `rare` |
| Affix ranges | `items.js AFFIXES` | table §2 |
| Enemy drop profiles | `items.js ENEMY_LOOT` | table §4B |
| Chest contents | `maps.js` props `loot:` | table §4C |
| Shop recipes | `items.js shopStock`, `smithStock` | table §4D |
| Potion heal / price | `main.js drinkPotion`, `shopStock` | 40 HP / 12g |
| Enemy stats | `entities.js ENEMY_TYPES` | table §5 |
| XP curve | `skills.js xpForLevel` | 24 × lv^1.65 |

## 7. Checklist for new items / areas

- [ ] New loot source pays in a curated bundle matched to effort and area theme
- [ ] Item generation goes through `generateItem` or `generateMilestoneItem`
- [ ] Demo loot stays at Rare or below — no Legendary in random tables
- [ ] New area keeps spatial easy→hard gradient and a potion cache before its spike
- [ ] Enemy drops use `ENEMY_LOOT` profiles (slot + rarity + affix bias)
- [ ] Shops: Posy = survival/accessories, Bram = weapons + rare catch-up at lv 2+
- [ ] New affixes respect slot identity
- [ ] Update this doc's numbers in the same PR
