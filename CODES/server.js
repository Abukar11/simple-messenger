// NODE.JS СЕРВЕР С SOCKET.IO
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let messages = [];
let activeUsers = [];

app.get('/', (req, res) => {
  res.json({ 
    message: 'Простой мессенджер - сервер работает!',
    users: activeUsers.length,
    messages: messages.length 
  });
});

io.on('connection', (socket) => {
  console.log(`👤 Новый пользователь подключился: ${socket.id}`);
  
  socket.emit('messageHistory', messages);
  
  socket.on('userJoin', (username) => {
    socket.username = username;
    activeUsers.push({ id: socket.id, username });
    
    console.log(`✅ ${username} присоединился к чату`);
    
    io.emit('userJoined', { username, userCount: activeUsers.length });
    socket.emit('joinSuccess', { username, userCount: activeUsers.length });
  });
  
  socket.on('sendMessage', (data) => {
    const message = {
      id: Date.now(),
      username: data.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    messages.push(message);
    
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
    
    console.log(`💬 ${message.username}: ${message.text}`);
    
    io.emit('newMessage', message);
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers = activeUsers.filter(user => user.id !== socket.id);
      
      console.log(`👋 ${socket.username} покинул чат`);
      
      io.emit('userLeft', { 
        username: socket.username, 
        userCount: activeUsers.length 
      });
    } else {
      console.log(`👤 Пользователь отключился: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер мессенджера запущен на ${HOST}:${PORT}`);
  console.log(`📡 Локально: http://localhost:${PORT}`);
  console.log(`📱 В сети: http://192.168.0.30:${PORT}`);
});