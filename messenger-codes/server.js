const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Создаем приложение Express
const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*", // В продакшене укажите конкретный домен
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Хранилище сообщений в памяти (для простоты)
let messages = [];
let activeUsers = [];

// Простой API endpoint для проверки работы сервера
app.get('/', (req, res) => {
  res.json({ 
    message: 'Простой мессенджер - сервер работает!', 
    users: activeUsers.length,
    messages: messages.length 
  });
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
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Слушаем на всех интерфейсах
server.listen(PORT, HOST, () => {
  console.log(`🚀 Сервер мессенджера запущен на ${HOST}:${PORT}`);
  console.log(`📡 Локально: http://localhost:${PORT}`);
  console.log(`📱 В сети: http://192.168.0.30:${PORT}`);
});