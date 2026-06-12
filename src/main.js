// ASHEN VALE — main game orchestration.
import * as THREE from 'three';
import { Art, blitTo } from './art.js';
import { buildAllMaps } from './maps.js';
import { World, CAM_OFF } from './world.js';
import {
  Player, Enemy, Npc, RemotePlayer, Projectile, Drop, ENEMY_TYPES, dirToVec, makeLabel,
} from './entities.js';
import { Effects } from './fx.js';
import { CLASSES, classSkillList, skillDamage, skillDefFor, xpForLevel } from './skills.js';
import { buildCast, playerFx, applyTreeStats, unlockNode, levelUpChoices, treeNode } from './skilltree.js';
import { PhysObj, PHYS_TYPES } from './physics.js';
import { generateItem, shopStock, smithStock, armoryStock, resolveLootSpec, rollEnemyLoot, canEquipWeapon, itemStatDelta, formatStatDelta, getEquippedPassives, getEquippedProcs } from './items.js';
import { DIALOGS, QUEST_TEXT } from './quests.js';
import { UI } from './ui.js';
import { SFX, playMusic, stopMusic, initAudio } from './audio.js';
import { Net } from './net.js';
import { migrateLegacySave, loadSlot, writeSlot, SAVE_SLOTS } from './save.js';
import {
  partyScale as calcPartyScale, enemyDamage, bossEnrageSpeed, bossSummonCount,
  collectShareableFlags,
} from './coop.js';
import { SPRINKLE_LORE } from './worldSprinkles.js';
import { findActivePortal } from './portalIndicators.js';

const $ = (s) => document.querySelector(s);
const INTERIOR_SPAWN = {
  elder_house: [6.5, 9], inn: [6.5, 9], shop: [5.5, 8], smithy: [5.5, 8],
  tavern: [8.5, 10], armory: [5.5, 8], arena: [12.5, 17], tabb_house: [4.5, 7],
};
const FISH_NAMES = ['Bristlefin', 'Grey Chimer', 'Mudbell', 'Pondlord', 'Sootscale', 'Old Grumble'];

class Game {
  constructor() {
    this.maps = buildAllMaps();
    this.skillsApi = { xpForLevel };
    this.flags = { stage: 0, dummies_n: 0 };
    this.uiLock = false;
    this.running = false;
    this.mapId = null;
    this.npcs = [];
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.physObjs = [];
    this.remotes = new Map();
    this.shakeT = 0;
    this.arrivalHold = 0;
    this.portalGrace = false;
    this.activeDash = null; // knight Shield Rush hit tracking
    this.hazards = [];      // skill-tree ground effects (orbs, fields, traps, trails)
    this.timers = [];       // scheduled callbacks (delayed pulses)
    this.levelQueue = 0;    // pending level-up choice popups
    this.arena = null;      // Pit minigame state {wave, betweenT}
    this.fishing = null;    // fishing minigame state {state, t}
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.lastEnemySyncAt = -10;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.activeSlot = 0;
    this.reviveChannel = null;
    this.reviveT = 0;
    this.nextDropId = 1;
    this.wardenDamagers = null; // Set<number> of net ids who damaged the Warden this fight
  }

  partyEnrageSpeed() { return bossEnrageSpeed(this.net); }
  partyScale() { return calcPartyScale(this.net); }

  recordEnemyDamage(enemy, attackerId) {
    if (!enemy.damagers) enemy.damagers = new Set();
    enemy.damagers.add(attackerId);
  }

  scaledEnemy(type, x, z) {
    return new Enemy(type, x, z, this.net.connected ? this.partyScale() : null);
  }

  openChestVisual(pr) {
    if (pr.opened) return;
    pr.opened = true;
    this.flags[`opened_${pr.id}`] = true;
    pr.mesh.material.map.dispose();
    pr.mesh.material.map = new THREE.CanvasTexture(Art.props.chestOpen);
    pr.mesh.material.map.magFilter = THREE.NearestFilter;
    pr.mesh.material.map.minFilter = THREE.NearestFilter;
    pr.mesh.material.needsUpdate = true;
  }

  openChest(pr) {
    if (pr.id === 'boss_chest') {
      this.openBossVault(pr);
      return;
    }
    if (this.flags[`opened_${pr.id}`] || pr.opened) return;
    this.openChestVisual(pr);
    SFX.chest();
    this.fx.chestOpen(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5));
    this.giveLoot(pr.loot, pr, { direct: true });
    if (this.net.connected) this.net.sendEvent('chestOpen', { id: pr.id });
    this.save();
  }

  canClaimWardenVault() {
    if (!this.net.connected) return true;
    if (!this.wardenDamagers || this.wardenDamagers.size === 0) return true;
    return this.wardenDamagers.has(this.net.id);
  }

  openBossVault(pr) {
    if (!this.flags.warden_dead) return;
    if (this.flags.boss_chest_claimed) {
      SFX.deny();
      this.toast('You already claimed your vault reward');
      return;
    }
    if (!this.canClaimWardenVault()) {
      SFX.deny();
      this.toast('Only those who fought the Warden may claim the vault');
      return;
    }
    const firstVisual = !this.flags[`opened_${pr.id}`] && !pr.opened;
    if (firstVisual) {
      this.openChestVisual(pr);
      if (this.net.connected) this.net.sendEvent('chestOpen', { id: pr.id });
    }
    SFX.chest();
    if (firstVisual) this.fx.chestOpen(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5));
    this.giveLoot(pr.loot, pr, { direct: true });
    this.flags.boss_chest_claimed = true;
    this.toast('Vault reward claimed — class trophy is yours', true);
    this.save();
  }

  serializeDropData(kind, data) {
    if (kind === 'gold' || kind === 'potion') return data;
    return {
      name: data.name, icon: data.icon, slot: data.slot, rarity: data.rarity,
      baseId: data.baseId, affixes: data.affixes,
    };
  }

  separatePlayers() {
    if (!this.net.connected) return;
    const p = this.player;
    for (const rp of this.remotes.values()) {
      if (rp.map !== this.mapId) continue;
      const dx = p.pos.x - rp.pos.x, dz = p.pos.z - rp.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.55 && d > 0.01) {
        const push = (0.55 - d) * 0.5;
        p.pos.x += (dx / d) * push;
        p.pos.z += (dz / d) * push;
      }
    }
  }

  /* ============ boot / rendering ============ */
  initRenderer() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ canvas: $('#game-canvas'), antialias: false });
    const setSize = () => {
      const k = 2.4; // chunky pixel render scale
      this.renderer.setSize(Math.floor(innerWidth / k), Math.floor(innerHeight / k), false);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    };
    setSize();
    addEventListener('resize', setSize);
    this.world = new World(this.scene);
    this.fx = new Effects(this.scene);
    this.ui = new UI(this);
    this.net = new Net(this);
  }

  /* ============ save / load ============ */
  save() {
    if (!this.player || this.activeSlot == null) return;
    const p = this.player;
    const prev = loadSlot(this.activeSlot) || {};
    writeSlot(this.activeSlot, {
      klass: p.klass, level: p.level, xp: p.xp, gold: p.gold, potions: p.potions,
      skillPoints: p.skillPoints, skillLevels: p.skillLevels, nodes: p.nodes,
      inventory: p.inventory, equip: p.equip,
      flags: this.flags, mapId: this.mapId, x: p.pos.x, z: p.pos.z,
      lastRoom: this.net.connected ? this.net.room : (prev.lastRoom || ''),
      lastHeroName: this.net.connected ? this.net.heroName : (prev.lastHeroName || ''),
    });
  }
  loadSave(slot) {
    return loadSlot(slot);
  }

  /* ============ game start ============ */
  async start(klass, save, coop, slotIndex = 0) {
    this.activeSlot = slotIndex;
    this.player = new Player(klass);
    if (save) {
      const p = this.player;
      Object.assign(p, {
        level: save.level, xp: save.xp, gold: save.gold, potions: save.potions,
        skillPoints: save.skillPoints, skillLevels: save.skillLevels || {},
        nodes: save.nodes || {},
        inventory: save.inventory || [], equip: save.equip || { weapon: null, armor: null, trinket: null },
      });
      // migrate saves to the current skill list
      for (const s of classSkillList(klass)) p.skillLevels[s.id] = p.skillLevels[s.id] || 1;
      this.flags = save.flags || this.flags;
      p.recalcStats();
      p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    }
    applyTreeStats(this.player);
    this.scene.add(this.player.sprite.group);

    if (coop) {
      this.ui.setCoopStatus({ line: 'connecting to coop server...' });
      const url = coop.url || undefined;
      const ok = await this.net.connect(coop.room, coop.name, klass, url);
      if (ok) {
        this.ui.setCoopStatus(this.net.coopStatusLine());
        this.announceCoopJoin();
      } else {
        this.ui.setCoopStatus({ line: 'co-op unavailable (server offline or room full) — playing solo', worldNote: '' });
        this.toast('Could not join co-op — continuing solo');
      }
    } else {
      this.ui.setCoopStatus(null);
    }

    this.ui.initHotbar(this.player);
    const mapId = save?.mapId && this.maps[save.mapId] ? save.mapId : 'town';
    const x = save?.x ?? 21.5, z = save?.z ?? 19;
    this.loadMap(mapId, x, z, true);
    $('#hud').classList.remove('hidden');
    this.updateQuestUI();
    if (!save) {
      this.ui.startDialog([
        { name: '???', text: 'The bell of Eldermoor rings for the first time in years... and you wake at the fountain, road-dust still on your boots.' },
        { name: '???', text: 'Find ELDER MAREN. Her hall stands west of the plaza. (Move with WASD. Talk with E. Attack with LEFT CLICK.)' },
      ]);
    }
    this.player.revivesLeft = 2;
    this.running = true;
  }

  /* ============ maps ============ */
  loadMap(id, px, pz, silent = false) {
    const def = this.maps[id];
    // walking out of the Pit forfeits the round
    if (this.arena && id !== 'arena') {
      this.arena = null;
      this.toast('The Pit does not refund cowards. — Oggen');
    }
    if (this.fishing) this.endFishing(false);
    this.mapId = id;
    if (this.player) this.player.revivesLeft = 2;
    // clear dynamic things
    for (const n of this.npcs) this.scene.remove(n.sprite.group);
    for (const e of this.enemies) this.scene.remove(e.sprite.group);
    for (const pr of this.projectiles) this.scene.remove(pr.mesh);
    for (const d of this.drops) this.scene.remove(d.mesh);
    for (const o of this.physObjs) this.scene.remove(o.group);
    this.npcs = []; this.enemies = []; this.projectiles = []; this.drops = []; this.physObjs = [];
    for (const h of this.hazards) if (h.mesh) this.scene.remove(h.mesh);
    this.hazards = []; this.timers = [];
    this.activeDash = null;
    this.fx.clear();

    this.world.glow = this.fx.glow;
    this.world.load(def, this.flags);

    // knockable / breakable scenery (pots, crates, barrels, rocks)
    for (const pd of def.props) {
      if (!PHYS_TYPES[pd.type]) continue;
      const o = new PhysObj(pd.type, pd.x, pd.y);
      this.scene.add(o.group);
      this.physObjs.push(o);
    }

    // spawn npcs
    for (const nd of def.npcs) {
      const npc = new Npc(nd);
      const lbl = makeLabel(nd.id === 'elder' ? 'MAREN' : nd.id.toUpperCase().replace(/\d/g, ''));
      lbl.position.y = 1.1;
      npc.sprite.group.add(lbl);
      this.scene.add(npc.sprite.group);
      this.npcs.push(npc);
    }
    // spawn enemies (host authority; guests will be synced if host present)
    for (const ed of def.enemies) {
      if (ed.boss && this.flags.warden_dead) continue;
      const e = ed.type === 'dummy'
        ? new Enemy(ed.type, ed.x, ed.y)
        : this.scaledEnemy(ed.type, ed.x, ed.y);
      this.scene.add(e.sprite.group);
      this.enemies.push(e);
    }
    if (id === 'boss' && !this.flags.warden_dead) this.wardenDamagers = null;
    // boss chest reveal if already earned
    if (id === 'boss' && this.flags.warden_dead) this.revealBossChest();

    if (px != null && pz != null) this.player.pos.set(px, 0, pz);
    this.portalGrace = true;

    playMusic(id === 'boss' && !this.flags.warden_dead ? 'boss' : def.music);
    if (!silent) SFX.door();
    this.ui.showArea(def.name);
    this.ui.setBossBar(null);
    this.refreshRemoteVisibility();
    this.save();

    // first arrival in Ashfall — the demo's big moment
    if (id === 'ashfall' && !this.flags.end_shown) {
      this.flags.end_shown = true;
      this.setStage(6);
      this.arrivalHold = 2.8;
      this.uiLock = true;
      SFX.arrivalSting();
      this.save();
    }
    this.updateQuestUI();
  }

  showAshfallEndScreen() {
    const p = this.player;
    $('#end-text').textContent =
      `${p.klassName} of Eldermoor — LV ${p.level}, slayer of the Stone Warden. ` +
      `Ashfall opens its gates to you: the Pit pays winners, the pond pays the patient, ` +
      `and somewhere in these streets a cat is missing.`;
    $('#end-screen').classList.remove('hidden');
    this.endOpen = true;
    this.uiLock = true;
    this.save();
  }

  revealBossChest() {
    const def = this.maps.boss;
    const pd = def.props.find(p => p.id === 'boss_chest');
    if (!pd || this.world.props.find(p => p.id === 'boss_chest')) return;
    if (this.mapId === 'boss' && this.flags.warden_dead) {
      this.world.spawnProp({ ...pd }, this.flags);
    }
  }

  /* ============ quest machine ============ */
  setStage(n) {
    if (n <= this.flags.stage) return;
    this.flags.stage = n;
    if (n >= 4) this.flags.tut_done = true;
    SFX.questDone();
    const q = QUEST_TEXT[n];
    if (q) this.toast(`QUEST: ${q.title}`, true);
    this.updateQuestUI();
    this.save();
  }
  updateQuestUI() {
    const s = this.flags.stage;
    const prog = {
      meet: s > 0, dummies: s > 1, smith: s > 2, report: s > 3,
      cave: this.flags.visited_cave, warden: this.flags.warden_dead,
      ashfall: s > 5, dummies_n: this.flags.dummies_n,
    };
    this.ui.updateQuest(s, prog, this.sideQuestEntries(), s >= 6);
  }

  /** Ashfall side-quest tracker — full checklist at stage 6+, active-only before that. */
  sideQuestEntries() {
    const map = this.mapId;
    if (this.flags.stage < 6) return this.activeSideQuestEntries(map);
    const f = this.flags;
    const charms = this.charmCount();
    const entries = [];

    if ((f.courier || 0) >= 3) {
      entries.push({ text: 'The Courier — bill delivered', done: true });
    } else if (f.courier === 2) {
      entries.push({ text: 'Return to Captain Hale (south gate)', here: map === 'ashfall' });
    } else if (f.courier === 1) {
      entries.push({ text: "Deliver Hale's bill to Oggen (THE PIT)", here: map === 'arena' });
    } else {
      entries.push({ text: 'The Courier — talk to Captain Hale', here: map === 'ashfall', pending: true });
    }

    if ((f.rats_q || 0) >= 2) {
      entries.push({ text: 'Pest Control — cellar cleared', done: true });
    } else if (f.rats_q === 1) {
      const n = Math.min(5, f.rats_killed || 0);
      if (n >= 5) entries.push({ text: 'Tell Tilly the cellar is quiet', here: map === 'ashfall' });
      else entries.push({ text: `Clear the Gryphon cellar (${n}/5)`, here: map === 'cellar' });
    } else {
      entries.push({ text: 'Pest Control — ask Tilly at The Gryphon', here: map === 'ashfall', pending: true });
    }

    if ((f.cat_q || 0) >= 2) {
      entries.push({ text: 'Missing Cat — Whiskers home', done: true });
    } else if (f.cat_q === 1) {
      if (f.cat_found) entries.push({ text: 'Tell Mrs Tabb the good news', here: map === 'ashfall' || map === 'tabb_house' });
      else entries.push({ text: 'Find Whiskers (alleys & gardens)', here: map === 'ashfall' });
    } else {
      entries.push({ text: 'Missing Cat — ask Mrs Tabb', here: map === 'ashfall' || map === 'tabb_house', pending: true });
    }

    if ((f.jun_q || 0) >= 2) {
      entries.push({ text: 'Chime Fishing — three chimers delivered', done: true });
    } else if (f.jun_q === 1) {
      const n = Math.min(3, f.fish_caught || 0);
      if (n >= 3) entries.push({ text: 'Bring Jun the three chimers', here: map === 'tavern' });
      else entries.push({ text: `Catch chiming fish at the ponds (${n}/3)`, here: map === 'ashfall' });
    } else {
      entries.push({ text: 'Chime Fishing — ask Jun at the tavern', here: map === 'tavern' || map === 'ashfall', pending: true });
    }

    if (f.charm_reward) {
      entries.push({ text: 'Bell charms — shrine restored', done: true });
    } else {
      entries.push({
        text: `Bell charms (${charms}/5) — north plaza shrine`,
        here: map === 'ashfall' && charms < 5,
        pending: charms === 0,
      });
    }

    if ((f.arena_wins || 0) >= 1) {
      entries.push({ text: 'The Pit — won a bout', done: true });
    } else {
      entries.push({ text: 'The Pit — win a fight for Oggen', here: map === 'arena', pending: true });
    }

    return entries;
  }

  activeSideQuestEntries(map) {
    const f = this.flags;
    const entries = [];
    if (f.courier === 1) entries.push({ text: "Deliver Hale's bill to Oggen (THE PIT)", here: map === 'arena' });
    if (f.courier === 2) entries.push({ text: 'Return to Captain Hale (south gate)', here: map === 'ashfall' });
    if (f.rats_q === 1) {
      const n = Math.min(5, f.rats_killed || 0);
      if (n >= 5) entries.push({ text: 'Tell Tilly the cellar is quiet', here: map === 'ashfall' });
      else entries.push({ text: `Clear the Gryphon cellar (${n}/5)`, here: map === 'cellar' });
    }
    if (f.cat_q === 1) {
      if (f.cat_found) entries.push({ text: 'Tell Mrs Tabb the good news', here: map === 'ashfall' || map === 'tabb_house' });
      else entries.push({ text: 'Find Whiskers (alleys & gardens)', here: map === 'ashfall' });
    }
    if (f.jun_q === 1) {
      const n = Math.min(3, f.fish_caught || 0);
      if (n >= 3) entries.push({ text: 'Bring Jun the three chimers', here: map === 'tavern' });
      else entries.push({ text: `Catch chiming fish at the ponds (${n}/3)`, here: map === 'ashfall' });
    }
    const charms = this.charmCount();
    if (charms > 0 && !f.charm_reward) {
      entries.push({ text: `Bell charms (${charms}/5) — north plaza shrine`, here: map === 'ashfall' });
    }
    return entries;
  }
  charmCount() {
    let n = 0;
    for (let i = 1; i <= 5; i++) if (this.flags[`charm_charm${i}`]) n++;
    return n;
  }
  // Whiskers' hiding spot is rolled when the quest starts — spawn him into the
  // already-loaded city without waiting for a map reload.
  spawnCat() {
    if (this.mapId !== 'ashfall') return;
    const pd = this.maps.ashfall.props.find(p => p.type === 'cat' && p.ifFlag === `cat_spot:${this.flags.cat_spot}`);
    if (pd && !this.world.props.some(p => p.id === pd.id)) this.world.spawnProp(pd, this.flags);
  }
  startSideQuest(title) {
    SFX.questDone();
    this.toast(`SIDE QUEST: ${title}`, true);
    this.updateQuestUI();
    this.save();
  }
  finishSideQuest(id, reward) {
    if (id === 'courier') this.flags.courier = 3;
    else if (id === 'rats') this.flags.rats_q = 2;
    else if (id === 'cat') this.flags.cat_q = 2;
    else if (id === 'fish') this.flags.jun_q = 2;
    const p = this.player;
    if (reward.gold) { p.gold += reward.gold; this.toast(`+${reward.gold} gold`); }
    if (reward.potions) { p.potions += reward.potions; this.toast(`+${reward.potions} Vale Tonic`); }
    if (reward.item) {
      const slots = ['armor', 'trinket', 'weapon'];
      const slot = reward.slot || slots[(Math.random() * slots.length) | 0];
      this.spawnDrop('item', generateItem({
        slot, rarity: reward.item, level: p.level, klass: p.klass, classAffix: true,
        preferTier: slot === 'weapon' ? 1 : undefined,
      }), p.pos.clone());
    }
    if (reward.trinket) {
      const lvl = reward.trinketLevel === '+1' ? p.level + 1 : p.level;
      this.spawnDrop('item', generateItem({
        slot: 'trinket', rarity: reward.trinket, level: lvl, klass: p.klass,
        classAffix: true, quality: reward.trinket === 'rare' ? 0.78 : 0.55,
      }), p.pos.clone());
    }
    if (reward.xp) p.addXp(reward.xp, this);
    SFX.questDone();
    this.toast('SIDE QUEST COMPLETE', true);
    this.updateQuestUI();
    this.save();
  }

  /* ---- The Pit (arena minigame) ---- */
  startArena() {
    if (this.arena || this.mapId !== 'arena') return;
    if (this.net.connected && !this.allPartyWithin(4)) {
      SFX.deny();
      this.toast('The whole party must stand together to enter the Pit');
      return;
    }
    if (this.player.gold < 10) { SFX.deny(); return; }
    this.player.gold -= 10;
    this.arena = { wave: 0, betweenT: 1.6 };
    playMusic('boss');
    this.toast('THE PIT — round purchased. Get in!', true);
    this.save();
  }
  arenaWaveDefs() {
    const lvl = this.player.level;
    const waves = [
      [{ t: 'slime', n: 3 }, { t: 'bat', n: 1 }],
      [{ t: 'husk', n: 2 }, { t: 'bat', n: 2 }],
      [{ t: 'shade', n: 3 }, { t: 'husk', n: 1 }],
    ];
    if (lvl >= 6) waves[2].push({ t: 'shade', n: 1 });
    return waves;
  }
  arenaSpawnWave(idx) {
    const spots = [[8, 6], [17, 6], [8, 11], [17, 11], [12, 8], [13, 10]];
    let si = 0;
    for (const grp of this.arenaWaveDefs()[idx]) {
      for (let i = 0; i < grp.n; i++) {
        const [x, y] = spots[si++ % spots.length];
        const e = this.scaledEnemy(grp.t, x + (Math.random() - 0.5), y + (Math.random() - 0.5));
        this.scene.add(e.sprite.group);
        this.enemies.push(e);
        this.fx.particles(e.pos, 6, 2);
      }
    }
    SFX.bossRoar();
    this.toast(`ROUND ${idx + 1} OF 3`, true);
  }
  updateArena(dt) {
    if (!this.arena || this.mapId !== 'arena') return;
    const a = this.arena;
    if (this.enemies.length > 0) return;
    a.betweenT -= dt;
    if (a.betweenT > 0) return;
    if (a.wave >= 3) {
      // victory
      this.arena = null;
      this.flags.arena_wins = (this.flags.arena_wins || 0) + 1;
      const gold = 30 + this.player.level * 8;
      const center = new THREE.Vector3(13, 0, 9);
      this.spawnDrop('gold', gold, center);
      this.spawnDrop('item', generateItem({
        rarity: 'rare', level: this.player.level + 1, klass: this.player.klass,
        slot: 'weapon', classAffix: true, preferTier: 1,
      }), center.clone().add(new THREE.Vector3(0.8, 0, 0.4)));
      if (Math.random() < 0.25) this.spawnDrop('potion', 1, center.clone().add(new THREE.Vector3(-0.8, 0, 0.4)));
      SFX.questDone();
      this.shake(0.5);
      this.toast('THE PIT ROARS — YOU WIN! Collect your purse.', true);
      playMusic('cave');
      this.save();
    } else {
      a.wave++;
      a.betweenT = 2.2;
      this.arenaSpawnWave(a.wave - 1);
    }
  }

  /* ---- fishing minigame ---- */
  startFishing() {
    if (this.fishing || this.uiLock) return;
    this.fishing = { state: 'wait', t: 1.2 + Math.random() * 2.2 };
    this.uiLock = true;
    $('#dialog-name').textContent = 'FISHING';
    $('#dialog-text').textContent = 'You cast your line into the grey water...';
    $('#dialog-box').classList.remove('hidden');
    SFX.push();
  }
  fishingPress() {
    const f = this.fishing;
    if (!f) return;
    if (f.state === 'wait') {
      f.state = 'end'; f.t = 1.0;
      $('#dialog-text').textContent = 'Too eager. The fish know. They always know.';
      SFX.deny();
    } else if (f.state === 'bite') {
      f.state = 'end'; f.t = 1.4;
      const name = FISH_NAMES[(Math.random() * FISH_NAMES.length) | 0];
      const gold = 5 + ((Math.random() * 8) | 0);
      this.player.gold += gold;
      this.flags.fish_caught = (this.flags.fish_caught || 0) + 1;
      $('#dialog-text').textContent = `A ${name}! It chimes as it surfaces. (+${gold}g)`;
      SFX.chest();
      this.fx.ring(this.player.pos, 0.9, 0.4);
      this.updateQuestUI();
      this.save();
    } else if (f.state === 'end') {
      this.endFishing(true);
    }
  }
  updateFishing(dt) {
    const f = this.fishing;
    if (!f) return;
    f.t -= dt;
    if (f.t > 0) return;
    if (f.state === 'wait') {
      f.state = 'bite'; f.t = 0.7;
      $('#dialog-text').textContent = '!!! — [E] NOW!';
      SFX.lever();
    } else if (f.state === 'bite') {
      f.state = 'end'; f.t = 1.2;
      $('#dialog-text').textContent = '...it slips away with a tiny, mocking chime.';
      SFX.deny();
    } else this.endFishing(true);
  }
  endFishing(sound) {
    this.fishing = null;
    $('#dialog-box').classList.add('hidden');
    this.unlockUI();
    if (sound) SFX.ui();
  }
  giveStarterWeapon() {
    const item = generateItem({
      slot: 'weapon', rarity: 'magic', level: 1, klass: this.player.klass,
      preferTier: 1, classAffix: true, quality: 0.55,
    });
    this.player.equip.weapon = item;
    this.player.recalcStats();
    SFX.chest();
    this.toast(`Received ${item.name}!`, true);
    this.flags.got_weapon = true;
    this.save();
  }
  restAtInn() {
    const p = this.player;
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    SFX.potion();
    this.toast('You feel rested. HP/MP restored.');
  }

  /* ============ interaction ============ */
  // Returns { label } for the nearest interactable (used for the [E] prompt)
  findInteractable() {
    const p = this.player;
    const [fdx, fdz] = dirToVec(p.dir);
    const fx = p.pos.x + fdx * 0.9, fz = p.pos.z + fdz * 0.9;
    for (const npc of this.npcs) {
      if (npc.pos.distanceTo(p.pos) < 1.25) return { label: 'TALK' };
    }
    for (const pr of this.world.props) {
      const d = Math.hypot(pr.x + 0.5 - p.pos.x, pr.y + 0.5 - p.pos.z);
      if (pr.type === 'sign' && d < 1.2) return { label: 'READ' };
      if (pr.type === 'chest' && pr.id === 'boss_chest' && d < 1.2 && this.flags.warden_dead) {
        if (!this.flags.boss_chest_claimed && this.canClaimWardenVault()) return { label: 'CLAIM VAULT' };
        return null;
      }
      if (pr.type === 'chest' && d < 1.2 && !pr.opened && !this.flags[`opened_${pr.id}`]) return { label: 'OPEN' };
      if (pr.type === 'lever' && d < 1.2 && !pr.on) return { label: 'PULL' };
      if (pr.type === 'boulder' && pr.tx === Math.floor(fx) && pr.ty === Math.floor(fz)) return { label: 'PUSH' };
      if (pr.type === 'bookshelf' && d < 1.3 && pr.text) return { label: 'READ' };
      if (pr.type === 'bed' && d < 1.3) return { label: 'SLEEP' };
      if (pr.type === 'fireplace' && d < 1.4) return { label: 'WARM UP' };
      if (pr.type === 'bench' && d < 1.3) return { label: 'SIT' };
      if (pr.type === 'cat' && d < 1.2 && !pr.taken) return { label: 'PET' };
      if (pr.type === 'charm' && d < 1.2 && !pr.taken) return { label: 'TAKE' };
      if (pr.type === 'shrine' && d < 1.5) return { label: 'PRAY' };
      if (pr.type === 'fishspot' && d < 1.4) return { label: 'FISH' };
      const sp = this.sprinklePrompt(pr, d);
      if (sp) return { label: sp };
    }
    return null;
  }

  sprinklePrompt(pr, d) {
    if (pr.text && d < 1.35) return 'READ';
    if ((pr.type === 'offeringBowl' || pr.type === 'donationShoes') && d < 1.25) return 'OFFER';
    if (pr.type === 'oracleBin' && d < 1.25) return 'ASK';
    if (pr.type === 'echoSign' && d < 1.35) return 'LISTEN';
    if (pr.type === 'bulletinBoard' && d < 1.35) return 'READ';
    if (pr.type === 'campfireLit' && d < 1.4) return 'WARM UP';
    if (pr.patchId && SPRINKLE_LORE[pr.patchId] && d < 1.35) {
      const patchLore = SPRINKLE_LORE[pr.patchId];
      const lore = patchLore[pr.type] || patchLore.sign;
      if (lore?.pages) return 'ASK';
      if (lore?.offeringBowl || lore?.hp) return 'OFFER';
      if (lore?.echo) return 'LISTEN';
      if (lore?.rotate || lore?.text) return 'READ';
    }
    return null;
  }

  trySprinkleInteract(pr) {
    const p = this.player;
    if (pr.text) {
      this.ui.startDialog([{ name: pr.signName || 'SIGN', text: pr.text }]);
      return true;
    }
    if (pr.type === 'campfireLit') {
      p.hp = Math.min(p.stats.maxHp, p.hp + 10);
      this.fx.sparks(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5), 4, 0.7);
      this.toast('The embers are warm. (+10 HP)');
      return true;
    }
    if (!pr.patchId || !SPRINKLE_LORE[pr.patchId]) return false;
    const patchLore = SPRINKLE_LORE[pr.patchId];
    const lore = patchLore[pr.type] || patchLore.sign
      || (pr.type === 'sign' || pr.type === 'bulletinBoard' ? patchLore.sign : null);
    if (!lore) return false;

    if (lore.echo) {
      const flag = lore.flag || 'echo_mark_done';
      if (!this.flags[flag]) {
        this.flags[flag] = true;
        SFX.echo();
        this.fx.ring(p.pos, 1.1, 0.45);
        this.ui.startDialog([{ name: lore.name, text: lore.text }]);
      } else {
        SFX.echo();
        this.ui.startDialog([{ name: lore.name, text: lore.echoAgain || 'The cave repeats you, softer than before.' }]);
      }
      this.save();
      return true;
    }

    if (lore.rotate?.length) {
      const key = `${pr.patchId}_reads`;
      const idx = this.flags[key] || 0;
      const entry = lore.rotate[idx % lore.rotate.length];
      this.flags[key] = idx + 1;
      this.ui.startDialog([{ name: lore.name, text: entry.text || entry }]);
      return true;
    }

    if (lore.hp) {
      if (lore.flag && this.flags[lore.flag]) {
        this.toast('The offering bowl is empty.');
        return true;
      }
      if (lore.flag) this.flags[lore.flag] = true;
      p.hp = Math.min(p.stats.maxHp, p.hp + lore.hp);
      this.fx.ring(p.pos, 0.8, 0.35);
      this.toast(`You leave a pebble. Something eases. (+${lore.hp} HP)`);
      this.save();
      return true;
    }
    if (lore.pages) {
      const done = lore.flag && this.flags[lore.flag];
      if (done) {
        this.ui.startDialog([{ name: lore.name, text: 'The oracle has spoken. The heap settles.' }]);
      } else {
        this.ui.startDialog(lore.pages.map(pg => ({ name: pg.name, text: pg.text })));
        if (lore.flag) this.flags[lore.flag] = true;
        if (lore.gold && !this.flags[`${lore.flag}_gold`]) {
          const g = lore.gold[0] + ((Math.random() * (lore.gold[1] - lore.gold[0])) | 0);
          p.gold += g;
          this.flags[`${lore.flag}_gold`] = true;
          SFX.coin();
          this.toast(`Something glints in the heap. +${g} gold`);
          this.save();
        }
      }
      return true;
    }
    if (lore.text) {
      this.ui.startDialog([{ name: lore.name, text: lore.text }]);
      if (lore.gold && lore.flag && !this.flags[lore.flag]) {
        const g = lore.gold[0] + ((Math.random() * (lore.gold[1] - lore.gold[0])) | 0);
        p.gold += g;
        this.flags[lore.flag] = true;
        SFX.coin();
        this.toast(`A chickadee drops a coin. +${g} gold`);
        this.save();
      }
      return true;
    }
    return false;
  }

  updateInteractPrompt() {
    const el = $('#interact-prompt');
    if (this.uiLock || !this.running) { el.classList.add('hidden'); return; }
    const portal = findActivePortal(this.world, this.player.pos);
    if (portal) {
      let text = portal.locked ? `🔒 ${portal.label} — sealed` : `→ ${portal.label}`;
      if (!portal.locked && this.net.connected && !this.allPartyWithin(4)) {
        text = 'Waiting for party — all allies within 4 tiles';
      }
      if (el.textContent !== text) el.textContent = text;
      el.classList.remove('hidden');
      return;
    }
    const found = this.findInteractable();
    if (found) {
      const text = `[E] ${found.label}`;
      if (el.textContent !== text) el.textContent = text;
      el.classList.remove('hidden');
    } else el.classList.add('hidden');
  }

  interact() {
    const p = this.player;
    if (p.ragdoll) return;
    const [fdx, fdz] = dirToVec(p.dir);
    const fx = p.pos.x + fdx * 0.9, fz = p.pos.z + fdz * 0.9;

    // npcs
    for (const npc of this.npcs) {
      if (npc.pos.distanceTo(p.pos) < 1.25) {
        const d = DIALOGS[npc.def.dialog];
        if (!d) return;
        const conv = d(this);
        npc.talking = true;
        this.ui.startDialog(conv.pages, () => {
          npc.talking = false;
          if (conv.onDone) conv.onDone(this);
          if (conv.shop) this.openShopFor(conv.shop);
        });
        return;
      }
    }
    // props
    for (const pr of this.world.props) {
      const d = Math.hypot(pr.x + 0.5 - p.pos.x, pr.y + 0.5 - p.pos.z);
      if (d < 1.4 && this.sprinklePrompt(pr, d) && this.trySprinkleInteract(pr)) return;
      if (pr.type === 'sign' && d < 1.2) {
        this.ui.startDialog([{ name: 'SIGN', text: pr.text }]);
        return;
      }
      if (pr.type === 'chest' && pr.id === 'boss_chest' && d < 1.2 && this.flags.warden_dead) {
        this.openBossVault(pr);
        return;
      }
      if (pr.type === 'chest' && d < 1.2 && !pr.opened && !this.flags[`opened_${pr.id}`]) {
        this.openChest(pr);
        return;
      }
      if (pr.type === 'lever' && d < 1.2 && !pr.on) {
        this.pullLever(pr, true);
        return;
      }
      if (pr.type === 'bookshelf' && d < 1.3 && pr.text) {
        this.ui.startDialog([{ name: 'SHELF', text: pr.text }]);
        return;
      }
      if (pr.type === 'bed' && d < 1.3) {
        p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
        SFX.potion();
        this.fx.ring(p.pos, 0.9, 0.4);
        this.toast('You take a short nap. HP/MP restored.');
        return;
      }
      if (pr.type === 'fireplace' && d < 1.4) {
        p.hp = Math.min(p.stats.maxHp, p.hp + 15);
        SFX.potion();
        this.fx.sparks(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5), 5, 0.8);
        this.toast('You warm your hands by the fire. Cozy. (+15 HP)');
        return;
      }
      if (pr.type === 'bench' && d < 1.3) {
        p.hp = Math.min(p.stats.maxHp, p.hp + 6);
        SFX.ui();
        this.fx.ring(p.pos, 0.55, 0.25);
        this.toast('You sit a moment and watch the vale go by. (+6 HP)');
        return;
      }
      if (pr.type === 'cat' && d < 1.2 && !pr.taken) {
        if (this.flags.cat_q === 1 && !this.flags.cat_found && pr.id !== 'cat_home') {
          pr.taken = true;
          if (pr.mesh) { this.world.group.remove(pr.mesh); pr.mesh = null; }
          this.flags.cat_found = true;
          SFX.questDone();
          this.ui.startDialog([
            { name: 'WHISKERS', text: 'Mrrow. (He regards you with deep judgment... then bolts for home, tail high.)' },
          ]);
          this.updateQuestUI();
          this.save();
        } else {
          SFX.pickup();
          this.toast('You pet the cat. Purring intensifies.');
        }
        return;
      }
      if (pr.type === 'charm' && d < 1.2 && !pr.taken) {
        pr.taken = true;
        this.fx.sparks(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5), 8, 1.2);
        if (pr.mesh) { this.world.group.remove(pr.mesh); pr.mesh = null; }
        this.flags[`charm_${pr.id}`] = true;
        SFX.pickup();
        const n = this.charmCount();
        this.toast(`A bell charm chimes softly. (${n}/5)`, n >= 5);
        if (n >= 5) this.toast('All five! The shrine at the north plaza hums.', true);
        this.updateQuestUI();
        this.save();
        return;
      }
      if (pr.type === 'shrine' && d < 1.5) {
        const n = this.charmCount();
        if (n >= 5 && !this.flags.charm_reward) {
          this.flags.charm_reward = true;
          SFX.questDone();
          this.fx.levelBurst(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5));
          this.spawnDrop('item', generateItem({
            slot: 'trinket', rarity: 'rare', level: p.level + 1, klass: p.klass,
            classAffix: true, quality: 0.78,
          }), p.pos.clone());
          this.ui.startDialog([
            { name: 'BELL SHRINE', text: 'Five charms return to the bell. Somewhere under the pond, something old stops holding its breath.' },
            { name: 'BELL SHRINE', text: 'The shrine offers up what the bell kept safe.' },
          ]);
          this.updateQuestUI();
          this.save();
        } else if (this.flags.charm_reward) {
          this.ui.startDialog([{ name: 'BELL SHRINE', text: 'The shrine hums, content. The city sounds rounder somehow.' }]);
        } else {
          this.ui.startDialog([{ name: 'BELL SHRINE', text: `An empty bell shrine. Five small hooks, ${n === 0 ? 'all' : 5 - n} of them bare. Lost charms ring in the city\'s corners at night.` }]);
        }
        return;
      }
      if (pr.type === 'fishspot' && d < 1.4) {
        this.startFishing();
        return;
      }
      if (pr.type === 'boulder') {
        // push if facing tile is the boulder's tile
        const bx = Math.floor(fx), bz = Math.floor(fz);
        if (pr.tx === bx && pr.ty === bz) {
          const nx = pr.tx + fdx, nz = pr.ty + fdz;
          pr.dyn.active = false;
          const blocked = this.world.isSolid(nx + 0.5, nz + 0.5);
          pr.dyn.active = true;
          if (!blocked) {
            this.world.moveBoulder(pr, nx, nz);
            this.flags[`boulder_${pr.id}`] = { x: nx, y: nz };
            SFX.push();
            this.fx.particles(new THREE.Vector3(nx + 0.5, 0, nz + 0.5), 4, 1);
            this.net.sendEvent('boulder', { id: pr.id, x: nx, y: nz });
            this.save();
          } else SFX.deny();
          return;
        }
      }
    }
  }

  pullLever(pr, broadcast) {
    pr.on = true;
    this.flags[pr.id] = true;
    pr.mesh.material.map.dispose();
    pr.mesh.material.map = new THREE.CanvasTexture(Art.props.leverOn);
    pr.mesh.material.map.magFilter = THREE.NearestFilter; pr.mesh.material.map.minFilter = THREE.NearestFilter;
    pr.mesh.material.needsUpdate = true;
    SFX.lever();
    this.fx.sparks(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5), 6, 1);
    this.fx.glow.setLever(pr, true);
    if (broadcast) this.net.sendEvent('lever', { id: pr.id });
    // gate logic
    if (pr.id === 'route_lever') {
      this.world.openGate('route_gate');
      SFX.gate();
      this.toast('Something rumbles open to the west...');
    }
    if (pr.id === 'cave_leverA' || pr.id === 'cave_leverB') {
      this.toast('A rune-lock releases somewhere...');
      if (this.flags.cave_leverA && this.flags.cave_leverB) {
        this.flags.cave_door = true;
        SFX.gate();
        this.toast('The stone door to the vault grinds open!', true);
      }
    }
    this.save();
  }

  openShopFor(kind) {
    const lvl = this.player.level;
    const klass = this.player.klass;
    const mapId = this.mapId;
    if (kind === 'shop') this.ui.openShop('VALE GOODS', shopStock(klass, lvl, mapId));
    else if (kind === 'smith') this.ui.openShop("BRAM'S FORGE", smithStock(klass, lvl, mapId));
    else if (kind === 'armory') this.ui.openShop('ASHFALL ARMORY', armoryStock(klass, lvl, mapId));
  }

  giveLoot(spec, srcProp, opts = {}) {
    const p = this.player;
    const pos = srcProp ? new THREE.Vector3(srcProp.x + 0.5, 0, srcProp.y + 1.4) : p.pos.clone();
    const drops = resolveLootSpec(spec, p, { mapId: this.mapId });
    const direct = !!opts.direct;
    if (!drops.length) {
      const [kind, val] = spec.split(':');
      if (direct) this.grantDrop(kind, kind === 'potion' ? +val : kind === 'gold' ? +val : generateItem({ rarity: val, level: p.level, klass: p.klass, classAffix: true }));
      else if (kind === 'gold') this.spawnDrop('gold', +val, pos);
      else if (kind === 'potion') { for (let i = 0; i < +val; i++) this.spawnDrop('potion', 1, pos); }
      else if (kind === 'item') this.spawnDrop('item', generateItem({ rarity: val, level: p.level, klass: p.klass, classAffix: true }), pos);
      return;
    }
    for (const d of drops) {
      if (direct) this.grantDrop(d.kind, d.data);
      else this.spawnDrop(d.kind, d.data, pos);
    }
  }

  grantDrop(kind, data) {
    const p = this.player;
    if (kind === 'gold') {
      p.gold += data;
      SFX.coin();
      this.toast(`+${data} gold`);
    } else if (kind === 'potion') {
      p.potions += data;
      SFX.pickup();
      this.toast(data > 1 ? `+${data} Vale Tonics` : '+1 Vale Tonic');
    } else {
      p.inventory.push(data);
      SFX.pickupRarity(data.rarity);
      const r = data.rarity;
      this.toast(`${r === 'legendary' ? '★ ' : ''}${data.name} [${r}]`, r === 'rare' || r === 'legendary');
    }
    this.ui.refreshInventoryIfOpen();
  }

  spawnDrop(kind, data, pos, opts = {}) {
    const ownerId = opts.ownerId ?? (this.net.connected ? this.net.id : 'local');
    const ghost = !!opts.ghost;
    const id = opts.id ?? this.nextDropId++;
    const d = new Drop(kind, data, pos, { ownerId, ghost, id });
    this.scene.add(d.mesh);
    this.drops.push(d);
    if (this.net.connected && !ghost && ownerId === this.net.id) {
      this.net.sendEvent('dropSpawn', {
        id: d.id, kind, data: this.serializeDropData(kind, data),
        x: +d.pos.x.toFixed(2), z: +d.pos.z.toFixed(2), owner: ownerId,
      });
    }
    return d;
  }

  /* ============ combat ============ */
  // aim: optional normalized {x,z} from mouse; falls back to facing dir
  aimFromMouse(clientX, clientY) {
    if (clientX == null || clientY == null || !isFinite(clientX)) return null;
    const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    const dx = hit.x - this.player.pos.x, dz = hit.z - this.player.pos.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return null;
    // face the aim point (4-way sprite)
    this.player.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
    return { x: dx / len, z: dz / len };
  }

  combatFxPayload(sk, aim) {
    const p = this.player;
    const [fdx, fdz] = aim ? [aim.x, aim.z] : dirToVec(p.dir);
    return {
      kind: sk.id,
      x: +p.pos.x.toFixed(2),
      z: +p.pos.z.toFixed(2),
      dx: +fdx.toFixed(3),
      dz: +fdz.toFixed(3),
      map: this.mapId,
      lv: p.skillLevels[sk.id] || 1,
    };
  }

  playRemoteCombatFx(msg) {
    if (msg.map !== this.mapId) return;
    const rp = this.remotes.get(msg.from);
    if (rp) {
      rp.attackT = 0.25;
      const dx = msg.dx ?? 0, dz = msg.dz ?? 0;
      if (Math.hypot(dx, dz) > 0.05) {
        rp.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
      }
    }
    const sk = skillDefFor(rp?.klass, msg.kind);
    if (!sk) {
      this.fx.skillSpawn(new THREE.Vector3(msg.x, 0, msg.z));
      return;
    }
    const pos = new THREE.Vector3(msg.x, 0, msg.z);
    const lv = msg.lv || 1;
    const fdx = msg.dx ?? 0, fdz = msg.dz ?? 1;
    const spawnRemoteProj = (vel, life, opts = {}) => {
      const pr = new Projectile('remote', pos.clone(), vel, 0, life, { ...opts, cosmetic: true });
      this.scene.add(pr.mesh);
      this.projectiles.push(pr);
    };
    switch (sk.type) {
      case 'melee': {
        SFX.swing();
        const range = sk.range + (lv - 1) * 0.06;
        this.fx.slash(pos, Math.atan2(fdz, fdx), range, sk.arc);
        this.fx.skillSpawn(pos);
        break;
      }
      case 'spin': {
        SFX.swing();
        const range = sk.range + (lv - 1) * 0.1;
        this.fx.ring(pos, range, 0.3);
        this.fx.skillSpawn(pos);
        break;
      }
      case 'proj': {
        sk.id === 'spark' || sk.id === 'bolt' ? SFX.spark() : SFX.shoot();
        const vel = new THREE.Vector3(fdx, 0, fdz).multiplyScalar(sk.speed);
        spawnRemoteProj(vel, sk.life + (lv - 1) * 0.1, {
          pierce: sk.pierce, kind: sk.projKind, big: sk.big,
        });
        this.fx.skillSpawn(pos);
        break;
      }
      case 'fan': {
        SFX.shoot();
        const n = sk.count + (lv - 1);
        const spread = 0.22;
        const base = Math.atan2(fdz, fdx);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * spread;
          const vel = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(sk.speed);
          spawnRemoteProj(vel, sk.life, { kind: sk.projKind, big: sk.big });
        }
        this.fx.skillSpawn(pos);
        break;
      }
      case 'nova': {
        SFX.spark();
        this.fx.shockwave(pos, sk.range + (lv - 1) * 0.25);
        break;
      }
      case 'dash': {
        SFX.blink();
        this.fx.particles(pos, 6, 1.5);
        this.fx.addFlash(pos, 5, 3, 0.2);
        this.schedule(0.14, () => {
          const end = rp?.target || pos.clone().add(new THREE.Vector3(fdx, 0, fdz).multiplyScalar(sk.dist + (lv - 1) * 0.4));
          this.fx.particles(end, 4, 1.2);
          this.fx.addFlash(end, 3, 2, 0.12);
        });
        break;
      }
      case 'blink': {
        SFX.blink();
        this.fx.particles(pos, 8, 1.5);
        this.fx.addFlash(pos, 4, 2.5, 0.15);
        this.schedule(0.1, () => {
          const end = rp?.target || pos.clone().add(new THREE.Vector3(fdx, 0, fdz).multiplyScalar(sk.dist + (lv - 1) * 0.5));
          this.fx.particles(end, 8, 1.5);
          this.fx.addFlash(end, 5, 3, 0.18);
        });
        break;
      }
      default:
        this.fx.skillSpawn(pos);
    }
  }

  tryBasic(aim) {
    const p = this.player;
    const k = CLASSES[p.klass];
    const sk = k.basic;
    if ((p.cooldowns[sk.id] || 0) > 0 || this.uiLock || p.ragdoll) return;
    p.cooldowns[sk.id] = sk.cd * p.cdScale();
    p.attackAnim = 0.18;
    // consume empower flags: rush_empower / tumble_empower give +60% dmg on the next basic
    if (p.rushEmpowered || p.tumbleEmpowered) {
      p.rushEmpowered = false;
      p.tumbleEmpowered = false;
      const boostedSk = { ...sk, mult: (sk.mult || 1) * 1.6 };
      this.executeSkill(boostedSk, 1, aim);
    } else {
      this.executeSkill(sk, 1, aim);
    }
  }
  trySkill(i, aim) {
    const p = this.player;
    const k = CLASSES[p.klass];
    const sk = k.skills[i];
    this.castSkill(sk, aim);
  }
  tryMobility() {
    this.castSkill(CLASSES[this.player.klass].mobility, null);
  }
  castSkill(sk, aim) {
    const p = this.player;
    if (!sk || this.uiLock || p.ragdoll) return;
    const isMobility = sk === CLASSES[p.klass].mobility;
    // Doublecast: spend a banked mobility charge instead of waiting on cooldown
    const usingCharge = isMobility && p.maxMobCharges && p.mobCharges > 0 && (p.cooldowns[sk.id] || 0) > 0;
    if ((p.cooldowns[sk.id] || 0) > 0 && !usingCharge) return;
    // Phase / Arcane Charges can make the next spell free
    const free = p.freecastT > 0 || (p.maxCharges && p.charges >= p.maxCharges);
    if (!free && p.mp < sk.mp) { SFX.deny(); this.toast('Not enough mana'); return; }
    if (free) {
      if (p.freecastT > 0) p.freecastT = 0;
      else if (p.maxCharges) { p.charges = 0; this.fx.skillSpawn(p.pos); }
    } else p.mp -= sk.mp;
    if (usingCharge) p.mobCharges--;
    else p.cooldowns[sk.id] = sk.cd * p.cdScale();
    p.attackAnim = 0.22;
    // Bladedancer: casting spends Resolve to refund cooldown on your other skills
    if (p._bladedancer && p.resolve > 0) {
      const refund = p.resolve * 0.4;
      for (const k of Object.keys(p.cooldowns)) if (k !== sk.id) p.cooldowns[k] = Math.max(0, p.cooldowns[k] - refund);
      p.resolve = 0;
    }
    // dash_mana passive: mobility skill restores 5 MP
    const passives = getEquippedPassives(p.equip);
    if (isMobility && passives.has('dash_mana')) {
      p.mp = Math.min(p.stats.maxMp, p.mp + 5);
    }
    this.executeSkill(sk, p.skillLevels[sk.id] || 1, aim);
  }

  executeSkill(sk, lv, aim) {
    const p = this.player;
    if (this.net.connected) this.net.sendEvent('combatFx', this.combatFxPayload(sk, aim));
    const passives = getEquippedPassives(p.equip);
    const dmg = skillDamage(p, sk, lv);
    const [fdx, fdz] = aim ? [aim.x, aim.z] : dirToVec(p.dir);
    const ctx = buildCast(p, sk.id);
    ctx.isBasic = (sk.id === CLASSES[p.klass].basic.id);
    this.preCast(ctx, p, fdx, fdz);
    switch (sk.type) {
      case 'melee': {
        SFX.swing();
        const range = sk.range + (lv - 1) * 0.06;
        // rush_stagger: Shield Rush stun is 50% longer (stun is on the dash type, not melee, but Cleave has no stun)
        const stunDur = sk.stun ? (sk.stun + (lv - 1) * 0.3) * (passives.has('rush_stagger') && sk.id === 'rush' ? 1.5 : 1) : 0;
        this.fx.slash(p.pos, Math.atan2(fdz, fdx), range, sk.arc);
        this.meleeHit(p.pos, [fdx, fdz], range, sk.arc, dmg, stunDur, sk.ragdoll, sk.knock, ctx);
        break;
      }
      case 'spin': {
        SFX.swing(); SFX.swing();
        // whirl_reach: Whirlwind radius +0.3 tiles
        const range = sk.range + (lv - 1) * 0.1 + (passives.has('whirl_reach') ? 0.3 : 0);
        this.fx.ring(p.pos, range, 0.3);
        this.meleeHit(p.pos, null, range, Math.PI * 2, dmg, 0, sk.ragdoll, sk.knock, ctx);
        break;
      }
      case 'proj': {
        sk.id === 'spark' || sk.id === 'bolt' ? SFX.spark() : SFX.shoot();
        const vel = new THREE.Vector3(fdx, 0, fdz).multiplyScalar(sk.speed);
        const pr = new Projectile('player', p.pos.clone().setY(0), vel, dmg, sk.life + (lv - 1) * 0.1,
          { pierce: sk.pierce, ragdoll: sk.ragdoll, knock: sk.knock, kind: sk.projKind, big: sk.big,
            skillId: sk.id });
        pr.ctx = ctx;
        this.scene.add(pr.mesh);
        this.projectiles.push(pr);
        this.fx.skillSpawn(p.pos);
        break;
      }
      case 'fan': {
        SFX.shoot();
        // volley_nock: +2 arrows; volley_empower: +25% damage per arrow
        let n = sk.count + (lv - 1) + (passives.has('volley_nock') ? 2 : 0) + (ctx.proj || 0);
        const fanDmg = passives.has('volley_empower') ? Math.round(dmg * 1.25) : dmg;
        const spread = 0.22 * (ctx.narrow || 1);
        const base = Math.atan2(fdz, fdx);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * spread;
          const vel = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(sk.speed);
          const pr = new Projectile('player', p.pos.clone().setY(0), vel, fanDmg, sk.life,
            { ragdoll: sk.ragdoll, knock: sk.knock, kind: sk.projKind, big: sk.big });
          pr.ctx = ctx;
          this.scene.add(pr.mesh);
          this.projectiles.push(pr);
        }
        this.fx.skillSpawn(p.pos);
        break;
      }
      case 'nova': {
        SFX.spark();
        const range = sk.range + (lv - 1) * 0.25;
        this.fx.shockwave(p.pos, range);
        this.meleeHit(p.pos, null, range, Math.PI * 2, dmg, 0.4, sk.ragdoll, sk.knock, ctx);
        if (ctx.pulse) {
          const pos = p.pos.clone(), pd = Math.round(dmg * ctx.pulse.frac), pr = range * 0.8;
          this.schedule(ctx.pulse.delay, () => {
            this.fx.shockwave(pos, pr);
            this.meleeHit(pos, null, pr, Math.PI * 2, pd, 0.2, false, 0.2, ctx);
          });
        }
        break;
      }
      case 'dash': {
        SFX.blink();
        const dist = sk.dist + (lv - 1) * 0.4;
        if (ctx.cleanse) p.stunned = 0;
        p.dashVec = new THREE.Vector3(fdx, 0, fdz).multiplyScalar(dist / 0.22);
        p.dashT = 0.22;
        p.iframes = Math.max(p.iframes, 0.45);
        if (Math.abs(fdx) > Math.abs(fdz)) p.squash.impulse(4.5, -3.5);
        else p.squash.impulse(-3.5, 4.5);
        this.fx.particles(p.pos, 6, 1.5);
        this.fx.addFlash(p.pos, 5, 3, 0.2);
        // rush_empower: flag next basic for +60% dmg (Knight Shield Rush)
        if (passives.has('rush_empower') && sk.id === 'rush') p.rushEmpowered = true;
        // tumble_empower: flag next basic for +60% dmg (Ranger Tumble)
        if (passives.has('tumble_empower') && sk.id === 'tumble') p.tumbleEmpowered = true;
        // rush_stagger: stun 50% longer on dash hit
        const stunMult = passives.has('rush_stagger') ? 1.5 : 1;
        if (sk.mult) {
          this.activeDash = {
            dmg, stun: ((sk.stun || 0) + (lv - 1) * 0.2) * stunMult, hitSet: new Set(),
            knock: sk.knock || 0, ragdoll: sk.ragdoll, ctx, shockwave: ctx.shockwave,
          };
        }
        break;
      }
      case 'blink': {
        SFX.blink();
        const dist = sk.dist + (lv - 1) * 0.5;
        const blinkOrigin = p.pos.clone();
        this.fx.particles(p.pos, 8, 1.5);
        this.fx.addFlash(p.pos, 4, 2.5, 0.15);
        for (let d = dist; d > 0.4; d -= 0.3) {
          const nx = p.pos.x + fdx * d, nz = p.pos.z + fdz * d;
          if (!this.world.isSolid(nx, nz)) { p.pos.set(nx, 0, nz); break; }
        }
        // Displacement: Rune every foe along the blink path
        if (ctx.runePass) {
          for (const e of this.enemies) {
            if (!e.dead && this.distToSegment(e.pos, blinkOrigin, p.pos) < 0.7) e.addStatus('rune', 6);
          }
        }
        // Arcane Wake: implosion at the departure point
        if (ctx.hazard && ctx.hazard.atOrigin) this.spawnHazard(blinkOrigin.clone(), ctx.hazard, dmg);
        p.squash.impulse(3.2, -2.8);
        this.fx.particles(p.pos, 8, 1.5);
        this.fx.addFlash(p.pos, 5, 3, 0.18);
        // blink_burst: shockwave at the departure point
        if (passives.has('blink_burst')) {
          this.fx.shockwave(blinkOrigin, 1.2);
          this.meleeHit(blinkOrigin, null, 1.2, Math.PI * 2, Math.round(dmg * 0.7), 0, false, 0.1);
        }
        break;
      }
    }
  }

  meleeHit(origin, dirVec, range, arc, dmg, stun, ragdoll = false, knockChance = 0, ctx = null) {
    const targets = this.hitScan(origin, dirVec, range, arc);
    for (const t of targets) this.applyHit(t, dmg, stun, origin, ragdoll, knockChance, ctx);
    if (targets.length) SFX.hit();
    if (ctx && targets.length) this.castPayoffs(ctx, targets, origin, dmg);
    // dummies
    for (const pr of this.world.props) {
      if (pr.type !== 'dummy' || pr.hp <= 0) continue;
      const dx = pr.x + 0.5 - origin.x, dz = pr.y + 0.5 - origin.z;
      if (Math.hypot(dx, dz) > range + 0.4) continue;
      if (dirVec && arc < 6 && !this.inArc(dx, dz, dirVec, arc)) continue;
      this.hitDummy(pr, dmg);
    }
    // knockable scenery
    for (const o of this.physObjs) {
      if (o.dead) continue;
      const dx = o.pos.x - origin.x, dz = o.pos.z - origin.z;
      if (Math.hypot(dx, dz) > range + 0.35) continue;
      if (dirVec && arc < 6 && !this.inArc(dx, dz, dirVec, arc)) continue;
      o.hit(dmg, origin, this);
    }
    // tall grass gets mowed by swings
    this.cutGrassArc(origin, dirVec, range, arc);
  }

  cutGrassArc(origin, dirVec, range, arc) {
    let cut = 0;
    const r = Math.ceil(range + 0.5);
    const ox = Math.floor(origin.x), oz = Math.floor(origin.z);
    for (let tz = oz - r; tz <= oz + r; tz++) {
      for (let tx = ox - r; tx <= ox + r; tx++) {
        const cx = tx + 0.5, cz = tz + 0.5;
        const dx = cx - origin.x, dz = cz - origin.z;
        if (Math.hypot(dx, dz) > range + 0.3) continue;
        if (dirVec && arc < 6 && !this.inArc(dx, dz, dirVec, arc)) continue;
        if (this.world.cutGrass(cx, cz)) {
          cut++;
          this.fx.particles(new THREE.Vector3(cx, 0, cz), 5, 1.5);
          if (Math.random() < 0.06) this.spawnDrop('gold', 1, new THREE.Vector3(cx, 0, cz));
        }
      }
    }
    if (cut) SFX.grass();
  }

  // AOE shove for boss slams / heavy attacks: tosses every object in radius
  knockObjects(pos, radius, dmg) {
    for (const o of this.physObjs) {
      if (!o.dead && o.pos.distanceTo(pos) < radius) o.hit(dmg, pos, this);
    }
  }

  inArc(dx, dz, dirVec, arc) {
    const ang = Math.atan2(dz, dx), fang = Math.atan2(dirVec[1], dirVec[0]);
    let diff = Math.abs(ang - fang);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff <= arc / 2 + 0.2;
  }

  hitScan(origin, dirVec, range, arc) {
    const out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.pos.x - origin.x, dz = e.pos.z - origin.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range + e.def.size * 0.35) continue;
      if (dirVec && arc < 6 && !this.inArc(dx, dz, dirVec, arc)) continue;
      out.push(e);
    }
    return out;
  }

  applyHit(enemy, dmg, stun, origin, ragdoll = false, knockChance = 0, ctx = null) {
    const p = this.player;
    let critChance = p.stats.crit + (p.critSurgeT > 0 ? 4 : 0);
    // Ambush: first strike out of Unseen is a guaranteed crit and Marks
    const ambush = ctx && p.hasAmbush && p.unseenT > 0;
    let crit = ambush || Math.random() * 100 < critChance;
    let final = crit ? Math.round(dmg * 1.6) : dmg;
    // status-driven damage multipliers — sunder/mark/frozen make a target take more from ALL sources
    final = Math.round(final * enemy.dmgTakenMult());
    // Executioner's Arc: bonus vs wounded foes carrying the trigger status
    if (ctx && ctx.exec && enemy.hp / enemy.maxHp < ctx.exec.hpBelow && ctx.exec.kinds.some(k => enemy.hasStatus(k))) {
      final = Math.round(final * ctx.exec.mult);
    }
    // Rhythm: every Nth basic hit lands double
    if (ctx && ctx.isBasic && p.maxCadence) {
      p.cadence++;
      if (p.cadence >= p.maxCadence) { p.cadence = 0; final *= 2; this.fx.addFlash(enemy.pos, 4, 2, 0.12); }
    }
    if (stun) enemy.stunned = Math.max(enemy.stunned, stun);
    const knock = origin ? new THREE.Vector3(enemy.pos.x - origin.x, 0, enemy.pos.z - origin.z).normalize() : null;
    if (p.stats.leech) p.hp = Math.min(p.stats.maxHp, p.hp + final * p.stats.leech / 100);

    const critKnock = crit && !ragdoll && Math.random() < 0.28;
    const doRag = ragdoll || critKnock || (knockChance > 0 && Math.random() < knockChance);
    const light = !ragdoll && doRag;

    if (this.guestSynced()) {
      this.recordEnemyDamage(enemy, this.net.id);
      enemy.hitFlash = 0.12;
      this.fx.damageText(enemy.pos, final, false, crit);
      SFX.hit();
      this.net.hitEnemy(enemy.id, final);
      return;
    }
    this.recordEnemyDamage(enemy, this.net.connected ? this.net.id : 'local');
    const died = enemy.hit(final, this, knock, crit, { ragdoll: doRag, light });
    if (!died) this.applyItemProcsOnHit(enemy, crit);
    if (ctx) this.treeOnHit(enemy, ctx, crit, ambush, died, final);
    if (died) this.killEnemy(enemy);
  }

  /* ============ skill-tree effect helpers ============ */
  applyItemProcsOnHit(enemy, crit) {
    for (const proc of getEquippedProcs(this.player.equip)) {
      if (proc.trigger === 'hit' && proc.status && Math.random() < (proc.chance ?? 1)) {
        enemy.addStatus(proc.status, proc.dur ?? 3);
      }
      if (crit && proc.trigger === 'crit' && proc.status) {
        enemy.addStatus(proc.status, proc.dur ?? 3);
      }
    }
  }

  // pre-cast: buffs, vacuums, self-placed hazards, Vanguard's primed Sunder
  preCast(ctx, p, fdx, fdz) {
    if (ctx.skillId === 'cleave' && p.nextCleaveSunder) { ctx.apply.push({ status: 'sunder', dur: 5 }); p.nextCleaveSunder = false; }
    if (ctx.iframes) p.iframes = Math.max(p.iframes, ctx.iframes);
    if (ctx.buff) {
      const b = ctx.buff;
      if (b.type === 'vacuum') this.vacuum(p.pos, b.power || 2.6);
      else p.addBuff(b.type, b.dur, b.power);
    }
    if (ctx.hazard && !ctx.hazard.atHit && !ctx.hazard.atOrigin) this.spawnHazard(p.pos.clone(), ctx.hazard, p.stats.dmg);
  }

  // on-hit secondary effects (statuses, resources, chains, detonations)
  treeOnHit(enemy, ctx, crit, ambush, died, final) {
    const p = this.player;
    if (!died) {
      if (ctx.apply.length) {
        const gate = !ctx.vsStatus || enemy.hasStatus(ctx.vsStatus);
        const firstOK = !ctx.firstOnly || !ctx._firstDone;
        if (gate && firstOK) {
          for (const a of ctx.apply) enemy.addStatus(a.status, a.dur);
          if (ctx.firstOnly) ctx._firstDone = true;
        }
      }
      if (crit && ctx.applyOnCrit.length) for (const a of ctx.applyOnCrit) enemy.addStatus(a.status, a.dur);
      if (ambush) { enemy.addStatus('mark', 6); p.unseenT = 0; }
      if (ctx.resonance) {
        if (enemy.hasStatus('chill') && !enemy.hasStatus('charged')) enemy.addStatus('charged', 4);
        else if (enemy.hasStatus('charged') && !enemy.hasStatus('chill')) enemy.addStatus('chill', 3);
      }
    }
    if (ctx.isBasic) this.buildResource(enemy);
    if (ctx.chain && enemy.hasStatus(ctx.chain.vsStatus)) this.chainSplash(enemy, ctx.chain, final);
    if (ctx.resetSkill && (!ctx.vsStatus || enemy.hasStatus(ctx.vsStatus))) p.cooldowns[ctx.resetSkill] = 0;
    if (ctx.detonate && !enemy.dead && enemy.elementalCount() >= 2) this.detonate(enemy);
    if (died && ctx.refundOnKill) p.mp = Math.min(p.stats.maxMp, p.mp + 8);
  }

  // per-cast aggregate payoffs for melee/aoe skills (count-dependent)
  castPayoffs(ctx, targets, origin, dmg) {
    const p = this.player;
    if (ctx.cdrPerHit && ctx.skillId) p.cooldowns[ctx.skillId] = Math.max(0, (p.cooldowns[ctx.skillId] || 0) - ctx.cdrPerHit * targets.length);
    if (ctx.guardPerHit) { const g = ctx.guardPerHit; p.addBuff('guard', g.dur, Math.min(g.max, g.perHit * targets.length)); }
    if (ctx.heal) {
      let h = 0;
      for (const t of targets) for (const k of ctx.heal.kinds) {
        if (t.status[k]) { h += ctx.heal.amount * t.status[k].stacks; delete t.status[k]; }
      }
      if (h) { p.hp = Math.min(p.stats.maxHp, p.hp + h); this.fx.ring(p.pos, 0.8, 0.35); }
    }
  }

  buildResource(enemy) {
    const p = this.player;
    if (p.maxResolve) {
      p.resolve = Math.min(p.maxResolve, p.resolve + 1);
      p.mp = Math.min(p.stats.maxMp, p.mp + 2);
      if (p.resolve >= p.maxResolve) this.resolveAtMax();
    }
    if (p.maxCharges) p.charges = Math.min(p.maxCharges, p.charges + 1);
  }
  resolveAtMax() {
    const p = this.player;
    if (p._resolveVanguard) { p.addBuff('unstoppable', 1.5); p.nextCleaveSunder = true; }
    if (p._resolveFreeCleave) {
      const cl = CLASSES[p.klass].skills.find(s => s.id === 'cleave');
      if (cl) this.executeSkill(cl, p.skillLevels.cleave || 1, null);
    }
    p.resolve = 0;
  }

  chainSplash(src, chain, final) {
    const p = this.player;
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e === src) continue;
      const d = e.pos.distanceTo(src.pos);
      if (d < chain.radius && d < bd) { bd = d; best = e; }
    }
    if (best) {
      const dmg = Math.max(1, Math.round(final * chain.mult));
      this.fx.addFlash(best.pos, 4, 2, 0.1);
      const died = best.hit(dmg, this, null, false, {});
      this.fx.damageText(best.pos, dmg, false, false);
      if (died) this.killEnemy(best);
    }
    if (chain.mp) p.mp = Math.min(p.stats.maxMp, p.mp + chain.mp);
  }

  detonate(src) {
    const dmg = Math.round(this.player.stats.dmg * 1.6);
    this.fx.shockwave(src.pos, 1.8); this.fx.addFlash(src.pos, 8, 5, 0.2); SFX.spark();
    for (const k of ['chill', 'frozen', 'charged', 'shock', 'burn']) delete src.status[k];
    for (const e of [...this.enemies]) {
      if (e.dead || e.pos.distanceTo(src.pos) > 1.8) continue;
      const died = e.hit(dmg, this, null, false, {});
      this.fx.damageText(e.pos, dmg, false, true);
      if (died) this.killEnemy(e);
    }
  }

  // Aftershock: a Sundered foe in the blast knocks down the whole pack
  castShockwave(origin, sw, dmg) {
    this.fx.shockwave(origin, sw.radius);
    const triggered = this.enemies.some(e => !e.dead && e.pos.distanceTo(origin) < sw.radius && e.hasStatus(sw.vsStatus));
    if (triggered) this.meleeHit(origin, null, sw.radius, Math.PI * 2, Math.round(dmg * 0.6), 0.3, true, 1, null);
  }

  spawnHazard(pos, hz, dmgBase) {
    this.hazards.push({
      x: pos.x, z: pos.z, t: hz.dur, timer: 0, period: hz.period || 0.5, radius: hz.radius,
      dmg: Math.max(0, Math.round(dmgBase * (hz.dmgMult || 0))), slow: hz.slow, root: hz.root,
      kind: hz.kind, hitSet: new Set(), mesh: null,
    });
    this.fx.ring(pos, hz.radius, 0.3);
  }
  updateHazards(dt) {
    for (const h of [...this.hazards]) {
      h.t -= dt; h.timer -= dt;
      if (h.timer <= 0) {
        h.timer = h.period;
        const pos = new THREE.Vector3(h.x, 0, h.z);
        for (const e of [...this.enemies]) {
          if (e.dead || e.pos.distanceTo(pos) > h.radius) continue;
          if (h.root) { if (h.hitSet.has(e.id)) continue; h.hitSet.add(e.id); e.addStatus('chill', 2.5); }
          else if (h.slow) e.addStatus('chill', 1.2);
          if (h.dmg > 0) {
            const died = e.hit(h.dmg, this, null, false, {});
            this.fx.damageText(e.pos, h.dmg, false, false);
            if (died) this.killEnemy(e);
          }
        }
        if (h.kind !== 'smoke' && h.kind !== 'trap') this.fx.ring(pos, h.radius * 0.7, 0.18);
      }
      if (h.t <= 0) this.hazards = this.hazards.filter(x => x !== h);
    }
  }
  updateTimers(dt) {
    for (const tm of [...this.timers]) {
      tm.t -= dt;
      if (tm.t <= 0) { this.timers = this.timers.filter(x => x !== tm); tm.fn(); }
    }
  }

  vacuum(pos, radius) {
    for (const e of this.enemies) {
      if (e.dead || e.def.boss) continue;
      const dx = pos.x - e.pos.x, dz = pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > radius || d < 0.15) continue;
      const pull = Math.min(d - 0.1, 0.9);
      e.pos.x += (dx / d) * pull; e.pos.z += (dz / d) * pull;
    }
    this.fx.ring(pos, radius * 0.8, 0.25);
  }
  schedule(delay, fn) { this.timers.push({ t: delay, fn }); }
  distToSegment(pt, a, b) {
    const abx = b.x - a.x, abz = b.z - a.z;
    const apx = pt.x - a.x, apz = pt.z - a.z;
    const len2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / len2));
    return Math.hypot(apx - abx * t, apz - abz * t);
  }

  /* ============ level-up choice popup ============ */
  onLevelUp() { this.levelQueue++; this.maybeShowLevelUp(); }
  maybeShowLevelUp() {
    if (this.levelUpOpen || this.levelQueue <= 0) return;
    if (this.ui.inDialog || this.ui.shopOpen || this.ui.panelOpen || this.deathShown) return;
    const choices = levelUpChoices(this.player, 3);
    if (!choices.length) { this.levelQueue = 0; return; } // nothing new to learn; point stays banked
    this.levelUpOpen = true;
    this.uiLock = true;
    this.ui.showLevelUp(choices, (id) => this.confirmLevelUpPick(id));
  }
  confirmLevelUpPick(id) {
    const p = this.player;
    if (id && unlockNode(p, id)) {
      p.skillPoints = Math.max(0, p.skillPoints - 1);
      applyTreeStats(p);
      const node = treeNode(p.klass, id);
      SFX.levelup();
      this.fx.levelBurst(p.pos);
      this.toast(`Learned ${node.name}`, true);
    }
    this.levelUpOpen = false;
    this.levelQueue = Math.max(0, this.levelQueue - 1);
    this.ui.hideLevelUp();
    this.save();
    if (this.levelQueue > 0) this.maybeShowLevelUp();
    else this.unlockUI();
  }

  hitDummy(pr, dmg) {
    if (this.net.connected && !this.net.isHost) return;
    pr.hp -= 1;
    SFX.hit();
    this.fx.particles(new THREE.Vector3(pr.x + 0.5, 0.4, pr.y + 0.5), 6, 2);
    this.fx.damageText(new THREE.Vector3(pr.x + 0.5, 0, pr.y + 0.5), dmg);
    if (pr.hp <= 0) {
      this.world.group.remove(pr.mesh);
      pr.mesh = null;
      if (pr.solidDyn) pr.solidDyn.active = false; // destroyed dummies stop blocking
      SFX.enemyDie();
      this.onDummyDestroyed();
    }
  }

  onDummyDestroyed() {
    if (this.flags.stage === 1) {
      this.flags.dummies_n = (this.flags.dummies_n || 0) + 1;
      this.updateQuestUI();
      if (this.flags.dummies_n >= 3) {
        this.toast('Training complete! See BRAM at the smithy.', true);
        this.setStage(2);
      }
    }
  }

  killEnemy(enemy) {
    const training = enemy.def.training || enemy.type === 'dummy';
    SFX.enemyDie();
    const p = this.player;
    if (!training) {
      // skill-tree on-kill: Open Season (spread Mark) and Acrobat (refresh mobility)
      if (playerFx(p, 'markSpread') && enemy.hasStatus('mark')) {
        const r = playerFx(p, 'markSpread');
        for (const e of this.enemies) {
          if (!e.dead && e !== enemy && e.pos.distanceTo(enemy.pos) < r) e.addStatus('mark', 6);
        }
      }
      if (playerFx(p, 'refreshOnKillDuringIframes') && p.iframes > 0) {
        p.cooldowns[CLASSES[p.klass].mobility.id] = 0;
      }
      this.fx.xpAbsorb(enemy.pos, this.player.pos, enemy.def.xp);
      this.player.addXp(enemy.def.xp, this);
      // kill_surge: kill within 1.5s of a skill hit grants +4% crit for 4s
      const passives = getEquippedPassives(this.player.equip);
      if (passives.has('kill_surge') && this.player.lastSkillHitT > 0) {
        this.player.critSurgeT = 4.0;
      }
      this.rollLoot(enemy);
    }
    this.scene.remove(enemy.sprite.group);
    this.enemies = this.enemies.filter(e => e !== enemy);
    if (training) {
      this.onDummyDestroyed();
      if (this.net.connected) {
        this.net.sendEvent('enemyDie', {
          eid: enemy.id, x: enemy.pos.x, z: enemy.pos.z, type: enemy.type, map: this.mapId,
          damagers: [], xp: 0,
        });
      }
      return;
    }
    const damagers = [...(enemy.damagers || [])];
    if (this.net.connected && !damagers.includes(this.net.id)) damagers.push(this.net.id);
    this.net.sendEvent('enemyDie', {
      eid: enemy.id, x: enemy.pos.x, z: enemy.pos.z, type: enemy.type, map: this.mapId,
      damagers, xp: enemy.def.xp,
    });
    if (enemy.def.boss) this.onBossDead(enemy);
    // Tilly's cellar problem
    if (this.mapId === 'cellar' && enemy.type === 'rat' && this.flags.rats_q === 1) {
      this.flags.rats_killed = (this.flags.rats_killed || 0) + 1;
      const n = this.flags.rats_killed;
      if (n >= 5) this.toast('The cellar falls quiet. Tell TILLY upstairs.', true);
      else this.toast(`Cellar pest down. (${Math.min(5, n)}/5)`);
      this.updateQuestUI();
      this.save();
    }
  }

  rollLoot(enemy) {
    const t = enemy.def;
    if (t.training || enemy.type === 'dummy') return;
    const gold = t.gold[0] + ((Math.random() * (t.gold[1] - t.gold[0])) | 0);
    this.spawnDrop('gold', gold, enemy.pos);
    const extra = rollEnemyLoot(enemy.type, this.player.klass, this.player.level, this.mapId);
    if (extra) {
      for (const d of extra) this.spawnDrop(d.kind, d.data, enemy.pos);
    }
  }

  onBossDead(enemy) {
    this.flags.warden_dead = true;
    this.flags.cave_door = this.flags.cave_door || true;
    const damagers = [...(enemy.damagers || [])];
    if (this.net.connected && !damagers.includes(this.net.id)) damagers.push(this.net.id);
    this.wardenDamagers = new Set(damagers);
    SFX.bossRoar();
    this.shake(1);
    this.ui.setBossBar(null);
    this.toast('THE STONE WARDEN HAS FALLEN', true);
    this.setStage(5);
    this.revealBossChest();
    playMusic('cave');
    this.net.sendEvent('wardenDead', { damagers });
    this.save();
  }

  enemyAttack(enemy, target) {
    enemy.sprite.bill.position.y += 0.1;
    const dmg = enemyDamage(enemy.def, enemy);
    if (target === this.player) {
      this.player.damage(dmg, this, { attacker: enemy });
    } else if (target.id != null) {
      this.net.sendEvent('hitPlayer', { pid: target.id, dmg });
    }
  }

  // slow-cooldown heavy attack: big damage + ragdolls anyone caught in it
  enemyHeavyHit(enemy) {
    const hv = enemy.def.heavy;
    const radius = hv.range + 0.35;
    const dmg = Math.round(enemyDamage(enemy.def, enemy) * hv.mult);
    SFX.slam();
    this.shake(0.4);
    this.fx.shockwave(enemy.pos, radius);
    if (this.player.hp > 0 && this.player.pos.distanceTo(enemy.pos) < radius) {
      this.player.damage(dmg, this, { from: enemy.pos, power: dmg });
    }
    for (const [id, rp] of this.remotes) {
      if (rp.map === this.mapId && rp.pos.distanceTo(enemy.pos) < radius) {
        this.net.sendEvent('hitPlayer', { pid: id, dmg });
      }
    }
    this.knockObjects(enemy.pos, radius + 0.5, dmg);
  }

  bossSlamHit(boss, radius) {
    const dmg = Math.round(enemyDamage(boss.def, boss) * 1.5);
    if (this.player.pos.distanceTo(boss.pos) < radius && this.player.hp > 0) {
      this.player.damage(dmg, this, { from: boss.pos, power: dmg });
    }
    for (const [id, rp] of this.remotes) {
      if (rp.map === this.mapId && rp.pos.distanceTo(boss.pos) < radius) {
        this.net.sendEvent('hitPlayer', { pid: id, dmg: Math.round(dmg) });
      }
    }
    // the shockwave hurls scenery across the arena
    this.knockObjects(boss.pos, radius + 1, dmg);
  }
  bossSummon(boss) {
    this.toast('The Warden calls the dark!');
    const count = this.net.connected ? bossSummonCount(this.net) : 2;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = this.scaledEnemy('shade', boss.pos.x + Math.cos(a) * 2 - 0.5, boss.pos.z + Math.sin(a) * 2 - 0.5);
      this.scene.add(e.sprite.group);
      this.enemies.push(e);
    }
  }

  onPlayerDowned(player) {
    if (player.downed) return;
    if (player.revivesLeft <= 0) {
      this.finishBleedOut();
      return;
    }
    player.revivesLeft--;
    player.downed = true;
    player.bleedT = 15;
    player.hp = 0;
    player.ragdoll = null;
    this.ui.showDowned(player.bleedT, player.revivesLeft);
  }

  onPlayerDeath() {
    if (this.deathShown) return;
    this.deathShown = true;
    stopMusic();
    this.ui.forceCloseAll();
    this.ui.hideDowned();
    this.ui.setDeathScreen();
    $('#death-screen').classList.remove('hidden');
    this.uiLock = true;
  }

  finishBleedOut() {
    this.player.downed = false;
    this.player.bleedT = 0;
    this.ui.hideDowned();
    if (this.net.connected) {
      this.toast('Bleed out — waking at the inn');
      this.forceRespawnAtInn();
      return;
    }
    this.onPlayerDeath();
  }

  forceRespawnAtInn() {
    this.deathShown = false;
    this.ui.hideDowned();
    $('#death-screen').classList.add('hidden');
    this.uiLock = false;
    const p = this.player;
    p.downed = false;
    p.bleedT = 0;
    p.hp = p.stats.maxHp;
    p.mp = p.stats.maxMp;
    p.revivesLeft = 2;
    this.loadMap('town', 22.5, 18.5);
  }

  applyRevive(targetId) {
    if (targetId === this.net.id) {
      if (!this.player.downed) return;
      this.player.reviveFromDowned();
      this.ui.hideDowned();
      this.toast('Revived!');
      return;
    }
    const rp = this.remotes.get(targetId);
    if (rp) {
      rp.downed = false;
      rp.bleed = 0;
      rp.hp = Math.max(1, Math.round(rp.maxHp * 0.3));
      rp.refreshNameplate();
    }
  }

  allPartyWithin(dist = 4) {
    if (!this.net.connected) return true;
    const p = this.player.pos;
    for (const rp of this.remotes.values()) {
      if (rp.map !== this.mapId) return false;
      if (Math.hypot(rp.pos.x - p.x, rp.pos.z - p.z) > dist) return false;
    }
    return true;
  }

  updateCoopHud() {
    if (!this.net.connected) {
      this.ui.updatePartyStrip([]);
      return;
    }
    const info = this.net.coopStatusLine();
    if (info) this.ui.setCoopStatus(info);
    const entries = [];
    for (const [id, peer] of this.net.peers) {
      if (!peer.state || peer.state.map !== this.mapId) continue;
      entries.push({
        name: peer.name,
        hp: peer.state.downed ? 0 : (peer.state.hp ?? 0),
        maxHp: peer.state.maxHp ?? 1,
        downed: !!peer.state.downed,
        bleed: peer.state.bleed || 0,
        meta: peer.state.downed ? 'needs revive' : (this.net.isHost && id !== this.net.id ? 'guest' : ''),
      });
    }
    this.ui.updatePartyStrip(entries);
  }

  updateRevive(dt) {
    if (!this.net.connected || this.player.downed || this.uiLock) {
      this.reviveChannel = null;
      this.reviveT = 0;
      this.ui.hideRevivePrompt();
      return;
    }
    let target = null, bestD = 1.6;
    for (const [id, rp] of this.remotes) {
      if (rp.map !== this.mapId || !rp.downed) continue;
      const d = this.player.pos.distanceTo(rp.pos);
      if (d < bestD) { bestD = d; target = { id, rp }; }
    }
    if (!target || !input.interact) {
      this.reviveChannel = null;
      this.reviveT = 0;
      this.ui.hideRevivePrompt();
      return;
    }
    if (this.reviveChannel !== target.id) {
      this.reviveChannel = target.id;
      this.reviveT = 0;
    }
    this.reviveT += dt;
    const frac = Math.min(1, this.reviveT / 2);
    this.ui.showRevivePrompt(target.rp.name, frac);
    if (this.reviveT >= 2) {
      this.net.sendRevive(target.id);
      this.reviveChannel = null;
      this.reviveT = 0;
      this.ui.hideRevivePrompt();
    }
  }

  tickDowned(dt) {
    const p = this.player;
    if (!p.downed) return;
    if (p.bleedT <= 0) this.finishBleedOut();
  }
  respawn() {
    this.forceRespawnAtInn();
  }

  drinkPotion() {
    const p = this.player;
    if (this.uiLock || p.potions <= 0 || p.hp >= p.stats.maxHp) { if (p.potions <= 0) { SFX.deny(); this.toast('No tonics left — buy more at VALE GOODS'); } return; }
    p.potions--;
    p.hp = Math.min(p.stats.maxHp, p.hp + 40);
    SFX.potion();
    this.fx.ring(p.pos, 0.9, 0.4);
  }

  equipItem(idx) {
    const p = this.player;
    const item = p.inventory[idx];
    if (!item) return;
    if (item.slot === 'weapon' && !canEquipWeapon(p.klass, item.baseId)) {
      SFX.deny(); this.toast(`Your class can't wield that`); return;
    }
    const prev = p.equip[item.slot];
    p.inventory.splice(idx, 1);
    if (prev) p.inventory.push(prev);
    p.equip[item.slot] = item;
    p.recalcStats();
    SFX.pickup();
    const deltas = prev ? itemStatDelta(item, prev) : [];
    const notable = item.rarity === 'rare' || item.rarity === 'legendary' || item.rarity === 'magic';
    if (deltas.length) this.toast(`Equipped ${item.name} — ${formatStatDelta(deltas)}`, notable);
    else this.toast(`Equipped ${item.name}`, notable);
    this.save();
  }
  unequip(slot) {
    const p = this.player;
    if (!p.equip[slot]) return;
    p.inventory.push(p.equip[slot]);
    p.equip[slot] = null;
    p.recalcStats();
    SFX.ui();
    this.save();
  }

  /* ============ coop glue ============ */
  onBecomeHost() {
    this.lastEnemySyncAt = -10;
    this.ui.setCoopStatus(this.net.coopStatusLine());
    this.toast('You are now the host — world gates & enemies follow you', true);
    if (this.net.connected) {
      this.net.send({ t: 'flags', flags: this.shareableFlags() });
    }
    if (this.flags.warden_dead) this.revealBossChest();
    if (this.mapId === 'boss' && this.flags.warden_dead) playMusic('cave');
  }

  announceCoopJoin() {
    if (!this.net.connected) return;
    if (this.net.isHost) {
      this.toast('CO-OP HOST — allies warp to you; world gates follow your quest stage', true);
      window.setTimeout(() => {
        if (this.net.connected && this.net.isHost) {
          this.toast('Each player keeps their own level, loot, gold & side quests');
        }
      }, 3500);
    } else {
      this.toast('CO-OP GUEST — world gates & puzzles follow the host', true);
      window.setTimeout(() => {
        if (this.net.connected && !this.net.isHost) {
          this.toast('You keep your save — level, gear, gold & personal quests stay yours');
        }
      }, 3500);
    }
  }

  onNetReady() {
    if (this.net.isHost && this.net.peers.size > 0) {
      this.net.sendEvent('hostAnchor', {
        map: this.mapId, x: +this.player.pos.x.toFixed(2), z: +this.player.pos.z.toFixed(2),
      });
    }
  }
  onNetDrop() {
    this.toast('Co-op connection lost — continuing solo');
    this.ui.setCoopStatus({ line: 'co-op disconnected · world flags kept', worldNote: '' });
    for (const id of [...this.remotes.keys()]) this.removeRemotePlayer(id);
  }
  shareableFlags() {
    return collectShareableFlags(this.flags);
  }
  mergeFlags(flags) {
    let changed = false;
    for (const [k, v] of Object.entries(flags)) {
      if (k === 'stage') {
        if ((v || 0) > (this.flags.stage || 0)) { this.flags.stage = v; changed = true; }
        continue;
      }
      if (k.startsWith('boulder_')) {
        if (JSON.stringify(this.flags[k]) !== JSON.stringify(v)) {
          this.flags[k] = v;
          changed = true;
        }
        continue;
      }
      if (v && !this.flags[k]) { this.flags[k] = v; changed = true; }
    }
    if (changed && this.mapId) {
      this.loadMap(this.mapId, this.player.pos.x, this.player.pos.z, true);
      if (this.flags.warden_dead) this.revealBossChest();
    }
  }
  updateRemotePlayer(id, peer) {
    let rp = this.remotes.get(id);
    if (!rp) {
      rp = new RemotePlayer(id, peer.name, peer.klass);
      this.remotes.set(id, rp);
    }
    rp.applyState(peer.state);
    if (peer.state) {
      rp.downed = !!peer.state.downed;
      rp.bleed = peer.state.bleed || 0;
      if (peer.state.maxHp) rp.maxHp = peer.state.maxHp;
    }
    this.refreshRemoteVisibility();
  }
  removeRemotePlayer(id) {
    const rp = this.remotes.get(id);
    if (rp) { this.scene.remove(rp.sprite.group); this.remotes.delete(id); }
  }
  refreshRemoteVisibility() {
    for (const rp of this.remotes.values()) {
      const here = rp.map === this.mapId;
      if (here && !rp.sprite.group.parent) this.scene.add(rp.sprite.group);
      if (!here && rp.sprite.group.parent) this.scene.remove(rp.sprite.group);
    }
  }
  guestSynced() {
    return this.net.connected && !this.net.isHost && (this.elapsed - this.lastEnemySyncAt) < 1.0;
  }
  enemySyncData() {
    return this.enemies.map(e => ({
      id: e.id, type: e.type,
      x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2),
      hp: e.hp, st: e.stunned > 0 ? 1 : 0,
    }));
  }
  applyEnemySync(map, list) {
    if (map !== this.mapId) return;
    this.lastEnemySyncAt = this.elapsed;
    const byId = new Map(this.enemies.map(e => [e.id, e]));
    const seen = new Set();
    for (const s of list) {
      seen.add(s.id);
      let e = byId.get(s.id);
      if (!e) {
        e = new Enemy(s.type, s.x - 0.5, s.z - 0.5);
        e.id = s.id;
        this.scene.add(e.sprite.group);
        this.enemies.push(e);
      }
      e.pos.x += (s.x - e.pos.x) * 0.5;
      e.pos.z += (s.z - e.pos.z) * 0.5;
      e.hp = s.hp;
    }
    for (const e of [...this.enemies]) {
      if (!seen.has(e.id)) {
        this.scene.remove(e.sprite.group);
        this.enemies = this.enemies.filter(x => x !== e);
      }
    }
  }
  remoteHitEnemy(eid, dmg, from) {
    const e = this.enemies.find(x => x.id === eid);
    if (!e || e.dead) return;
    this.recordEnemyDamage(e, from ?? 'remote');
    const died = e.hit(dmg, this, null);
    if (died) this.killEnemy(e);
  }
  applyNetEvent(msg) {
    switch (msg.kind) {
      case 'lever': {
        const pr = this.world.props.find(p => p.type === 'lever' && p.id === msg.id);
        this.flags[msg.id] = true;
        if (pr && !pr.on) this.pullLever(pr, false);
        else { // not on this map; still resolve gate flags
          if (msg.id === 'route_lever') this.flags.route_lever = true;
          if (this.flags.cave_leverA && this.flags.cave_leverB) this.flags.cave_door = true;
        }
        break;
      }
      case 'boulder': {
        this.flags[`boulder_${msg.id}`] = { x: msg.x, y: msg.y };
        const pr = this.world.props.find(p => p.type === 'boulder' && p.id === msg.id);
        if (pr) this.world.moveBoulder(pr, msg.x, msg.y);
        break;
      }
      case 'wardenDead': {
        this.flags.warden_dead = true;
        this.flags.cave_door = this.flags.cave_door || true;
        if (msg.damagers?.length) this.wardenDamagers = new Set(msg.damagers);
        this.setStage(5);
        if (this.mapId === 'boss') {
          const boss = this.enemies.find(e => e.def.boss);
          if (boss) { this.scene.remove(boss.sprite.group); this.enemies = this.enemies.filter(e => e !== boss); }
          this.ui.setBossBar(null);
          playMusic('cave');
        }
        this.revealBossChest();
        if (!this.net.isHost) this.toast('THE STONE WARDEN HAS FALLEN', true);
        break;
      }
      case 'enemyDie': {
        if (msg.map !== this.mapId) break;
        const e = this.enemies.find(x => x.id === msg.eid);
        const pos = e?.pos ?? new THREE.Vector3(msg.x, 0, msg.z);
        const def = e?.def ?? ENEMY_TYPES[msg.type];
        const training = def?.training || msg.type === 'dummy' || !def?.xp;
        const damagers = msg.damagers || [];
        const rewarded = !training && damagers.includes(this.net.id);
        if (rewarded && !this.net.isHost) {
          this.fx.xpAbsorb(pos, this.player.pos, def.xp);
          SFX.enemyDie();
          this.player.addXp(def.xp, this);
          this.rollLoot({ pos, def, type: msg.type });
        } else {
          SFX.enemyDie();
        }
        if (e) {
          this.scene.remove(e.sprite.group);
          this.enemies = this.enemies.filter(x => x !== e);
        }
        break;
      }
      case 'hostAnchor':
        if (this.net.isHost || msg.from === this.net.id) break;
        if (msg.map && this.maps[msg.map]) {
          this.loadMap(msg.map, msg.x, msg.z, true);
          this.toast('Warped to host — world progress follows their quest stage', true);
        }
        break;
      case 'chestOpen': {
        const pr = this.world.props.find(p => p.type === 'chest' && p.id === msg.id);
        if (pr) this.openChestVisual(pr);
        break;
      }
      case 'dropSpawn':
        if (msg.from === this.net.id) break;
        this.spawnDrop(msg.kind, msg.data, new THREE.Vector3(msg.x, 0, msg.z), {
          id: msg.id, ownerId: msg.owner, ghost: true,
        });
        break;
      case 'combatFx':
        if (msg.from !== this.net.id) this.playRemoteCombatFx(msg);
        break;
      case 'hitPlayer':
        if (msg.pid === this.net.id) this.player.damage(msg.dmg, this);
        break;
      case 'revive':
        this.applyRevive(msg.target);
        break;
      case 'groupPortal':
        if (msg.from === this.net.id) break;
        this.loadMap(msg.to, msg.tx, msg.ty);
        break;
    }
  }

  /* ============ misc ============ */
  unlockUI() { if (!this.deathShown && !this.endOpen && !(this.arrivalHold > 0)) this.uiLock = false; }
  toast(t, rare) { this.ui.toast(t, rare); }
  shake(amount) { this.shakeT = Math.max(this.shakeT, amount * 0.3); }

  /* ============ portals ============ */
  checkPortals() {
    const p = this.player;
    const def = this.maps[this.mapId];
    let inAny = false;
    for (const portal of def.portals) {
      const inside = p.pos.x >= portal.x && p.pos.x < portal.x + portal.w &&
                     p.pos.z >= portal.y && p.pos.z < portal.y + (portal.h || 1);
      if (!inside) continue;
      inAny = true;
      if (this.portalGrace) continue;
      if (portal.requires && !this.flags[portal.requires]) {
        this.portalGrace = true;
        this.ui.startDialog([{ name: '', text: portal.lockMsg || 'The way is sealed.' }]);
        // nudge back
        p.pos.z += portal.y < 4 ? 0.8 : -0.8;
        return;
      }
      if (this.net.connected && !this.allPartyWithin(4)) {
        this.portalGrace = true;
        return;
      }
      let tx = portal.tx, ty = portal.ty;
      if (portal.isDoor) {
        [tx, ty] = INTERIOR_SPAWN[portal.to] || [6.5, 9];
        SFX.door();
      }
      if (this.net.connected) {
        this.net.sendEvent('groupPortal', { to: portal.to, tx, ty });
      }
      this.loadMap(portal.to, tx, ty);
      if (portal.to === 'cave') this.flags.visited_cave = true;
      this.updateQuestUI();
      return;
    }
    if (!inAny) this.portalGrace = false;
  }

  /* ============ main loop ============ */
  update() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    if (!this.running) { this.renderer.render(this.scene, this.camera); return; }
    const p = this.player;

    this.ui.updateDialog(dt);
    this.updateFishing(dt);
    this.updateArena(dt);
    this.tickDowned(dt);
    this.updateRevive(dt);
    this.updateCoopHud();
    p.update(dt, input, this.world, this);
    this.separatePlayers();
    this.checkPortals();
    this.updateInteractPrompt();

    // hold LMB to keep attacking toward the cursor
    if (this.mouseHeld && !this.uiLock && !p.downed) {
      this.tryBasic(this.aimFromMouse(this.mouseX, this.mouseY));
    }

    // dashes trample tall grass
    if (p.dashT > 0) this.cutGrassArc(p.pos, null, 0.6, Math.PI * 2);

    // Shield Rush: hit everything along the dash path
    if (this.activeDash) {
      if (p.dashT > 0) {
        for (const e of this.enemies) {
          if (e.dead || this.activeDash.hitSet.has(e.id)) continue;
          if (e.pos.distanceTo(p.pos) < 0.95 + e.def.size * 0.25) {
            this.activeDash.hitSet.add(e.id);
            this.applyHit(e, this.activeDash.dmg, this.activeDash.stun, p.pos, this.activeDash.ragdoll, this.activeDash.knock, this.activeDash.ctx);
          }
        }
        for (const o of this.physObjs) {
          if (o.dead || this.activeDash.hitSet.has('o' + o.id)) continue;
          if (o.pos.distanceTo(p.pos) < 0.9) {
            this.activeDash.hitSet.add('o' + o.id);
            o.hit(this.activeDash.dmg, p.pos, this);
          }
        }
      } else {
        if (this.activeDash.shockwave) this.castShockwave(p.pos.clone(), this.activeDash.shockwave, this.activeDash.dmg);
        this.activeDash = null;
      }
    }

    for (const n of this.npcs) n.update(dt, this.world, p.pos);

    // enemies: host (or solo, or guest w/o sync) simulates
    const simulate = !this.guestSynced();
    const allPlayers = [p, ...[...this.remotes.values()].filter(r => r.map === this.mapId)];
    for (const e of [...this.enemies]) {
      if (simulate) e.update(dt, allPlayers, this.world, this);
      else e.render(dt);
    }

    // boss bar
    const boss = this.enemies.find(e => e.def.boss);
    if (boss && this.mapId === 'boss') this.ui.setBossBar('THE STONE WARDEN', boss.hp / boss.maxHp);

    // projectiles
    for (const pr of [...this.projectiles]) {
      const wasDead = pr.dead;
      pr.update(dt, this.world);
      if (!pr.dead) {
        if (pr.trailT >= 0.04) {
          pr.trailT = 0;
          this.fx.projectileTrail(pr.pos, pr.owner === 'player', pr.kind);
        }
        // arrows / bolts slice through tall grass
        if (pr.owner === 'player' && this.world.cutGrass(pr.pos.x, pr.pos.z)) {
          SFX.grass();
          this.fx.particles(pr.pos, 4, 1.3);
          if (Math.random() < 0.06) this.spawnDrop('gold', 1, pr.pos.clone().setY(0));
        }
        if (pr.owner === 'player') for (const e of this.enemies) {
          if (e.dead || pr.hitSet.has(e.id)) continue;
          if (pr.pos.distanceTo(e.pos) < 0.45 + e.def.size * 0.25) {
            pr.hitSet.add(e.id);
            // mark time of skill hit for kill_surge
            if (pr.owner === 'player' && pr.skillId) p.lastSkillHitT = 1.5;
            // bolt_haste: Spark Bolt hit reduces Nova cooldown by 1.5s
            const passives = getEquippedPassives(p.equip);
            if (pr.owner === 'player' && pr.skillId === 'bolt' && passives.has('bolt_haste')) {
              p.cooldowns['nova'] = Math.max(0, (p.cooldowns['nova'] || 0) - 1.5);
            }
            this.applyHit(e, pr.dmg, 0, pr.pos, pr.ragdoll, pr.knock, pr.ctx);
            // skill-tree: on-impact hazards (Conduit orb, Overdraw blast, Thunderhead)
            if (pr.ctx && pr.ctx.hazard && pr.ctx.hazard.atHit && !pr.ctxHazardDone) {
              const hz = pr.ctx.hazard;
              if (!hz.vsStatus || e.hasStatus(hz.vsStatus)) {
                pr.ctxHazardDone = true;
                this.spawnHazard(e.pos.clone().setY(0), hz, this.player.stats.dmg);
              }
            }
            // spark_fork: 25% chance the basic Spark forks toward the nearest live enemy
            if (pr.owner === 'player' && pr.skillId === 'spark' && passives.has('spark_fork') && Math.random() < 0.25) {
              const nearest = this.enemies.filter(en => !en.dead && en !== e)
                .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
              if (nearest) {
                const fv = nearest.pos.clone().sub(pr.pos).setY(0).normalize().multiplyScalar(9);
                const fork = new Projectile('player', pr.pos.clone(), fv, Math.round(pr.dmg * 0.6), 0.8,
                  { kind: pr.kind, skillId: 'spark_fork' });
                this.scene.add(fork.mesh);
                this.projectiles.push(fork);
              }
            }
            if (!pr.pierce) pr.dead = true;
            break;
          }
        }
      }
      if (pr.owner === 'player' && !pr.dead) {
        for (const o of this.physObjs) {
          if (o.dead) continue;
          if (pr.pos.distanceTo(o.pos) < 0.5) {
            o.hit(pr.dmg, pr.pos, this);
            if (!pr.pierce) pr.dead = true;
            break;
          }
        }
      }
      // dummies are solid tiles — projectiles stop at the tile edge, so check
      // even on the frame the projectile died, with a tile-sized radius
      if (pr.owner === 'player' && !wasDead) {
        for (const d of this.world.props) {
          if (d.type === 'dummy' && d.hp > 0 && Math.hypot(d.x + 0.5 - pr.pos.x, d.y + 0.5 - pr.pos.z) < 0.8) {
            this.hitDummy(d, pr.dmg);
            if (!pr.pierce) pr.dead = true;
          }
        }
      }
      if (pr.dead) {
        const hitEnemy = pr.owner === 'player' && pr.hitSet.size > 0;
        this.fx.impact(pr.pos, { bright: pr.owner === 'player', big: hitEnemy || pr.big });
        if (pr.glowLight) {
          this.fx.fadeLight(pr.glowLight, pr.pos);
          pr.glowLight = null;
        }
        this.scene.remove(pr.mesh);
        this.projectiles = this.projectiles.filter(x => x !== pr);
      }
    }

    // drops
    for (const d of [...this.drops]) {
      const picker = this.net.connected ? this.net.id : 'local';
      if (d.update(dt, p.pos, picker)) {
        if (d.kind === 'gold') { p.gold += d.data; SFX.coin(); this.toast(`+${d.data} gold`); }
        else if (d.kind === 'potion') { p.potions++; SFX.pickup(); this.toast('+1 Vale Tonic'); }
        else {
          p.inventory.push(d.data);
          SFX.pickupRarity(d.data.rarity);
          const r = d.data.rarity;
          this.toast(`${r === 'legendary' ? '★ ' : ''}${d.data.name} [${r}]`, r === 'rare' || r === 'legendary');
        }
        this.scene.remove(d.mesh);
        this.drops = this.drops.filter(x => x !== d);
        this.ui.refreshInventoryIfOpen();
        this.save();
      }
    }

    // knockable scenery physics
    for (const o of [...this.physObjs]) {
      o.update(dt, this.world, this);
      if (o.dead) {
        this.scene.remove(o.group);
        this.physObjs = this.physObjs.filter(x => x !== o);
      }
    }

    for (const rp of this.remotes.values()) if (rp.map === this.mapId) rp.update(dt);

    this.updateHazards(dt);
    this.updateTimers(dt);
    // Doublecast: refill banked mobility charges when the skill is off cooldown
    if (p.maxMobCharges) {
      const mid = CLASSES[p.klass].mobility.id;
      if ((p.cooldowns[mid] || 0) <= 0 && p.mobCharges < p.maxMobCharges) p.mobCharges = p.maxMobCharges;
    }
    if (this.levelQueue > 0 && !this.levelUpOpen) this.maybeShowLevelUp();
    this.fx.update(dt);
    this.world.update(dt, this.elapsed, p.pos);
    this.net.update(this.elapsed);
    this.ui.updateHUD(p, dt);

    // Ashfall arrival cinematic before the end screen
    if (this.arrivalHold > 0) {
      this.arrivalHold -= dt;
      if (this.arrivalHold <= 0) this.showAshfallEndScreen();
    }

    // camera
    this.shakeT = Math.max(0, this.shakeT - dt);
    const sx = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT : 0;
    const sz = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT : 0;
    if (this.arrivalHold > 0) {
      const pull = this.arrivalHold / 2.8;
      const zoom = 5.5 * pull;
      const target = new THREE.Vector3(
        p.pos.x + CAM_OFF.x + sx + zoom,
        CAM_OFF.y + 1.4 * pull,
        p.pos.z + CAM_OFF.z + sz + zoom * 0.45,
      );
      this.camera.position.lerp(target, Math.min(1, dt * 3));
      this.camera.lookAt(p.pos.x + sx, 0.55 + 0.25 * pull, p.pos.z + sz);
    } else {
      const target = new THREE.Vector3(p.pos.x + CAM_OFF.x + sx, CAM_OFF.y, p.pos.z + CAM_OFF.z + sz);
      this.camera.position.lerp(target, Math.min(1, dt * 7));
      this.camera.lookAt(p.pos.x + sx, 0.4, p.pos.z + sz);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* ================= INPUT ================= */
const input = { up: false, down: false, left: false, right: false, interact: false };
const game = new Game();

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'w'].includes(k)) input.up = true;
  if (['arrowdown', 's'].includes(k)) input.down = true;
  if (['arrowleft', 'a'].includes(k)) input.left = true;
  if (['arrowright', 'd'].includes(k)) input.right = true;
  if (!game.running) return;

  if (game.ui.shopOpen) {
    if (k === 'arrowup' || k === 'w') game.ui.shopNav(-1);
    if (k === 'arrowdown' || k === 's') game.ui.shopNav(1);
    if (k === 'e' || k === 'enter') game.ui.buySelected();
    if (k === 'escape') game.ui.closeShop();
    return;
  }
  if (game.fishing) {
    if (k === 'e' || k === 'enter' || k === ' ') { e.preventDefault(); game.fishingPress(); }
    return;
  }
  if (game.levelUpOpen) {
    if (k === 'enter' && game.ui._luPick) game.confirmLevelUpPick(game.ui._luPick);
    else if (k === 'k' || k === 'escape') game.confirmLevelUpPick(null);
    return;
  }
  if (game.ui.inDialog) {
    if (k === 'e' || k === 'enter' || k === ' ') { e.preventDefault(); game.ui.advanceDialog(); }
    return;
  }
  if (k === 'escape') { game.ui.closePanel(); return; }
  if (k === 'i') { game.ui.togglePanel('inventory'); return; }
  if (k === 'k') { game.ui.togglePanel('skills'); return; }
  if (game.ui.panelOpen) return;

  if (k === 'e' || k === 'enter') {
    input.interact = true;
    if (!game.player?.downed) game.interact();
  }
  if (k === ' ') { e.preventDefault(); game.trySkill(1, game.aimFromMouse(game.mouseX, game.mouseY)); }   // ability 3
  if (k === 'shift') game.tryMobility();                      // mobility skill
  if (k === 'q') game.drinkPotion();
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'w'].includes(k)) input.up = false;
  if (['arrowdown', 's'].includes(k)) input.down = false;
  if (['arrowleft', 'a'].includes(k)) input.left = false;
  if (['arrowright', 'd'].includes(k)) input.right = false;
  if (k === 'e' || k === 'enter') input.interact = false;
});

/* mouse: LMB basic attack (hold to repeat), RMB skill 1, SPACE skill 2 — all aimed at the cursor */
addEventListener('contextmenu', (e) => { if (game.running) e.preventDefault(); });
addEventListener('mousemove', (e) => { game.mouseX = e.clientX; game.mouseY = e.clientY; });
addEventListener('mousedown', (e) => {
  game.mouseX = e.clientX; game.mouseY = e.clientY;
  if (!game.running) return;
  if (game.fishing) { if (e.button === 0) game.fishingPress(); return; }
  if (game.ui.inDialog) { if (e.button === 0) game.ui.advanceDialog(); return; }
  if (game.uiLock || game.player?.downed || (e.target.closest && e.target.closest('#panel, #shop, #death-screen, #end-screen, #downed-overlay'))) return;
  const aim = game.aimFromMouse(e.clientX, e.clientY);
  if (e.button === 0) { game.mouseHeld = true; game.tryBasic(aim); } // ability 1
  else if (e.button === 2) game.trySkill(0, aim);                    // ability 2
});
addEventListener('mouseup', (e) => { if (e.button === 0) game.mouseHeld = false; });
addEventListener('blur', () => { game.mouseHeld = false; });

/* ================= TITLE SCREEN ================= */
function setupTitle() {
  migrateLegacySave();
  let chosen = null;
  let selectedSlot = null;
  let coopOpen = false;
  const slotSaves = Array.from({ length: SAVE_SLOTS }, (_, i) => loadSlot(i));

  const hint = $('#title-slot-hint');
  const afterSlot = $('#title-after-slot');
  const classSelect = $('#class-select');
  const heroPanel = $('#hero-panel');
  const soloBtn = $('#btn-solo');
  const coopBtn = $('#btn-coop');
  const coopPanel = $('#title-coop-panel');
  const coopStartBtn = $('#btn-coop-start');
  const titleControls = $('#title-controls');

  function refreshSlots() {
    document.querySelectorAll('.save-slot').forEach((btn, i) => {
      const save = slotSaves[i];
      const info = btn.querySelector('.slot-info');
      btn.classList.toggle('selected', selectedSlot === i);
      if (!save) {
        info.innerHTML = 'EMPTY<span class="slot-sub">new hero</span>';
        return;
      }
      const klass = CLASSES[save.klass]?.name?.toUpperCase() || save.klass?.toUpperCase() || '?';
      info.innerHTML = `LV ${save.level} ${klass}<span class="slot-sub">${save.mapId || 'town'}</span>`;
    });
  }

  function refreshClassCards() {
    document.querySelectorAll('.class-card').forEach(card => {
      const save = selectedSlot != null ? slotSaves[selectedSlot] : null;
      card.classList.toggle('selected', save ? save.klass === card.dataset.class : chosen === card.dataset.class);
    });
  }

  function refreshHeroPanel(save) {
    if (!save) return;
    const klass = save.klass;
    blitTo($('#hero-portrait'), Art.chars[klass].down[0]);
    $('#hero-class-name').textContent = CLASSES[klass]?.name?.toUpperCase() || klass.toUpperCase();
    $('#hero-meta').textContent = `Level ${save.level} · ${save.mapId || 'town'} · ${save.gold || 0}g`;
  }

  function updateTitleActions() {
    refreshSlots();
    refreshClassCards();
    const save = selectedSlot != null ? slotSaves[selectedSlot] : null;
    const klass = save?.klass || chosen;
    const ready = selectedSlot != null && klass;

    afterSlot.classList.toggle('hidden', selectedSlot == null);
    titleControls.classList.toggle('hidden', selectedSlot == null);

    if (selectedSlot == null) {
      hint.textContent = 'Choose a save slot';
      coopOpen = false;
      coopPanel.classList.add('hidden');
      coopBtn.classList.remove('active');
      return;
    }

    if (save) {
      classSelect.classList.add('hidden');
      heroPanel.classList.remove('hidden');
      refreshHeroPanel(save);
      hint.textContent = `Slot ${selectedSlot + 1} · continue your journey`;
      soloBtn.textContent = 'CONTINUE SOLO';
      coopBtn.textContent = 'CONTINUE CO-OP';
      if (save.lastRoom) $('#coop-room').value = save.lastRoom;
      if (save.lastHeroName) $('#coop-name').value = save.lastHeroName;
    } else {
      classSelect.classList.remove('hidden');
      heroPanel.classList.add('hidden');
      hint.textContent = `Slot ${selectedSlot + 1} · pick a class`;
      soloBtn.textContent = 'NEW GAME · SOLO';
      coopBtn.textContent = 'NEW GAME · CO-OP';
    }

    soloBtn.disabled = !ready;
    coopBtn.disabled = !ready;
    coopPanel.classList.toggle('hidden', !coopOpen);
    coopBtn.classList.toggle('active', coopOpen);
    coopStartBtn.textContent = save ? 'CONTINUE CO-OP' : 'JOIN ROOM';
  }

  document.querySelectorAll('.save-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSlot = Number(btn.dataset.slot);
      const save = slotSaves[selectedSlot];
      if (save) chosen = save.klass;
      else chosen = null;
      coopOpen = false;
      updateTitleActions();
      initAudio(); SFX.ui();
    });
  });

  document.querySelectorAll('.class-card').forEach(card => {
    const klass = card.dataset.class;
    blitTo(card.querySelector('canvas'), Art.chars[klass].down[0]);
    card.addEventListener('click', () => {
      if (selectedSlot == null) {
        hint.textContent = 'Choose a save slot first';
        SFX.deny();
        return;
      }
      if (slotSaves[selectedSlot]) {
        hint.textContent = 'This slot already has a hero — pick an empty slot for a new class';
        SFX.deny();
        return;
      }
      chosen = klass;
      updateTitleActions();
      initAudio(); SFX.ui();
    });
  });

  soloBtn.addEventListener('click', () => {
    if (selectedSlot == null) return;
    const save = slotSaves[selectedSlot];
    const klass = save?.klass || chosen;
    if (!klass) return;
    beginGame({ slot: selectedSlot, klass, save: save || null, coop: null });
  });

  coopBtn.addEventListener('click', () => {
    if (selectedSlot == null) return;
    const save = slotSaves[selectedSlot];
    const klass = save?.klass || chosen;
    if (!klass) return;
    coopOpen = !coopOpen;
    updateTitleActions();
    initAudio(); SFX.ui();
  });

  coopStartBtn.addEventListener('click', () => {
    if (selectedSlot == null) return;
    const save = slotSaves[selectedSlot];
    const klass = save?.klass || chosen;
    if (!klass) return;
    const room = $('#coop-room').value.trim() || 'vale';
    const name = $('#coop-name').value.trim() || 'hero';
    const serverRaw = $('#coop-server').value.trim();
    beginGame({
      slot: selectedSlot,
      klass,
      save: save || null,
      coop: { room, name, url: serverRaw || undefined },
    });
  });

  $('#btn-respawn').addEventListener('click', () => game.respawn());
  $('#btn-end-continue').addEventListener('click', () => {
    $('#end-screen').classList.add('hidden');
    game.endOpen = false;
    game.uiLock = false;
    playMusic('town');
  });

  updateTitleActions();
}

function beginGame({ slot, klass, save, coop }) {
  initAudio();
  $('#title-screen').classList.add('hidden');
  game.start(klass, save, coop, slot);
}

/* ================= BOOT ================= */
window.game = game; // debug handle
Art.init();
game.initRenderer();
setupTitle();
(function loop() {
  requestAnimationFrame(loop);
  game.update();
})();
