// ASHEN VALE — dialog trees + tutorial quest chain.
// Stages: 0 meet elder, 1 train on dummies, 2 get weapon from Bram,
// 3 report to elder, 4 reach cave & slay Warden, 5 go to Ashfall, 6 done.

export const QUEST_TEXT = {
  0: { title: 'THE BELL STILL RINGS', objs: [{ id: 'meet', text: 'Speak with Elder Maren (ELDER HALL, west of plaza)' }] },
  1: { title: 'PROVE YOUR ARM', objs: [{ id: 'dummies', text: 'Destroy training dummies in the yard (south-east)', count: 3 }] },
  2: { title: 'STEEL FOR THE ROAD', objs: [{ id: 'smith', text: 'Get a weapon from Bram (SMITHY)' }] },
  3: { title: 'STEEL FOR THE ROAD', objs: [{ id: 'report', text: 'Return to Elder Maren' }] },
  4: { title: 'THE HOLLOW ROAD', objs: [
    { id: 'cave', text: 'Travel north up the Hollow Road' },
    { id: 'warden', text: 'Slay the STONE WARDEN in Hollow Cave' },
  ] },
  5: { title: 'GATES OF ASHFALL', objs: [{ id: 'ashfall', text: 'Pass the western gate to Ashfall' }] },
  6: { title: 'ASHFALL', objs: [{ id: 'roam', text: 'Explore Ashfall — the Pit, the pond, the shrine, the lost cat.' }] },
};

// Each dialog: (game) => array of { name, text } pages; optional onDone(game).
export const DIALOGS = {
  elder: (g) => {
    const s = g.flags.stage;
    if (s === 0) return {
      pages: [
        { name: 'ELDER MAREN', text: 'So. The bell woke one more. Welcome to Eldermoor, stranger — last lit hearth before the Hollow Road.' },
        { name: 'ELDER MAREN', text: 'Ashfall has sealed its gates. Something below the Hollow Cave holds the wards shut... a Warden of old stone, gone wrong.' },
        { name: 'ELDER MAREN', text: 'Before I send you to die, show me you can swing. The training yard is south-east. Break three dummies for old Maren.' },
      ],
      onDone: (g) => g.setStage(1),
    };
    if (s === 1) return { pages: [{ name: 'ELDER MAREN', text: 'The yard, child. South-east, past the fountain. Hit the dummies until the straw begs.' }] };
    if (s === 2) return { pages: [{ name: 'ELDER MAREN', text: 'Bram\'s forge glows day and night. Tell him Maren wants you armed properly.' }] };
    if (s === 3) return {
      pages: [
        { name: 'ELDER MAREN', text: 'Good steel. Good arm. Now listen well.' },
        { name: 'ELDER MAREN', text: 'Follow the Hollow Road north. A rusted lever opens the cave-ward gate. Inside the cave, two rune-levers open the Warden\'s vault.' },
        { name: 'ELDER MAREN', text: 'Slay the STONE WARDEN, and the gates of Ashfall will open. Drink tonics. Mind the dark. Come back alive — it makes the paperwork easier.' },
      ],
      onDone: (g) => g.setStage(4),
    };
    if (s === 4) return { pages: [{ name: 'ELDER MAREN', text: 'North, hero. The cave waits. The Warden does not age, but I do.' }] };
    return { pages: [{ name: 'ELDER MAREN', text: 'The bell rings lighter since you came. Ashfall owes you a debt. So do I.' }] };
  },

  smith: (g) => {
    const s = g.flags.stage;
    if (s === 2 && !g.flags.got_weapon) return {
      pages: [
        { name: 'BRAM', text: 'Maren sent you? Hah. She only sends the ones she likes.' },
        { name: 'BRAM', text: `Here — forged this for a ${g.player.klassName} just your size. Don't bury yourself with it.` },
      ],
      onDone: (g) => { g.giveStarterWeapon(); g.setStage(3); },
    };
    if (s < 2) return { pages: [{ name: 'BRAM', text: 'Forge is hot, patience is thin. Maren vouches for you first, then we talk steel.' }] };
    return { pages: [{ name: 'BRAM', text: 'Need more iron? I sell what I make. Browse, hero.' }], shop: 'smith' };
  },

  merchant: (g) => ({
    pages: [{ name: 'POSY', text: 'Tonics, trinkets, things that fell off carts. All certified mostly-legal.' }],
    shop: 'shop',
  }),

  innkeeper: (g) => ({
    pages: [{ name: 'OLD HET', text: 'Rest your bones, hero. On the house — Maren covers heroes\' tabs.' }],
    onDone: (g) => g.restAtInn(),
  }),

  guard: (g) => {
    if (g.flags.stage < 4) return { pages: [{ name: 'GUARD TOLL', text: 'The road north is no stroll. Elder Maren asked for you — her hall is west of the plaza. Get her blessing first.' }] };
    return { pages: [{ name: 'GUARD TOLL', text: 'Road\'s open for you, hero. Slimes by the bridge, bats past the ledge, and worse below. Walk loud.' }] };
  },

  villager1: () => ({ pages: [{ name: 'FERN', text: 'They say loot grows bolder the deeper you go. My cousin found a LEGENDARY ladle once. Ate soup like a king.' }] }),
  villager2: () => ({ pages: [{ name: 'WICK', text: 'Press I for your pack, K for your craft. An old family saying.' }] }),
  kid: () => ({ pages: [{ name: 'PIP', text: 'I saw the Warden once! In a dream! It was THIS big!! ...you\'ll be fine probably.' }] }),
  patron: () => ({ pages: [{ name: 'SOGGY DREW', text: 'The tall grass on the road... things rustle in it. Good XP though. *hic*' }] }),
  wanderer: () => ({ pages: [{ name: 'WANDERER', text: 'Pushed a boulder off the east nook once. Chest behind it. Never told a soul. ...dang it.' }] }),
  gatekeeper: (g) => {
    if (!g.flags.warden_dead) return { pages: [{ name: 'GATEKEEPER', text: 'Gates sealed by the wards. Nothing opens them while the Warden stands.' }] };
    return { pages: [{ name: 'GATEKEEPER', text: 'The wards fell... you actually did it. Ashfall opens to you, hero of Eldermoor!' }] };
  },

  /* ================= ASHFALL ================= */
  hale: (g) => {
    const c = g.flags.courier || 0;
    if (c === 0) return {
      pages: [
        { name: 'CAPTAIN HALE', text: 'Captain Hale, west wall. You\'re the one who cracked the Warden? Good arm.' },
        { name: 'CAPTAIN HALE', text: 'Do a soldier a favor — run this bill to OGGEN at the Pit, south-east corner. He pretends not to know me.' },
      ],
      onDone: (g) => { g.flags.courier = 1; g.startSideQuest('The Courier'); },
    };
    if (c === 1) return { pages: [{ name: 'CAPTAIN HALE', text: 'The Pit. South-east. Oggen. Big fellow, louder than the bell.' }] };
    if (c === 2) return {
      pages: [
        { name: 'CAPTAIN HALE', text: 'He paid?? Hah. Wonders never cease.' },
        { name: 'CAPTAIN HALE', text: 'Here — your cut, courier. Don\'t spend it all on tonics.' },
      ],
      onDone: (g) => g.finishSideQuest('courier', { gold: 25, xp: 15 }),
    };
    return { pages: [{ name: 'CAPTAIN HALE', text: 'Walls hold, hero. For now. Mind the alleys — they ring with little bells some nights.' }] };
  },

  oggen: (g) => {
    if (g.flags.courier === 1) return {
      pages: [
        { name: 'OGGEN', text: 'Hale\'s bill? HALE\'S BILL? That man counts coppers like they\'re children.' },
        { name: 'OGGEN', text: '...Fine. FINE. Tell him the Pit pays its debts. Now — you here to gawk, or to FIGHT?' },
      ],
      onDone: (g) => { g.flags.courier = 2; g.updateQuestUI(); g.save(); },
    };
    if (g.arena) return { pages: [{ name: 'OGGEN', text: 'The Pit has your coin and the Pit wants a SHOW. Get in there!' }] };
    const wins = g.flags.arena_wins || 0;
    if (g.player.gold < 10) return {
      pages: [{ name: 'OGGEN', text: 'Ten gold, three rounds, all the glory you can carry. Come back when your purse jingles.' }],
    };
    return {
      pages: [
        { name: 'OGGEN', text: wins > 0
          ? `Back for more? The Pit remembers you. ${wins} win${wins > 1 ? 's' : ''} and counting.`
          : 'Welcome to the Pit, hero. Ten gold buys three rounds. Win, and you carry out more than you carried in.' },
        { name: 'OGGEN', text: 'Coin taken. Gate\'s open. The Pit decides the rest!' },
      ],
      onDone: (g) => g.startArena(),
    };
  },

  tilly: (g) => {
    const r = g.flags.rats_q || 0;
    if (r === 0) return {
      pages: [
        { name: 'TILLY', text: 'Welcome to the Gryphon, love. Beds are soft, soup is grey, fire\'s honest.' },
        { name: 'TILLY', text: 'Though — if you\'re the fighting kind — something\'s down in my cellar knocking the kegs about. Clear it out and dinner\'s on me forever.' },
      ],
      onDone: (g) => { g.flags.rats_q = 1; g.startSideQuest('Pest Control'); },
    };
    if (r === 1 && (g.flags.rats_killed || 0) >= 5) return {
      pages: [
        { name: 'TILLY', text: 'It\'s QUIET down there. Blessed quiet. You wonderful thing.' },
        { name: 'TILLY', text: 'Here — coin, a tonic, and the good linens whenever you want a rest. Forever, like I said.' },
      ],
      onDone: (g) => g.finishSideQuest('rats', { gold: 30, potions: 1, item: 'magic', slot: 'armor', xp: 25 }),
    };
    if (r === 1) return {
      pages: [{ name: 'TILLY', text: 'Stairs at the back, by the big keg. Mind the smell. And the teeth.' }],
    };
    return {
      pages: [{ name: 'TILLY', text: 'Rest your bones, hero. Room\'s always made up for you.' }],
      onDone: (g) => g.restAtInn(),
    };
  },

  moth: (g) => ({
    pages: [
      { name: 'MOTH', text: 'Requests? I know three songs. Two are about soup. The third is about a bell that fell in a pond, and nobody requests that one.' },
    ],
    onDone: (g) => g.toast('Moth plays a crooked little waltz.'),
  }),

  ferris: () => ({ pages: [{ name: 'FERRIS', text: 'The Pit? Three rounds. I lasted one. The slime was very polite about it. *hic*' }] }),

  kettle: (g) => ({
    pages: [{ name: 'KETTLE', text: 'Kettle. Armory. Warden-dust still on your boots? Then you\'ve earned a look at the good rack.' }],
    shop: 'armory',
  }),

  jun: (g) => {
    const j = g.flags.jun_q || 0, fc = g.flags.fish_caught || 0;
    if (j === 0) return {
      pages: [
        { name: 'JUN', text: 'They say the pond ate a bell once. Now the fish chime when they bite. Cast at the ripples and listen.' },
        { name: 'JUN', text: 'Catch me three chimers and I\'ll trade you something the deep coughed up.' },
      ],
      onDone: (g) => { g.flags.jun_q = 1; g.startSideQuest('Chime Fishing'); },
    };
    if (j === 1 && fc >= 3) return {
      pages: [
        { name: 'JUN', text: 'Three chimers! The pond likes you. It doesn\'t like most people.' },
        { name: 'JUN', text: 'As promised — the deep coughed this up last winter. It hums in the rain.' },
      ],
      onDone: (g) => g.finishSideQuest('fish', { gold: 20, trinket: 'rare', trinketLevel: '+1', xp: 20 }),
    };
    if (j === 1) return { pages: [{ name: 'JUN', text: `Patience. Wait for the bite — strike too soon and they laugh at you. ${fc}/3 so far.` }] };
    return { pages: [{ name: 'JUN', text: 'The pond hums lighter these days. Good catching weather.' }] };
  },

  tabb: (g) => {
    const cq = g.flags.cat_q || 0;
    if (cq === 0) return {
      pages: [
        { name: 'MRS TABB', text: 'Oh — hero — my WHISKERS is gone! Grey cat. Judgmental eyes. Tail like a question mark.' },
        { name: 'MRS TABB', text: 'He likes alleys, gardens, and other people\'s fish. Please. The house is too quiet.' },
      ],
      onDone: (g) => {
        g.flags.cat_q = 1;
        g.flags.cat_spot = 1 + ((Math.random() * 3) | 0);
        g.spawnCat();
        g.startSideQuest('The Lost Cat');
      },
    };
    if (cq === 1 && g.flags.cat_found) return {
      pages: [
        { name: 'MRS TABB', text: 'He came home not a minute ago! Smug as a magistrate. Oh, thank you, thank you—' },
        { name: 'MRS TABB', text: 'Take this. It was my mother\'s. She\'d have liked you. The cat clearly does, which is rarer.' },
      ],
      onDone: (g) => g.finishSideQuest('cat', { gold: 20, trinket: 'magic', xp: 20 }),
    };
    if (cq === 1) return { pages: [{ name: 'MRS TABB', text: 'Check the alleys, dear. High places. Quiet corners. Anywhere a cat would judge you from.' }] };
    return { pages: [{ name: 'MRS TABB', text: 'Whiskers sleeps by the fire like nothing happened. Cats, dear. Cats.' }] };
  },

  penny: () => ({ pages: [{ name: 'PENNY', text: 'I touched the big gate once and Captain Hale whistled at me SO loud. Anyway there\'s a charm behind the tavern. Probably. I\'m not allowed back there.' }] }),
  hob: () => ({ pages: [{ name: 'HOB', text: 'Stall\'s been slow since the road sealed. You\'re the one who opened it? Best news all year. Tell your friends. Tell their friends.' }] }),
  lira: () => ({ pages: [{ name: 'LIRA', text: 'Little bells ring all over this city at night — lost charms, five of them. The shrine misses them, if you ask me. Nobody asks me.' }] }),
};
