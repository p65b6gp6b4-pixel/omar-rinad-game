const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Store rooms
const rooms = {};

function broadcast(room, data) {
  if (!rooms[room]) return;
  const msg = JSON.stringify(data);
  rooms[room].forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'join') {
        currentRoom = msg.room;
        if (!rooms[currentRoom]) rooms[currentRoom] = [];
        rooms[currentRoom].push(ws);
        ws.playerNum = rooms[currentRoom].length;
        ws.send(JSON.stringify({ type: 'joined', player: ws.playerNum, count: rooms[currentRoom].length }));
        broadcast(currentRoom, { type: 'playerCount', count: rooms[currentRoom].length });
      }

      if (msg.type === 'gameAction') {
        broadcast(currentRoom, { type: 'gameAction', data: msg.data, from: ws.playerNum });
      }

      if (msg.type === 'chat') {
        broadcast(currentRoom, { type: 'chat', text: msg.text, from: ws.playerNum });
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter(c => c !== ws);
      broadcast(currentRoom, { type: 'playerCount', count: rooms[currentRoom].length });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
