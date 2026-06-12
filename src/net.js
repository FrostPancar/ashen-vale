// ASHEN VALE — coop client. Host-authoritative enemies, relayed world events.
import { MAX_PARTY } from './coop.js';

const HOSTED_RELAY = 'wss://ashen-vale-coop-production.up.railway.app';

function defaultCoopUrl() {
  const fromEnv = import.meta.env.VITE_WS_URL;
  if (fromEnv) return fromEnv;
  if (import.meta.env.PROD && location.protocol === 'https:') return HOSTED_RELAY;
  return `ws://${location.hostname}:8081`;
}

const DEFAULT_URL = defaultCoopUrl();

export class Net {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.id = null;
    this.isHost = true;   // single-player acts as host
    this.connected = false;
    this.peers = new Map(); // id -> { name, klass, state }
    this.lastStateSent = 0;
    this.lastEnemySync = 0;
    this.lastPingSent = 0;
    this.pingMs = null;
    this.room = '';
    this.heroName = '';
  }

  connect(room, name, klass, url = DEFAULT_URL) {
    this.room = room;
    this.heroName = name;
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.id = null;
    this.connected = false;
    this.isHost = true;
    this.peers.clear();
    this.pingMs = null;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(fail);
        resolve(ok);
      };
      try { this.ws = new WebSocket(url); }
      catch { return finish(false); }
      const fail = setTimeout(() => { try { this.ws?.close(); } catch {} finish(false); }, 3500);
      this.ws.onopen = () => {
        this.send({ t: 'join', room, name, klass });
      };
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.t === 'reject') {
          finish(false);
          return;
        }
        if (msg.t === 'welcome') {
          this.id = msg.id;
          this.isHost = msg.host;
          this.connected = true;
          for (const p of msg.peers) this.peers.set(p.id, { name: p.name, klass: p.klass, state: null });
          finish(true);
          this.game.onNetReady();
          return;
        }
        this.handle(msg);
      };
      this.ws.onclose = () => {
        if (!settled) finish(false);
        const was = this.connected;
        this.connected = false;
        this.isHost = true;
        this.peers.clear();
        if (was) this.game.onNetDrop();
      };
      this.ws.onerror = () => {};
    });
  }

  handle(msg) {
    const g = this.game;
    switch (msg.t) {
      case 'peerJoin':
        this.peers.set(msg.id, { name: msg.name, klass: msg.klass, state: null });
        g.toast(`${msg.name} joined the vale`);
        if (this.isHost) {
          this.send({ t: 'flags', flags: g.shareableFlags() });
          g.syncCoopAnchor();
        }
        break;
      case 'peerLeave': {
        const p = this.peers.get(msg.id);
        if (p) g.toast(`${p.name} left`);
        this.peers.delete(msg.id);
        g.removeRemotePlayer(msg.id);
        break;
      }
      case 'youAreHost':
        this.isHost = true;
        g.onBecomeHost();
        break;
      case 'hostChange':
        if (msg.id === this.id) g.onBecomeHost();
        else g.toast('Host left — a new host is leading the world');
        break;
      case 'state': {
        const p = this.peers.get(msg.from);
        if (p) { p.state = msg.s; g.updateRemotePlayer(msg.from, p); }
        break;
      }
      case 'enemies':
        if (!this.isHost) g.applyEnemySync(msg.map, msg.list);
        break;
      case 'hitEnemy':
        if (this.isHost) g.remoteHitEnemy(msg.eid, msg.dmg, msg.from);
        break;
      case 'event':
        g.applyNetEvent(msg);
        break;
      case 'flags':
        g.mergeFlags(msg.flags);
        break;
      case 'pong':
        if (msg.at != null) this.pingMs = Math.max(0, Date.now() - msg.at);
        break;
    }
  }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  /* called every frame by game */
  update(t) {
    if (!this.connected) return;
    if (t - this.lastPingSent > 2.5) {
      this.lastPingSent = t;
      this.send({ t: 'ping', at: Date.now() });
    }
    if (t - this.lastStateSent > 0.08) {
      this.lastStateSent = t;
      const pl = this.game.player;
      this.send({
        t: 'state',
        s: {
          x: +pl.pos.x.toFixed(2), z: +pl.pos.z.toFixed(2),
          dir: pl.dir, moving: pl.moving && !pl.downed, map: this.game.mapId,
          hp: pl.downed ? 0 : pl.hp, maxHp: pl.stats.maxHp,
          downed: pl.downed ? 1 : 0,
          bleed: pl.downed ? +pl.bleedT.toFixed(1) : 0,
          attacking: pl.attackAnim > 0,
        },
      });
    }
    if (this.isHost && t - this.lastEnemySync > 0.12) {
      this.lastEnemySync = t;
      const list = this.game.enemySyncData();
      this.send({ t: 'enemies', map: this.game.mapId, list });
    }
  }

  sendEvent(kind, data = {}) {
    this.send({ t: 'event', kind, ...data });
  }

  hitEnemy(eid, dmg) {
    if (this.isHost) return; // host applies locally
    this.send({ t: 'toHost', payload: { t: 'hitEnemy', eid, dmg } });
  }

  sendRevive(targetId) {
    this.send({ t: 'event', kind: 'revive', target: targetId });
  }

  coopStatusLine() {
    if (!this.connected) return null;
    const role = this.isHost ? 'host' : 'guest';
    const n = 1 + this.peers.size;
    let line = `CO-OP · "${this.room}" · ${role} · ${n}/${MAX_PARTY}`;
    if (this.pingMs != null && this.pingMs >= 120) line += ` · ${this.pingMs}ms`;
    return { line, warn: this.pingMs != null && this.pingMs >= 220,
      worldNote: this.isHost ? 'you set world gates' : 'world progress · host' };
  }
}
