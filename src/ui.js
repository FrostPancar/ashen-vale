// ASHEN VALE — DOM UI: HUD, dialog, inventory, skills, shop, toasts.
import { Art, blitTo } from './art.js';
import { RARITIES, itemStatDelta, formatStatDeltaHtml } from './items.js';
import { CLASSES, SKILL_MAX, skillRankLabel, skillNextDesc } from './skills.js';
import { treeLanes, nodeState, unlockNode, applyTreeStats } from './skilltree.js';
import { QUEST_TEXT } from './quests.js';
import { SFX } from './audio.js';

const $ = (s) => document.querySelector(s);

export class UI {
  constructor(game) {
    this.game = game;
    this.dialogQueue = [];
    this.dialogActive = null;
    this.typeT = 0;
    this.typeIdx = 0;
    this.panelOpen = false;
    this.shopOpen = false;
    this.shopSel = 0;
    this.shopItems = [];
    this.areaTimer = 0;

    $('#panel-tabs').addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      if (tab) this.showTab(tab);
    });

    // level-up upgrade picker
    this._luPick = null;
    this._luOnConfirm = null;
    $('#levelup-confirm').addEventListener('click', () => { if (this._luOnConfirm) this._luOnConfirm(this._luPick); });
    $('#levelup-later').addEventListener('click', () => { if (this._luOnConfirm) this._luOnConfirm(null); });
  }

  /* ---------- HUD ---------- */
  initHotbar(player) {
    const k = CLASSES[player.klass];
    const slots = document.querySelectorAll('#hotbar .slot');
    const order = [k.basic, k.skills[0], k.skills[1], k.mobility];
    order.forEach((s, i) => blitTo(slots[i].querySelector('canvas'), Art.icons[s.icon]));
    blitTo(slots[4].querySelector('canvas'), Art.icons.potion);
  }

  updateHUD(player, dt) {
    const s = player.stats;
    $('#hp-fill').style.transform = `scaleX(${Math.max(0, player.hp / s.maxHp)})`;
    $('#hp-text').textContent = `${Math.ceil(player.hp)}/${s.maxHp}`;
    $('#mp-fill').style.transform = `scaleX(${Math.max(0, player.mp / s.maxMp)})`;
    $('#mp-text').textContent = `${Math.floor(player.mp)}/${s.maxMp}`;
    const { xpForLevel } = this.game.skillsApi;
    $('#xp-fill').style.transform = `scaleX(${player.xp / xpForLevel(player.level)})`;
    $('#hud-level').textContent = `LV ${player.level} ${player.klassName.toUpperCase()}`;
    $('#hud-gold').textContent = `· ${player.gold}g`;
    $('#potion-count').textContent = player.potions;
    // cooldowns
    const k = CLASSES[player.klass];
    const slots = document.querySelectorAll('#hotbar .slot');
    const cds = [k.basic, k.skills[0], k.skills[1], k.mobility];
    cds.forEach((sk, i) => {
      const cd = player.cooldowns[sk.id] || 0;
      const full = sk.cd * player.cdScale();
      slots[i].querySelector('.cd').style.transform = `scaleY(${full > 0 ? Math.min(1, cd / full) : 0})`;
    });
    if (this.areaTimer > 0) {
      this.areaTimer -= dt;
      if (this.areaTimer <= 0) $('#hud-area-name').style.opacity = 0;
    }
  }

  showArea(name) {
    const el = $('#hud-area-name');
    el.textContent = name;
    el.style.opacity = 1;
    this.areaTimer = 2.6;
  }

  updateQuest(stage, progress, sideEntries = [], sideChecklist = false) {
    const root = $('#quest-tracker');
    root.innerHTML = '';
    const q = QUEST_TEXT[stage];
    if (!q && !sideEntries.length) return;

    if (q) {
      const title = document.createElement('div');
      title.className = 'q-title';
      title.textContent = `◆ ${q.title}`;
      root.appendChild(title);
      for (const o of q.objs) {
        const row = document.createElement('div');
        row.className = 'q-obj' + (progress[o.id] ? ' done' : '');
        const cnt = o.count ? ` (${Math.min(progress.dummies_n || 0, o.count)}/${o.count})` : '';
        row.textContent = `- ${o.text}${cnt}`;
        root.appendChild(row);
      }
    }

    if (sideEntries.length) {
      const sideTitle = document.createElement('div');
      sideTitle.className = 'q-title q-side';
      sideTitle.textContent = sideChecklist ? '◇ ASHFALL TASKS' : '◇ SIDE QUESTS';
      root.appendChild(sideTitle);
      for (const s of sideEntries) {
        const row = document.createElement('div');
        row.className = ['q-obj', s.done && 'done', s.here && 'here', s.pending && 'pending'].filter(Boolean).join(' ');
        const mark = document.createElement('span');
        mark.className = 'q-mark';
        mark.textContent = s.here ? '!' : '-';
        row.append(mark, document.createTextNode(` ${s.text}`));
        root.appendChild(row);
      }
    }
  }

  setBossBar(name, frac) {
    const bar = $('#boss-bar');
    if (name == null) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    $('#boss-name').textContent = name;
    $('#boss-fill').style.transform = `scaleX(${Math.max(0, frac)})`;
  }

  setCoopStatus(info) {
    const hud = $('#coop-hud');
    if (!info) {
      hud.classList.add('hidden');
      return;
    }
    hud.classList.remove('hidden');
    const line = $('#coop-status-line');
    line.textContent = info.line || '';
    line.classList.toggle('warn', !!info.warn);
    const note = $('#coop-world-note');
    note.textContent = info.worldNote || '';
    note.style.display = info.worldNote ? 'block' : 'none';
  }

  updatePartyStrip(entries) {
    const root = $('#party-strip');
    root.innerHTML = '';
    if (!entries.length) return;
    for (const e of entries) {
      const card = document.createElement('div');
      card.className = 'party-card' + (e.downed ? ' downed' : '');
      const frac = e.maxHp > 0 ? Math.max(0, e.hp / e.maxHp) : 0;
      card.innerHTML =
        `<div class="party-name">${e.name}</div>` +
        `<div class="party-bar"><div class="fill" style="transform:scaleX(${frac})"></div></div>` +
        `<div class="party-meta">${e.downed ? `downed · ${Math.ceil(e.bleed || 0)}s` : e.meta || ''}</div>`;
      root.appendChild(card);
    }
  }

  showDowned(bleedT, revivesLeft) {
    const el = $('#downed-overlay');
    el.classList.remove('hidden');
    $('#downed-revives').textContent = revivesLeft > 0
      ? `${revivesLeft} revive${revivesLeft === 1 ? '' : 's'} left this fight`
      : 'No revives left — bleed out sends you to the inn';
    this.updateDownedRing(bleedT);
  }

  updateDownedRing(bleedT) {
    const max = 15;
    const t = Math.max(0, bleedT);
    $('#downed-timer').textContent = Math.ceil(t);
    const circ = 175.93;
    $('#downed-ring-fill').style.strokeDashoffset = `${circ * (1 - t / max)}`;
  }

  hideDowned() {
    $('#downed-overlay').classList.add('hidden');
  }

  showRevivePrompt(name, frac) {
    const el = $('#revive-prompt');
    el.classList.remove('hidden');
    el.innerHTML =
      `Hold <kbd>E</kbd> to revive <b>${name}</b>` +
      `<span class="revive-bar"><span class="fill" style="width:${Math.round(frac * 100)}%"></span></span>`;
  }

  hideRevivePrompt() {
    $('#revive-prompt').classList.add('hidden');
  }

  setDeathScreen(opts = {}) {
    $('#death-title').textContent = opts.title || 'YOU FELL...';
    $('#death-text').textContent = opts.text || 'The vale claims another. But the bell of Eldermoor calls you back.';
  }

  /* ---------- dialog ---------- */
  startDialog(pages, onDone) {
    this.dialogQueue = [...pages];
    this.dialogOnDone = onDone;
    this.nextDialogPage();
    $('#dialog-box').classList.remove('hidden');
    this.game.uiLock = true;
  }
  nextDialogPage() {
    const page = this.dialogQueue.shift();
    if (!page) { this.endDialog(); return; }
    this.dialogActive = page;
    this.typeIdx = 0; this.typeT = 0;
    $('#dialog-name').textContent = page.name || '';
    $('#dialog-text').textContent = '';
  }
  advanceDialog() {
    if (!this.dialogActive) return;
    if (this.typeIdx < this.dialogActive.text.length) {
      this.typeIdx = this.dialogActive.text.length; // skip typing
      $('#dialog-text').textContent = this.dialogActive.text;
    } else {
      SFX.ui();
      this.nextDialogPage();
    }
  }
  endDialog() {
    this.dialogActive = null;
    $('#dialog-box').classList.add('hidden');
    this.game.unlockUI();
    const cb = this.dialogOnDone;
    this.dialogOnDone = null;
    if (cb) cb();
  }
  updateDialog(dt) {
    if (!this.dialogActive) return;
    if (this.typeIdx < this.dialogActive.text.length) {
      this.typeT += dt * 46;
      const n = Math.min(this.dialogActive.text.length, this.typeT | 0);
      if (n !== this.typeIdx) {
        this.typeIdx = n;
        $('#dialog-text').textContent = this.dialogActive.text.slice(0, n);
      }
    }
  }
  get inDialog() { return !!this.dialogActive; }

  /* ---------- inventory / skills panel ---------- */
  togglePanel(tab) {
    if (this.panelOpen && this._tab === tab) { this.closePanel(); return; }
    this.panelOpen = true;
    this.game.uiLock = true;
    $('#panel').classList.remove('hidden');
    this.showTab(tab || 'inventory');
  }
  closePanel() {
    this.panelOpen = false;
    $('#panel').classList.add('hidden');
    $('#item-tooltip').classList.add('hidden');
    if (!this.inDialog && !this.shopOpen) this.game.unlockUI();
  }
  showTab(tab) {
    this._tab = tab;
    document.querySelectorAll('#panel-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('#panel-inventory').classList.toggle('hidden', tab !== 'inventory');
    $('#panel-skills').classList.toggle('hidden', tab !== 'skills');
    if (tab === 'inventory') this.renderInventory();
    else this.renderSkills();
  }

  itemCell(item, onClick, actionText, compareTo = null) {
    const div = document.createElement('div');
    div.className = `item-cell ${item ? RARITIES[item.rarity].cls : ''}`;
    if (item) {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      blitTo(c, Art.icons[item.icon]);
      div.appendChild(c);
      div.addEventListener('mouseenter', (e) => this.showTooltip(item, e, actionText, compareTo));
      div.addEventListener('mousemove', (e) => this.moveTooltip(e));
      div.addEventListener('mouseleave', () => $('#item-tooltip').classList.add('hidden'));
      if (onClick) div.addEventListener('click', () => { onClick(); $('#item-tooltip').classList.add('hidden'); });
    }
    return div;
  }

  showTooltip(item, e, actionText, compareTo = null) {
    const tt = $('#item-tooltip');
    const r = RARITIES[item.rarity];
    let html =
      `<div class="t-name ${r.cls}">${item.name}</div>` +
      `<div class="t-type">${r.name} ${item.slot} · ilvl ${item.level}</div>`;
    if (item.dmg) html += `<div class="t-stat">Damage: ${item.dmg}</div>`;
    if (item.def) html += `<div class="t-stat">Defense: ${item.def}</div>`;
    for (const a of item.affixes) html += `<div class="t-affix">${a.text}</div>`;
    const deltas = compareTo ? itemStatDelta(item, compareTo) : [];
    if (deltas.length) {
      html += `<div class="t-compare"><span class="t-compare-label">vs equipped</span> ${formatStatDeltaHtml(deltas)}</div>`;
    } else if (compareTo === null && actionText === 'click to equip') {
      html += `<div class="t-compare t-compare-new">New slot — no comparison</div>`;
    }
    if (actionText) html += `<div class="t-action">${actionText}</div>`;
    tt.innerHTML = html;
    tt.classList.remove('hidden');
    this.moveTooltip(e);
  }
  moveTooltip(e) {
    const tt = $('#item-tooltip');
    tt.style.left = Math.min(window.innerWidth - 260, e.clientX + 14) + 'px';
    tt.style.top = Math.min(window.innerHeight - 200, e.clientY + 10) + 'px';
  }

  renderInventory() {
    const p = this.game.player;
    for (const slot of ['weapon', 'armor', 'trinket']) {
      const holder = document.querySelector(`.equip-slot[data-eq=${slot}]`);
      holder.querySelector('.item-cell').replaceWith(
        this.itemCell(p.equip[slot], () => { this.game.unequip(slot); this.renderInventory(); }, 'click to unequip')
      );
    }
    const s = p.stats;
    const stat = (label, value) =>
      `<div class="stat-item"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
    $('#char-stats').innerHTML =
      `<div class="stats-header">` +
        `<span class="stats-class">${p.klassName}</span>` +
        `<span class="stats-level">LV ${p.level}</span>` +
      `</div>` +
      `<div class="stats-grid">` +
        stat('DMG', s.dmg) +
        stat('DEF', s.def) +
        stat('HP', s.maxHp) +
        stat('MP', s.maxMp) +
        stat('CRIT', `${s.crit}%`) +
        stat('SPD', `+${s.spd}%`) +
        stat('LEECH', `${s.leech}%`) +
        stat('CDR', `${s.cdr}%`) +
      `</div>` +
      `<div class="stats-footer">` +
        stat('GOLD', p.gold) +
        stat('POTIONS', p.potions) +
      `</div>`;
    const grid = $('#inv-grid');
    grid.innerHTML = '';
    p.inventory.forEach((item, idx) => {
      grid.appendChild(this.itemCell(
        item,
        () => { this.game.equipItem(idx); this.renderInventory(); },
        'click to equip',
        p.equip[item.slot] ?? null,
      ));
    });
    for (let i = p.inventory.length; i < Math.max(12, p.inventory.length); i++) {
      grid.appendChild(this.itemCell(null));
    }
  }

  /* ---------- skill tree ---------- */
  renderSkills() {
    const p = this.game.player;
    const sp = $('#skill-points');
    sp.textContent = `SKILL POINTS: ${p.skillPoints}`;
    sp.classList.toggle('no-sp', p.skillPoints <= 0);
    const tree = $('#skill-tree');
    tree.innerHTML = '';
    for (const lane of treeLanes(p.klass)) {
      const row = document.createElement('div');
      row.className = 'tree-lane';
      const head = document.createElement('div');
      head.className = 'tl-head';
      head.innerHTML = `<span class="tl-key">${lane.key}</span><span class="tl-name">${lane.name}</span><span class="tl-kind">${lane.kind}</span>`;
      const track = document.createElement('div');
      track.className = 'tl-track';
      const [base, emp, pA, pB, syn] = lane.nodes;
      track.append(this.nodeEl(p, lane, base), this.connEl(), this.nodeEl(p, lane, emp), this.connEl('fork'));
      const fork = document.createElement('div');
      fork.className = 'tl-fork';
      fork.append(this.nodeEl(p, lane, pA), this.nodeEl(p, lane, pB));
      track.append(fork, this.connEl(), this.nodeEl(p, lane, syn));
      row.append(head, track);
      tree.appendChild(row);
    }
  }

  nodeEl(p, lane, node) {
    const st = nodeState(p, node);
    const tierCls = node.tier === 0 ? 't-base' : node.tier === 1 ? 't-emp' : node.tier === 2 ? 't-path' : 't-syn';
    const el = document.createElement('button');
    el.className = `tnode ${tierCls} st-${st}` + (this._selNode === node.id ? ' sel' : '');
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32; blitTo(c, Art.icons[node.icon] || Art.icons[lane.icon]);
    const name = document.createElement('span');
    name.className = 'tn-name';
    name.textContent = node.name;
    el.append(c, name);
    if (st === 'available' && p.skillPoints > 0) el.classList.add('can-buy');
    el.addEventListener('click', () => this.selectNode(p, lane, node));
    return el;
  }
  connEl(kind) {
    const d = document.createElement('div');
    d.className = 'tl-conn' + (kind ? ' ' + kind : '');
    return d;
  }

  selectNode(p, lane, node) {
    this._selNode = node.id;
    const st = nodeState(p, node);
    const d = $('#node-detail');
    d.classList.remove('hidden');
    const tierName = node.tier === 0 ? 'Ability' : node.tier === 1 ? 'Empower' : node.tier === 2 ? 'Path · pick one' : 'Synergy';
    let foot;
    if (st === 'available' && p.skillPoints > 0) foot = `<button id="nd-unlock">UNLOCK · 1 SP</button>`;
    else if (st === 'available') foot = `<span class="nd-tag">Level up to earn a point</span>`;
    else if (st === 'owned') foot = `<span class="nd-tag owned">✓ LEARNED</span>`;
    else if (st === 'blocked') foot = `<span class="nd-tag">Locked — you chose the other path</span>`;
    else foot = `<span class="nd-tag">Requires the previous upgrade</span>`;
    d.innerHTML =
      `<div class="nd-top"><span class="nd-name">${node.name}</span><span class="nd-tier ${node.tier === 3 ? 'syn' : ''}">${tierName}</span></div>` +
      `<div class="nd-lane">${lane.name} · ${lane.kind}</div>` +
      `<div class="nd-desc">${node.desc}</div><div class="nd-foot">${foot}</div>`;
    const ub = $('#nd-unlock');
    if (ub) ub.addEventListener('click', () => {
      if (unlockNode(p, node.id)) {
        p.skillPoints--;
        applyTreeStats(p);
        SFX.levelup();
        this.renderSkills();
        this.selectNode(p, lane, node);
        this.game.save();
      }
    });
    this.renderSkills();
  }

  /* ---------- level-up upgrade picker ---------- */
  showLevelUp(choices, onConfirm) {
    this._luPick = null;
    this._luOnConfirm = onConfirm;
    const wrap = $('#levelup-choices');
    wrap.innerHTML = '';
    for (const { node, lane } of choices) {
      const tier = node.tier === 1 ? 'EMPOWER' : node.tier === 2 ? 'PATH' : node.tier === 3 ? 'SYNERGY' : 'ABILITY';
      const card = document.createElement('button');
      card.className = `lu-choice tier-${node.tier}`;
      const cv = document.createElement('canvas');
      cv.width = 40; cv.height = 40; blitTo(cv, Art.icons[node.icon] || Art.icons[lane.icon]);
      const info = document.createElement('div');
      info.className = 'lu-info';
      info.innerHTML = `<div class="lu-lane">${lane.name} · ${tier}</div><div class="lu-name">${node.name}</div><div class="lu-desc">${node.desc}</div>`;
      card.append(cv, info);
      card.addEventListener('click', () => {
        this._luPick = node.id;
        wrap.querySelectorAll('.lu-choice').forEach(b => b.classList.remove('sel'));
        card.classList.add('sel');
        $('#levelup-confirm').disabled = false;
        SFX.ui();
      });
      wrap.appendChild(card);
    }
    $('#levelup-confirm').disabled = true;
    $('#levelup-modal').classList.remove('hidden');
  }
  hideLevelUp() { $('#levelup-modal').classList.add('hidden'); }

  /* ---------- shop ---------- */
  openShop(title, items) {
    this.shopOpen = true;
    this.shopItems = items;
    this.shopSel = 0;
    this.game.uiLock = true;
    $('#shop').classList.remove('hidden');
    $('#shop-title').textContent = title;
    this.renderShop();
  }
  renderShop() {
    const p = this.game.player;
    const wrap = $('#shop-items');
    wrap.innerHTML = '';
    this.shopItems.forEach((entry, i) => {
      const div = document.createElement('div');
      const sold = !!entry.sold;
      const priceVal = entry.price ?? entry.item?.price ?? 0;
      const cantAfford = !sold && p.gold < priceVal;
      if (entry.kind === 'item') div.className = `shop-item ${RARITIES[entry.item.rarity].cls}${i === this.shopSel ? ' selected' : ''}`;
      else div.className = 'shop-item' + (i === this.shopSel ? ' selected' : '');
      const c = document.createElement('canvas'); c.width = 44; c.height = 44;
      const icon = entry.kind === 'potion' ? 'potion' : entry.item.icon;
      blitTo(c, Art.icons[icon]);
      const info = document.createElement('div');
      info.className = 'si-info';
      if (entry.kind === 'potion') {
        info.innerHTML = `<div class="si-name">${entry.name}</div><div class="si-desc">${entry.desc}</div>`;
      } else {
        const it = entry.item;
        const aff = it.affixes.map(a => a.text).join(' · ') || '—';
        const tag = entry.tag ? `<span class="si-tag">${entry.tag}</span>` : '';
        const eq = p.equip[it.slot];
        const deltas = eq ? itemStatDelta(it, eq) : [];
        const stats = [
          it.dmg ? `DMG ${it.dmg}` : '',
          it.def ? `DEF ${it.def}` : '',
          aff,
        ].filter(Boolean).join(' · ');
        const cmp = deltas.length
          ? `<div class="si-compare"><span class="si-compare-label">vs equipped</span> ${formatStatDeltaHtml(deltas)}</div>`
          : `<div class="si-compare si-compare-new">Empty ${it.slot} slot</div>`;
        info.innerHTML =
          `<div class="si-name">${tag}<span class="si-item-name">${it.name}</span> <span class="si-rarity">(${RARITIES[it.rarity].name} ${it.slot})</span></div>` +
          `<div class="si-desc">${stats}</div>` +
          cmp;
      }
      const price = document.createElement('div');
      price.className = 'si-price' + (sold ? ' sold' : '') + (cantAfford ? ' cant-afford' : '');
      price.textContent = sold ? 'SOLD' : `${priceVal}g`;
      div.append(c, info, price);
      div.addEventListener('click', () => { this.shopSel = i; this.renderShop(); });
      div.addEventListener('dblclick', () => this.buySelected());
      wrap.appendChild(div);
    });
    $('#shop-gold').textContent = `${p.gold}g`;
  }
  shopNav(d) {
    this.shopSel = (this.shopSel + d + this.shopItems.length) % this.shopItems.length;
    SFX.ui();
    this.renderShop();
  }
  buySelected() {
    const entry = this.shopItems[this.shopSel];
    if (!entry || entry.sold) return;
    const price = entry.price ?? entry.item.price;
    const p = this.game.player;
    if (p.gold < price) { SFX.deny(); this.game.toast('Not enough gold'); return; }
    p.gold -= price;
    if (entry.kind === 'potion') p.potions++;
    else { p.inventory.push(entry.item); entry.sold = true; }
    SFX.coin();
    this.game.toast(entry.kind === 'potion' ? '+1 Vale Tonic' : `Bought ${entry.item.name}`);
    this.renderShop();
    this.game.save();
  }
  closeShop() {
    this.shopOpen = false;
    $('#shop').classList.add('hidden');
    if (!this.inDialog && !this.panelOpen) this.game.unlockUI();
  }

  /* ---------- force close (death/end screens) ---------- */
  forceCloseAll() {
    this.dialogActive = null;
    this.dialogQueue = [];
    this.dialogOnDone = null;
    $('#dialog-box').classList.add('hidden');
    $('#levelup-modal').classList.add('hidden');
    this.game.levelUpOpen = false;
    this.closePanel();
    this.closeShop();
  }

  /* ---------- toasts ---------- */
  toast(text, rare = false) {
    const div = document.createElement('div');
    div.className = 'toast' + (rare ? ' rare' : '');
    div.textContent = text;
    $('#toast-container').appendChild(div);
    setTimeout(() => div.remove(), 3300);
  }
}
