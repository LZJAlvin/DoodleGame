// Spin Doodle server: serves the game page and relays messages between players in the same room.
// The game logic runs in the players' browsers; this server only passes messages along.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
const MAX_PLAYERS = 16;
const MAX_MSG_BYTES = 16 * 1024;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    return res.end(PAGE);
  }
  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG_BYTES });
const rooms = new Map(); // room code -> Set of sockets

function roster(room) {
  const r = {};
  for (const c of room) if (c.label) r[c.label] = c.pres || {};
  return r;
}
function broadcast(room, msg) {
  const text = JSON.stringify(msg);
  for (const c of room) if (c.label && c.readyState === 1) c.send(text);
}

wss.on('connection', (ws, req) => {
  const code = String(new URL(req.url, 'http://x').searchParams.get('room') || '').toLowerCase();
  if (!/^[a-z0-9_-]{1,20}$/.test(code)) return ws.close(1008, 'bad room');
  let room = rooms.get(code);
  if (!room) { room = new Set(); rooms.set(code, room); }
  if (room.size >= MAX_PLAYERS) { ws.send(JSON.stringify({ t: 'full' })); return ws.close(1008, 'full'); }
  room.add(ws);
  ws.alive = true;
  ws.budget = 80; // simple rate limit: about 40 messages a second

  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    ws.alive = true;
    if (ws.budget <= 0) return;
    ws.budget--;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') return ws.send('{"t":"pong"}');
    if (m.t === 'hello' && typeof m.label === 'string' && /^[a-z0-9]{1,20}$/i.test(m.label)) {
      // a reconnecting player keeps the same label; drop any stale socket using it
      for (const c of room) if (c !== ws && c.label === m.label) { room.delete(c); try { c.terminate(); } catch {} }
      ws.label = m.label; ws.pres = (m.pres && typeof m.pres === 'object') ? m.pres : {};
      return broadcast(room, { t: 'roster', roster: roster(room) });
    }
    if (!ws.label) return;
    if (m.t === 'pres') { ws.pres = (m.pres && typeof m.pres === 'object') ? m.pres : {}; return broadcast(room, { t: 'roster', roster: roster(room) }); }
    if (m.t === 'ev' && typeof m.topic === 'string' && /^[a-z]{1,16}$/.test(m.topic)) {
      return broadcast(room, { t: 'ev', from: ws.label, topic: m.topic, data: m.data });
    }
  });
  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(code);
    else broadcast(room, { t: 'roster', roster: roster(room) });
  });
});

setInterval(() => { for (const ws of wss.clients) ws.budget = 80; }, 2000);
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; try { ws.ping(); } catch {}
  }
}, 15000);

server.listen(PORT, () => console.log(`Spin Doodle running on port ${PORT}`));
