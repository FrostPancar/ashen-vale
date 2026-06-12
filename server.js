// ASHEN VALE coop relay server.
// Rooms of players; first member is "host" and owns enemy simulation.
// Pure relay + room bookkeeping — game logic stays client-side.
import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8081;
const MAX_ROOM = 4;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ashen-vale coop\n');
});
const wss = new WebSocketServer({ server });
const rooms = new Map(); // name -> { members: Map<id, ws>, hostId }
let nextId = 1;

function roomOf(ws) { return rooms.get(ws._room); }

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg, exceptId = null) {
  for (const [id, ws] of room.members) {
    if (id !== exceptId) send(ws, msg);
  }
}

wss.on('connection', (ws) => {
  ws._id = nextId++;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.t === 'join') {
      const name = String(msg.room || 'vale').slice(0, 24);
      let room = rooms.get(name);
      if (!room) { room = { members: new Map(), hostId: ws._id }; rooms.set(name, room); }
      if (room.members.size >= MAX_ROOM) {
        send(ws, { t: 'reject', reason: 'room full (max 4)' });
        ws.close();
        return;
      }
      ws._room = name;
      room.members.set(ws._id, ws);
      ws._meta = { name: String(msg.name || 'hero').slice(0, 12), klass: msg.klass };
      send(ws, {
        t: 'welcome', id: ws._id, host: room.hostId === ws._id,
        peers: [...room.members.entries()]
          .filter(([id]) => id !== ws._id)
          .map(([id, p]) => ({ id, ...p._meta })),
      });
      broadcast(room, { t: 'peerJoin', id: ws._id, ...ws._meta }, ws._id);
      return;
    }

    const room = roomOf(ws);
    if (!room) return;

    if (msg.t === 'toHost') {
      // route a message to the room host (e.g. damage dealt by a guest)
      const host = room.members.get(room.hostId);
      if (host) send(host, { ...msg.payload, from: ws._id });
      return;
    }
    if (msg.t === 'ping') {
      send(ws, { t: 'pong', at: msg.at });
      return;
    }
    // everything else: relay to everyone else in room
    broadcast(room, { ...msg, from: ws._id }, ws._id);
  });

  ws.on('close', () => {
    const room = roomOf(ws);
    if (!room) return;
    room.members.delete(ws._id);
    broadcast(room, { t: 'peerLeave', id: ws._id });
    if (room.hostId === ws._id && room.members.size > 0) {
      room.hostId = room.members.keys().next().value;
      const newHost = room.members.get(room.hostId);
      send(newHost, { t: 'youAreHost' });
      broadcast(room, { t: 'hostChange', id: room.hostId });
    }
    if (room.members.size === 0) rooms.delete(ws._room);
  });
});

server.listen(PORT, () => {
  console.log(`[ashen-vale] coop server listening on port ${PORT}`);
});
