const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Хранилище сообщений в памяти
let messages = [];
let activeUsers = [];

// Middleware для статических файлов
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API для проверки работы сервера
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Мессенджер работает!', 
    users: activeUsers.length,
    messages: messages.length,
    timestamp: new Date().toISOString()
  });
});

// Главная страница - отправляем React приложение
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io обработка подключений
io.on('connection', (socket) => {
  console.log(`👤 Новый пользователь подключился: ${socket.id}`);
  
  // Отправляем историю сообщений новому пользователю
  socket.emit('messageHistory', messages);
  
  // Обработка входа пользователя в чат
  socket.on('userJoin', (username) => {
    socket.username = username;
    activeUsers.push({ id: socket.id, username });
    
    console.log(`✅ ${username} присоединился к чату`);
    
    // Уведомляем всех о новом пользователе
    io.emit('userJoined', { username, userCount: activeUsers.length });
    socket.emit('joinSuccess', { username, userCount: activeUsers.length });
  });
  
  // Обработка отправки сообщения
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
    
    // Сохраняем сообщение
    messages.push(message);
    
    // Ограничиваем историю последними 100 сообщениями
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
    
    console.log(`💬 ${message.username}: ${message.text}`);
    
    // Отправляем сообщение всем подключенным пользователям
    io.emit('newMessage', message);
  });
  
  // Обработка отключения пользователя
  socket.on('disconnect', () => {
    if (socket.username) {
      // Удаляем пользователя из списка активных
      activeUsers = activeUsers.filter(user => user.id !== socket.id);
      
      console.log(`👋 ${socket.username} покинул чат`);
      
      // Уведомляем всех об уходе пользователя
      io.emit('userLeft', { 
        username: socket.username, 
        userCount: activeUsers.length 
      });
    } else {
      console.log(`👤 Пользователь отключился: ${socket.id}`);
    }
  });
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Мессенджер запущен на порту ${PORT}`);
  console.log(`📡 Локально: http://localhost:${PORT}`);
  console.log(`🌍 В продакшене будет доступен по Railway URL`);
});