// ASHEN VALE — hand-placed sprinkle patches per map (see docs/design/WORLD_AREAS.md §6).
import { PATCH_DEFS, TILE_MAP } from './areaArt.js';
import { TILDEF } from './maps.js';

const PATCH_BY_ID = Object.fromEntries(PATCH_DEFS.map(p => [p.id, p]));

/** Solid tile chars used in patch row stamps. */
const SOLID_CHARS = new Set(['#', '^', 'h', 'F', 'w', 'r', '=', 'X', 'C', 'W', '_']);

/**
 * Per-map sprinkle plan: composed micro-patches + standalone decor props.
 * Coordinates are top-left tile of each patch stamp.
 */
export const MAP_SPRINKLES = {
  // Lean baselines: lore/quest anchors only. Seasonal flavor comes from
  // MONTH_SPRINKLES below, keyed by the save's month seed.
  town: {
    patches: [
      // west lane: witch neighbor + shared beds
      { id: 'witchs_stoop', x: 2, y: 8 },
      { id: 'community_garden', x: 3, y: 14 },
      // plaza fringe: board + mail west of the lamps
      { id: 'bulletin_board', x: 14, y: 15 },
      { id: 'mail_stop', x: 11, y: 14 },
      // east lane: patio by the inn, coop behind it, feeder south
      { id: 'patio_stone', x: 35, y: 11 },
      { id: 'chicken_coop', x: 39, y: 12 },
      { id: 'bird_feeder', x: 41, y: 16 },
      // south: play circle between pond and training yard
      { id: 'childrens_circle', x: 25, y: 30 },
    ],
    extras: [
      // pond life
      { type: 'duck', x: 8, y: 31, oy: -2 },
      { type: 'reedCluster', x: 12, y: 30, oy: -4 },
    ],
  },
  route1: {
    patches: [
      // south stretch: camp before the bridge, shrine at the crossing
      { id: 'caravan_rest', x: 4, y: 46 },
      { id: 'bridge_shrine', x: 7, y: 54 },
      // south-east: the oracle heap by the wanderer, travel shrine
      { id: 'trash_heap', x: 14, y: 62 },
      { id: 'offering_bowl', x: 12, y: 66 },
      // mid-map: cold camp by the river bend
      { id: 'campfire_cold', x: 33, y: 46 },
      // north: toll ruin at the gate, waymark at the fork
      { id: 'toll_ruin', x: 11, y: 18 },
      { id: 'milestone', x: 16, y: 12 },
    ],
    extras: [
      // ledge-nook pocket: a reason the toll men lingered
      { type: 'bench', x: 21, y: 36 },
      { type: 'chimeStrand', x: 20, y: 35, oy: -2, patchId: 'cliff_vista' },
      // river banks
      { type: 'reedCluster', x: 5, y: 49, oy: -2 },
      { type: 'duck', x: 30, y: 51, oy: -4 },
    ],
  },
  cave: {
    patches: [
      { id: 'miners_lunch', x: 20, y: 22 },
      { id: 'candle_row', x: 14, y: 10 },
      { id: 'flooded_niche', x: 23, y: 12 },
      { id: 'echo_mark', x: 21, y: 9 },
      { id: 'crystal_grotto', x: 9, y: 5 },
      { id: 'bone_pile', x: 27, y: 12 },
    ],
    extras: [
      { type: 'lanternPost', x: 16, y: 26, oy: -2 },
      { type: 'stalagmite', x: 8, y: 15 },
      { type: 'stalagmite', x: 29, y: 10 },
      { type: 'toadstoolCluster', x: 10, y: 14 },
    ],
  },
  boss: {
    patches: [
      { id: 'candle_row', x: 10, y: 17 },
      { id: 'bell_shards', x: 6, y: 9 },
    ],
  },
  ashfall: {
    patches: [
      // plaza ring: books by the tavern lane
      { id: 'borrowed_stacks', x: 30, y: 14 },
      // market spill east of the plaza, posters outside The Pit
      { id: 'market_spill', x: 24, y: 22 },
      { id: 'pit_chalk', x: 30, y: 20 },
      { id: 'rat_hole', x: 28, y: 31 },
      { id: 'guard_post', x: 15, y: 29 },
      // garden: quiet bench
      { id: 'memorial_bench', x: 10, y: 26 },
    ],
    extras: [
      // alley laundry strung between armory and Tabb's
      { type: 'laundryLine', x: 5, y: 15, oy: 0 },
      // pond life + Jun's fish rack
      { type: 'duck', x: 8, y: 27, oy: -2 },
      { type: 'reedCluster', x: 5, y: 26, oy: -4 },
      { type: 'fishRack', x: 7, y: 31, oy: -2, patchId: 'dock_corner' },
      { type: 'ropeCoil', x: 8, y: 31 },
      // bell shrine approach at the avenue's north end
      { type: 'donationShoes', x: 20, y: 3, oy: 2, patchId: 'shrine_nook' },
      { type: 'candleStick', x: 23, y: 3 },
      { type: 'wishRibbon', x: 24, y: 3, oy: -4 },
      // Penny's snail, plaza corner
      { type: 'snail', x: 26, y: 17, oy: 0 },
    ],
  },
  // ---- interiors: indoor-appropriate decor only ----
  inn: {
    extras: [
      { type: 'herbBundle', x: 2, y: 1, oy: -6 },
      { type: 'broom', x: 12, y: 6 },
      { type: 'petBowl', x: 11, y: 9 },
      { type: 'bookStack', x: 11, y: 2 },
    ],
  },
  smithy: {
    extras: [
      { type: 'logPile', x: 8, y: 7 },
      { type: 'waterTrough', x: 1, y: 5 },
      { type: 'bootScraper', x: 7, y: 8, oy: 2 },
    ],
  },
  shop: {
    extras: [
      { type: 'sackPile', x: 1, y: 5 },
      { type: 'herbBundle', x: 7, y: 1, oy: -6 },
      { type: 'ropeCoil', x: 9, y: 8 },
    ],
  },
  elder_house: {
    extras: [
      { type: 'bookStack', x: 11, y: 7 },
      { type: 'bookStack', x: 1, y: 6 },
      { type: 'candleStick', x: 4, y: 5 },
      { type: 'herbBundle', x: 8, y: 1, oy: -6 },
    ],
  },
  tavern: {
    extras: [
      { type: 'lanternString', x: 9, y: 1, oy: -6 },
      { type: 'mothCage', x: 13, y: 1 },
      { type: 'trophyJar', x: 1, y: 5 },
      { type: 'bookStack', x: 16, y: 5 },
      { type: 'petBowl', x: 2, y: 8 },
    ],
  },
  cellar: {
    patches: [
      { id: 'rat_hole', x: 8, y: 5 },
      { id: 'bone_pile', x: 5, y: 2 },
    ],
    extras: [
      { type: 'sackPile', x: 8, y: 9 },
      { type: 'ropeCoil', x: 2, y: 9 },
    ],
  },
  tabb_house: {
    extras: [
      { type: 'petBowl', x: 6, y: 6 },
      { type: 'trophyJar', x: 2, y: 6 },
      { type: 'herbBundle', x: 5, y: 1, oy: -6 },
    ],
  },
  armory: {
    extras: [
      { type: 'logPile', x: 1, y: 5 },
      { type: 'sackPile', x: 9, y: 7 },
      { type: 'ropeCoil', x: 10, y: 5 },
    ],
  },
  arena: {
    patches: [
      { id: 'pit_chalk', x: 6, y: 15 },
    ],
    extras: [
      { type: 'saltCircle', x: 18, y: 16, oy: 0 },
      { type: 'trophyJar', x: 2, y: 2 },
      { type: 'ropeCoil', x: 23, y: 3 },
    ],
  },
};

export const MONTH_NAMES = [null,
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/** Month seed rolled once at save creation (1..12). */
export function rollMonth() {
  return 1 + Math.floor(Math.random() * 12);
}

/**
 * Seasonal variation layered on top of the lean baselines, keyed by the
 * save's month seed (flags.month). Outdoor maps only.
 */
export const MONTH_SPRINKLES = {
  1: { // deep winter: smoke, braziers, lit camps on the road
    town: {
      patches: [{ id: 'chimney_smoke', x: 36, y: 16 }, { id: 'rain_barrel', x: 2, y: 18 }],
      extras: [{ type: 'brazier', x: 17, y: 18 }, { type: 'logPile', x: 40, y: 21 }],
    },
    route1: {
      patches: [{ id: 'ash_drift', x: 6, y: 15 }],
      extras: [{ type: 'campfireLit', x: 8, y: 47 }, { type: 'logPile', x: 35, y: 47 }],
    },
    ashfall: {
      patches: [{ id: 'chimney_smoke', x: 6, y: 12 }, { id: 'rain_barrel', x: 38, y: 16 }],
      extras: [{ type: 'brazier', x: 24, y: 33 }],
    },
  },
  2: { // pilgrim month: shrines, candles, ribbons
    town: {
      patches: [{ id: 'wayside_shrine', x: 2, y: 18 }],
      extras: [{ type: 'wishRibbon', x: 36, y: 16, oy: -4 }, { type: 'candleStick', x: 37, y: 17 }],
    },
    route1: {
      patches: [{ id: 'pilgrim_steps', x: 24, y: 47 }],
      extras: [{ type: 'candleStick', x: 12, y: 56 }, { type: 'wishRibbon', x: 8, y: 55, oy: -4 }],
    },
    ashfall: {
      extras: [
        { type: 'wishRibbon', x: 19, y: 3, oy: -4 }, { type: 'candleStick', x: 25, y: 4 },
        { type: 'donationShoes', x: 13, y: 28, oy: 2 },
      ],
    },
  },
  3: { // thaw: mud, rain pools, wash lines back out
    town: {
      patches: [
        { id: 'boot_scraper', x: 31, y: 33 }, { id: 'laundry_line', x: 2, y: 18 },
        { id: 'rain_barrel', x: 40, y: 8 },
      ],
      extras: [{ type: 'rainBarrel', x: 36, y: 16 }],
    },
    route1: {
      patches: [{ id: 'rain_pool', x: 24, y: 47 }, { id: 'marsh_walk', x: 13, y: 53 }],
    },
    ashfall: {
      patches: [{ id: 'rain_barrel', x: 38, y: 16 }],
      extras: [{ type: 'laundryLine', x: 6, y: 14, ox: 8, oy: 0 }, { type: 'rainBarrel', x: 5, y: 15 }],
    },
  },
  4: { // vale bloom: bees, pond life, snails at the forks
    town: {
      patches: [{ id: 'bee_skep', x: 2, y: 18 }],
      extras: [
        { type: 'lilyPad', x: 6, y: 32, oy: -2 }, { type: 'frog', x: 10, y: 33, oy: 0 },
        { type: 'flowerBox', x: 8, y: 12, oy: -2 },
      ],
    },
    route1: {
      patches: [{ id: 'snail_trail', x: 13, y: 47 }, { id: 'mushroom_ring', x: 4, y: 32 }],
      extras: [{ type: 'chimeStrand', x: 15, y: 13, oy: -2 }],
    },
    ashfall: {
      patches: [{ id: 'bee_skep', x: 2, y: 24 }],
      extras: [
        { type: 'lilyPad', x: 6, y: 27, oy: -2 }, { type: 'frog', x: 10, y: 29, oy: 0 },
        { type: 'birdFeeder', x: 12, y: 24 },
      ],
    },
  },
  5: { // market month: stalls, lantern strings, spice spill
    town: {
      patches: [{ id: 'musician_corner', x: 15, y: 16 }, { id: 'cart_overflow', x: 36, y: 16 }],
      extras: [{ type: 'lanternString', x: 20, y: 14, oy: -16 }],
    },
    route1: {
      extras: [{ type: 'spiceSpill', x: 21, y: 60 }, { type: 'sackPile', x: 12, y: 59 }],
    },
    ashfall: {
      patches: [{ id: 'festival_corner', x: 25, y: 13 }, { id: 'market_stall_row', x: 33, y: 15 }],
      extras: [{ type: 'lanternString', x: 22, y: 12, oy: -16 }, { type: 'spiceSpill', x: 28, y: 18 }],
    },
  },
  6: { // summer: picnics, lilies, busy banks
    town: {
      extras: [
        { type: 'picnicBlanket', x: 15, y: 34, oy: 0 }, { type: 'basket', x: 16, y: 34 },
        { type: 'lilyPad', x: 6, y: 32, oy: -2 }, { type: 'duck', x: 9, y: 30, oy: -2 },
      ],
    },
    route1: {
      patches: [{ id: 'rain_pool', x: 24, y: 47 }],
      extras: [
        { type: 'reedCluster', x: 7, y: 49, oy: -2 }, { type: 'lilyPad', x: 7, y: 51, oy: -2 },
        { type: 'reedCluster', x: 33, y: 53, oy: -2 },
      ],
    },
    ashfall: {
      extras: [
        { type: 'lilyPad', x: 6, y: 27, oy: -2 }, { type: 'picnicBlanket', x: 13, y: 28, oy: 0 },
        { type: 'frog', x: 10, y: 29, oy: 0 },
      ],
    },
  },
  7: { // heat-dry: sundials, pasture, moths in the alleys
    town: {
      patches: [{ id: 'sundial_lawn', x: 2, y: 18 }, { id: 'gazebo', x: 36, y: 15 }],
      extras: [{ type: 'waterTrough', x: 31, y: 33 }, { type: 'haybale', x: 40, y: 21 }],
    },
    route1: {
      patches: [{ id: 'cloud_pasture', x: 28, y: 32 }],
      extras: [{ type: 'haybale', x: 30, y: 56 }, { type: 'woolSnag', x: 13, y: 47 }],
    },
    ashfall: {
      patches: [{ id: 'moth_market', x: 36, y: 12 }],
      extras: [{ type: 'laundryLine', x: 6, y: 14, ox: 8, oy: 0 }, { type: 'mothCage', x: 26, y: 17 }],
    },
  },
  8: { // harvest: pumpkins, yard clutter, ambush dressing
    town: {
      patches: [{ id: 'pumpkin_patch', x: 36, y: 16 }],
      extras: [
        { type: 'herbRow', x: 2, y: 19, oy: 2 }, { type: 'logPile', x: 40, y: 21 },
        { type: 'sackPile', x: 31, y: 33 },
      ],
    },
    route1: {
      patches: [
        { id: 'overturned_cart', x: 30, y: 55 }, { id: 'hunter_blind', x: 33, y: 28 },
        { id: 'spider_silk', x: 28, y: 16 },
      ],
      extras: [{ type: 'fallenLog', x: 13, y: 47 }],
    },
    ashfall: {
      extras: [
        { type: 'herbBundle', x: 5, y: 15, oy: -6 }, { type: 'sackPile', x: 38, y: 16 },
        { type: 'pumpkin', x: 14, y: 28 },
      ],
    },
  },
  9: { // early autumn: scarecrows, kind graveyards, owl roads
    town: {
      patches: [{ id: 'memorial_bench', x: 2, y: 23 }],
      extras: [
        { type: 'scarecrow', x: 36, y: 17, oy: -6 }, { type: 'pumpkin', x: 31, y: 33 },
        { type: 'topiary', x: 3, y: 18 },
      ],
    },
    route1: {
      patches: [{ id: 'haunted_lane', x: 5, y: 36 }, { id: 'bone_cairn', x: 28, y: 32 }],
      extras: [{ type: 'owlPerch', x: 33, y: 28, oy: -6 }],
    },
    ashfall: {
      extras: [
        { type: 'scarecrow', x: 12, y: 28, oy: -6 }, { type: 'topiary', x: 15, y: 26 },
        { type: 'pumpkin', x: 38, y: 16 },
      ],
    },
  },
  10: { // festival & folklore: derbies, salt, fen lights
    town: {
      patches: [{ id: 'snail_derby', x: 30, y: 32 }],
      extras: [{ type: 'saltCircle', x: 17, y: 18, oy: 0 }, { type: 'scarecrow', x: 2, y: 19, oy: -6 }],
    },
    route1: {
      patches: [
        { id: 'mushroom_hollow', x: 4, y: 32 }, { id: 'haunted_lane', x: 5, y: 36 },
        { id: 'fen_lights', x: 13, y: 53 },
      ],
      extras: [{ type: 'owlPerch', x: 28, y: 16, oy: -6 }],
    },
    ashfall: {
      patches: [{ id: 'festival_corner', x: 25, y: 13 }],
      extras: [
        { type: 'snail', x: 27, y: 17, ox: 6, oy: 2 }, { type: 'saltCircle', x: 26, y: 18, oy: 0 },
      ],
    },
  },
  11: { // wet-gray: story fires, compost, marsh waymarks
    town: {
      patches: [{ id: 'meeting_stump', x: 36, y: 16 }, { id: 'compost_charm', x: 2, y: 18 }],
      extras: [{ type: 'rainBarrel', x: 40, y: 8 }],
    },
    route1: {
      patches: [{ id: 'rain_pool', x: 24, y: 47 }, { id: 'marsh_walk', x: 13, y: 53 }],
      extras: [{ type: 'driftwood', x: 30, y: 53, ox: -4 }, { type: 'campfireLit', x: 8, y: 47 }],
    },
    ashfall: {
      extras: [
        { type: 'cauldron', x: 5, y: 15 }, { type: 'bulletinBoard', x: 25, y: 13 },
        { type: 'rainBarrel', x: 38, y: 16 },
      ],
    },
  },
  12: { // deep-winter festival: lantern strings, bell shards, lit gates
    town: {
      patches: [{ id: 'chimney_smoke', x: 36, y: 16 }],
      extras: [
        { type: 'lanternString', x: 20, y: 14, oy: -16 }, { type: 'lanternString', x: 25, y: 14, ox: 8, oy: -16 },
        { type: 'candleStick', x: 34, y: 12 }, { type: 'brazier', x: 20, y: 3 },
      ],
    },
    route1: {
      patches: [{ id: 'bell_shards', x: 28, y: 16 }],
      extras: [
        { type: 'candleStick', x: 16, y: 13 }, { type: 'wishRibbon', x: 18, y: 12, oy: -4 },
        { type: 'campfireLit', x: 8, y: 47 },
      ],
    },
    ashfall: {
      extras: [
        { type: 'lanternString', x: 21, y: 12, oy: -16 }, { type: 'lanternString', x: 22, y: 28, oy: -16 },
        { type: 'brazier', x: 24, y: 33 }, { type: 'candleStick', x: 19, y: 4 },
      ],
    },
  },
};

/** Lore / reward text keyed by patch id, then prop type. */
export const SPRINKLE_LORE = {
  toll_ruin: {
    sign: {
      name: 'TOLL BOOTH',
      text: 'TOLL: 2 copper per cart, 1 per mule, heroes free (waved through, historically). The box is still bolted down. The booth has been empty thirty years.',
    },
  },
  barbed_wire: {
    sign: {
      name: 'WARNING',
      text: 'ASH SCRUB PAST THE WIRE. If you can read this, you are the kind of person this sign was not written for.',
    },
  },
  hunter_blind: {
    sign: {
      name: 'NOTCHES',
      text: 'Tally marks on the log: slimes, 41. Bats, 12. "The big one," circled twice and crossed out once.',
    },
  },
  childrens_circle: {
    sign: {
      name: 'CHALK',
      text: 'PIP WAS HERE. Below, smaller: SO WAS MEG. Below that, smallest: the snail was here first.',
    },
  },
  snail_trail: {
    sign: {
      name: 'TINY SIGN',
      text: 'SNAIL CROSSING. Expect delays. The snails certainly do.',
    },
  },
  borrowed_stacks: {
    sign: {
      name: 'LIBRARY SLIP',
      text: 'BORROWED LIBRARY RULES: take a book, leave a book, return whenever. Overdue list, vol. III, is itself overdue.',
    },
  },
  moth_market: {
    sign: {
      name: 'NOTICE',
      text: 'MOTH MARKET — opens after rain, closes before reason. Lanterns stay lit for whoever the moths bring in.',
    },
  },
  rat_hole: {
    sign: {
      name: 'GRATE',
      text: 'Something scratched under the bars. The Gryphon cellar is two streets that way, which is probably unrelated.',
    },
  },
  witchs_stoop: {
    sign: {
      name: 'POLITE WARNING',
      text: 'Please do not knock before noon, after dusk, or while the cauldron is humming. Herbs for sale when the broom is upright. The broom is rarely upright.',
    },
  },
  bell_shards: {
    bellCracked: {
      name: 'CRACKED BELL',
      text: 'A shard of the sky bell, half-buried where it fell. Touch it and your teeth hum one low note.',
    },
  },
  haunted_lane: {
    scarecrow: {
      name: 'SCARECROW',
      text: 'It faces the road no matter where you stand. You checked twice. You will not check a third time.',
    },
    offeringBowl: { hp: 6, flag: 'offering_haunted' },
  },
  pilgrim_steps: {
    donationShoes: { hp: 8, flag: 'offering_pilgrim' },
    statueSmall: {
      name: 'WAYSTONE',
      text: 'Pilgrims pass this way each thaw-end. Their candles outlast their footprints.',
    },
  },
  snail_derby: {
    sign: {
      name: 'DERBY RULES',
      text: 'ANNUAL SNAIL DERBY — no salt, no shoving, no betting against Penny. Finish line: eventually.',
    },
  },
  wayside_shrine: {
    candleStick: {
      name: 'CANDLE',
      text: 'Someone relights it every dusk. No one has ever seen who.',
    },
  },
  trash_heap: {
    oracleBin: {
      name: 'RUBBISH ORACLE',
      pages: [
        { name: 'RUBBISH ORACLE', text: 'A magpie stares from the heap. "Ask," it seems to say. Or maybe that\'s the wind in the wrappers.' },
        { name: 'RUBBISH ORACLE', text: '"The boulder hides what the road forgot. The west fork remembers." ...It said that. Probably.' },
      ],
      gold: [4, 9],
      flag: 'oracle_route1',
    },
  },
  bulletin_board: {
    bulletinBoard: {
      name: 'NOTICE BOARD',
      rotate: [
        { text: 'WANTED: Hero with working arms. REWARD: Gratitude (non-transferable).' },
        { text: 'LOST: One laundry line peg. Reward: Silence from Mrs Vale at the shop.' },
        { text: 'REMINDER: Training yard closes at dusk. Dummies do not sleep; they wait.' },
      ],
    },
  },
  echo_mark: {
    echoSign: {
      name: 'WALL',
      echo: true,
      flag: 'echo_mark_done',
      text: 'Carved deep: SHOUT HERE. The cave answers back, but only on Tuesdays. It is not Tuesday.',
      echoAgain: 'The wall hums faintly. Something far away hums back, once.',
    },
  },
  offering_bowl: {
    offeringBowl: { hp: 8, flag: 'offering_route1' },
  },
  shrine_nook: {
    donationShoes: { hp: 10, flag: 'offering_ashfall_nook' },
  },
  bridge_shrine: {
    statueSmall: {
      name: 'SHRINE',
      text: 'For safe crossing. Leave a pebble, take a breath. The bridge creaks either way.',
    },
  },
  pit_chalk: {
    pitPoster: {
      name: 'POSTER',
      text: 'THE PIT — 10 gold, three rounds, all the glory you can carry. No refunds. Especially not for cowards.',
    },
  },
  mail_stop: {
    mailbox: {
      name: 'MAIL',
      text: 'Out: three letters to Ashfall (unclaimed). In: one bill for Bram. Status: avoided.',
    },
  },
  bird_feeder: {
    birdFeeder: {
      name: 'FEEDER',
      text: 'The birds here eat crumbs and secrets. Today they got crumbs.',
      gold: [2, 6],
      flag: 'feeder_town',
    },
  },
  milestone: {
    milestoneStone: {
      name: 'MILESTONE',
      text: 'Hollow Road — 2 leagues to Eldermoor. 1 league to the Cave. Ashfall gates lie west, sealed until the Warden falls.',
    },
  },
  memorial_bench: {
    sign: {
      name: 'PLAQUE',
      text: 'For those who walked the Hollow and did not walk back. Sit a while; the garden remembers.',
    },
  },
  miners_lunch: {
    stewPot: {
      name: 'LUNCH PAIL',
      text: 'Cold stew and a note: "Do NOT touch the north lever until B clears the west tunnel." B never cleared the west tunnel.',
    },
  },
  campfire_cold: {
    campfireRing: {
      name: 'ASHES',
      text: 'Someone camped here recently. The ring is cold, but the soot is still soft under your boot.',
    },
  },
  guard_post: {
    sign: {
      name: 'ORDERS',
      text: 'CAPT HALE: No one through the south gate without papers. (Papers = looking confident.)',
    },
  },
  mushroom_ring: {
    toadstoolCluster: {
      name: 'SCRATCHING',
      text: 'Something circled here on purpose. The mushrooms grew anyway. Bold of them.',
    },
  },
  cliff_vista: {
    chimeStrand: {
      name: 'VIEW',
      text: 'The ledge looks into the boulder nook. From here you can see why the road keeper hid a chest there.',
    },
  },
  crystal_grotto: {
    crystalCluster: {
      name: 'CRYSTALS',
      text: 'The stone catches torchlight and throws it back softer. Miners called this room "the apology."',
    },
  },
  marsh_walk: {
    bootStuck: {
      name: 'BOOT',
      text: 'A boot stuck in the mud, laces still tied. Someone left in a hurry — or was pulled.',
    },
  },
  dock_corner: {
    fishRack: {
      name: 'DOCK',
      text: 'Jun swears the chimers bite best at dusk. The ducks swear otherwise.',
    },
  },
};

/* ---- BFS reachability guard (WORLD_AREAS §5.3 step 9) ---- */

function portalSeeds(def) {
  const seeds = [];
  for (const p of def.portals || []) {
    seeds.push([
      Math.floor(p.x + (p.w || 1) * 0.5),
      Math.floor(p.y + (p.h || 1) * 0.5),
    ]);
  }
  for (const b of def.buildings || []) {
    if (b.door) seeds.push([b.door.x, b.door.y]);
  }
  return seeds;
}

function bfsReachable(solid, mw, mh, sx, sy) {
  const out = new Set();
  if (sx < 0 || sy < 0 || sx >= mw || sy >= mh) return out;
  if (solid[sy * mw + sx]) return out;
  const q = [[sx, sy]];
  out.add(sy * mw + sx);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
      const i = ny * mw + nx;
      if (solid[i] || out.has(i)) continue;
      out.add(i);
      q.push([nx, ny]);
    }
  }
  return out;
}

function applyPatchSolids(solid, mw, mh, patchDef, ox, oy) {
  const next = new Uint8Array(solid);
  for (let y = 0; y < patchDef.rows.length; y++) {
    const row = patchDef.rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const tx = ox + x, ty = oy + y;
      if (tx < 0 || ty < 0 || tx >= mw || ty >= mh) continue;
      if (TILDEF[ch]?.solid || SOLID_CHARS.has(ch)) next[ty * mw + tx] = 1;
    }
  }
  return next;
}

/** Reject stamps that seal a portal route (BFS from first seed must still reach other seeds). */
export function validateStamp(world, ox, oy, patchDef) {
  const def = world.def;
  if (!def?.grid || !world.solid || !patchDef?.rows) return true;
  const { w: mw, h: mh } = def.grid;
  const seeds = portalSeeds(def);
  if (seeds.length < 2) return true;

  const before = world.solid;
  const after = applyPatchSolids(before, mw, mh, patchDef, ox, oy);
  const origin = seeds[0];
  const reachBefore = bfsReachable(before, mw, mh, origin[0], origin[1]);
  const reachAfter = bfsReachable(after, mw, mh, origin[0], origin[1]);

  for (const [tx, ty] of seeds.slice(1)) {
    const i = ty * mw + tx;
    if (!reachBefore.has(i)) continue;
    if (!reachAfter.has(i)) return false;
  }
  return true;
}

/**
 * Apply sprinkle plan for a loaded map.
 * @param {import('./world.js').World} world
 * @param {string} mapId
 * @param {object} flags
 */
export function applyMapSprinkles(world, mapId, flags) {
  const month = flags?.month;
  const plans = [MAP_SPRINKLES[mapId], MONTH_SPRINKLES[month]?.[mapId]];
  for (const plan of plans) {
    if (!plan) continue;
    for (const p of plan.patches || []) {
      const def = PATCH_BY_ID[p.id];
      if (def) world.stampPatch(def, p.x, p.y, p.id);
    }
    for (const e of plan.extras || []) {
      world.spawnDecor(e, flags);
    }
  }
}

export { PATCH_BY_ID, TILE_MAP, SOLID_CHARS, TILDEF };
