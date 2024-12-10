const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'https://your-app-name.onrender.com' : '*',
    methods: ["GET", "POST"]
  }
});

// Always serve static files in production
app.use(express.static(path.join(__dirname, 'client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const generateUniqueId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `user-${timestamp}-${randomStr}`;
};

io.on('connection', (socket) => {
  const uniqueId = generateUniqueId();
  console.log('User connected with ID:', uniqueId);
  
  socket.emit('user-id', uniqueId);
  
  let currentRoom = null;

  socket.on('join', (room) => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }
    
    socket.join(room);
    currentRoom = room;
    
    socket.to(room).emit('user-joined', { userId: uniqueId });
    
    const clients = io.sockets.adapter.rooms.get(room);
    const numClients = clients ? clients.size : 0;
    
    console.log(`User ${uniqueId} joined room ${room}. Total users: ${numClients}`);
  });

  socket.on('signal', (data) => {
    console.log(`Signal from ${uniqueId} to ${data.to}`);
    io.to(data.to).emit('signal', {
      ...data,
      from: uniqueId
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('user-left', { userId: uniqueId });
    }
    console.log('User disconnected:', uniqueId);
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
