const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, '../client/build')));

// Socket.io connection
io.on('connection', (socket) => {
  const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `user-${timestamp}-${randomStr}`;
  };

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

// Serve React app's index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// Set up the server to listen on a dynamic port
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
