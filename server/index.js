const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Room registry: Map<roomId, Map<socketId, { userId, displayName }>>
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userId, displayName }) => {
    socket.join(roomId);

    // Add to room registry
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId).set(socket.id, { userId, displayName });

    // Tell the joiner who's already in the room
    const existing = [...rooms.get(roomId).entries()]
      .filter(([id]) => id !== socket.id)
      .map(([id, data]) => ({ socketId: id, ...data }));
    
    socket.emit('room-peers', existing);

    // Tell everyone else a new peer joined
    socket.to(roomId).emit('peer-joined', {
      socketId: socket.id, userId, displayName
    });
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('chat-fallback', ({ to, payload }) => {
    io.to(to).emit('chat-fallback', { from: socket.id, payload });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) rooms.delete(roomId);
        socket.to(roomId).emit('peer-left', { socketId: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Sanctuary Engine online on port ${PORT}`);
});
