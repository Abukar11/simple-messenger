const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Создаем приложение Express
const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:3000',
  'http://192.168.0.30:8081',
  'http://127.0.0.1:8081',
  'https://simple-messenger-7x2u.onrender.com',
  'https://8f2b1687d1e0567a6b3ac5ad45ecbc5a.serveo.net'
];

// В продакшене добавьте ваш домен:
// if (process.env.NODE_ENV === 'production') {
//   allowedOrigins.push('https://yourdomain.com');
// }

const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Добавляем обслуживание статических файлов

// Хранилище сообщений в памяти (для простоты)
let messages = [];
let activeUsers = [];
let messageReactions = new Map(); // Храним реакции по ID сообщения

// Rate limiting - ограничение частоты сообщений
const userMessageLimits = new Map();
const MESSAGE_LIMIT = 10; // максимум 10 сообщений
const TIME_WINDOW = 60000; // за 1 минуту

// Функции безопасности
function sanitizeMessage(text) {
  // Удаляем HTML теги для защиты от XSS
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function validateMessage(data) {
  // Проверяем структуру данных
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Неверный формат данных' };
  }

  // Проверяем имя пользователя
  if (!data.username || typeof data.username !== 'string') {
    return { valid: false, error: 'Неверное имя пользователя' };
  }

  // Проверяем текст сообщения
  if (!data.text || typeof data.text !== 'string') {
    return { valid: false, error: 'Пустое сообщение' };
  }

  // Ограничения на длину
  if (data.username.trim().length === 0 || data.username.length > 50) {
    return { valid: false, error: 'Имя должно быть от 1 до 50 символов' };
  }

  if (data.text.trim().length === 0 || data.text.length > 1000) {
    return { valid: false, error: 'Сообщение должно быть от 1 до 1000 символов' };
  }

  return { valid: true };
}

function checkRateLimit(username) {
  const now = Date.now();
  const userLimit = userMessageLimits.get(username) || { count: 0, resetTime: now + TIME_WINDOW };

  if (now > userLimit.resetTime) {
    // Сброс лимита
    userLimit.count = 0;
    userLimit.resetTime = now + TIME_WINDOW;
  }

  if (userLimit.count >= MESSAGE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((userLimit.resetTime - now) / 1000) };
  }

  userLimit.count++;
  userMessageLimits.set(username, userLimit);
  return { allowed: true, remaining: MESSAGE_LIMIT - userLimit.count, resetIn: Math.ceil((userLimit.resetTime - now) / 1000) };
}

// Простой API endpoint для проверки работы сервера
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Простой мессенджер - сервер работает!',
    users: activeUsers.length,
    messages: messages.length
  });
});

// Главная страница - отдаем HTML файл
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.io обработка подключений
io.on('connection', (socket) => {
  console.log(`👤 Новый пользователь подключился: ${socket.id}`);

  // Отправляем историю сообщений новому пользователю
  socket.emit('messageHistory', messages);

  // Обработка входа пользователя в чат
  socket.on('userJoin', (username) => {
    try {
      // Валидация имени пользователя
      if (!username || typeof username !== 'string') {
        socket.emit('error', { message: 'Неверное имя пользователя' });
        return;
      }

      const cleanUsername = username.trim();
      if (cleanUsername.length === 0 || cleanUsername.length > 50) {
        socket.emit('error', { message: 'Имя должно быть от 1 до 50 символов' });
        return;
      }

      // Проверяем, не занято ли имя
      const existingUser = activeUsers.find(user => user.username.toLowerCase() === cleanUsername.toLowerCase());
      if (existingUser) {
        socket.emit('error', { message: 'Это имя уже используется. Выберите другое.' });
        return;
      }

      const sanitizedUsername = sanitizeMessage(cleanUsername);
      socket.username = sanitizedUsername;
      activeUsers.push({ id: socket.id, username: sanitizedUsername });

      console.log(`✅ ${sanitizedUsername} присоединился к чату`);

      // Уведомляем всех о новом пользователе
      io.emit('userJoined', { username: sanitizedUsername, userCount: activeUsers.length });
      socket.emit('joinSuccess', { username: sanitizedUsername, userCount: activeUsers.length });

    } catch (error) {
      console.error('Ошибка при входе пользователя:', error);
      socket.emit('error', { message: 'Ошибка сервера при входе в чат' });
    }
  });

  // Обработка отправки сообщения
  socket.on('sendMessage', (data) => {
    try {
      // Валидация данных
      const validation = validateMessage(data);
      if (!validation.valid) {
        socket.emit('error', { message: validation.error });
        return;
      }

      // Проверяем rate limiting по имени пользователя
      const rateLimitCheck = checkRateLimit(data.username);
      if (!rateLimitCheck.allowed) {
        socket.emit('error', {
          message: `Слишком много сообщений! Попробуйте через ${rateLimitCheck.resetIn} секунд. (${rateLimitCheck.remaining}/${MESSAGE_LIMIT})`,
          type: 'rate_limit',
          resetIn: rateLimitCheck.resetIn
        });
        console.log(`🚫 Rate limit exceeded for ${data.username}: ${MESSAGE_LIMIT} messages per minute`);
        return;
      }

      // Создаем сообщение с очищенными данными
      const message = {
        id: Date.now(),
        username: sanitizeMessage(data.username.trim()),
        text: sanitizeMessage(data.text.trim()),
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

      console.log(`💬 ${message.username}: ${message.text} (${rateLimitCheck.remaining}/${MESSAGE_LIMIT} оставшихся)`);

      // Отправляем сообщение всем подключенным пользователям
      io.emit('newMessage', message);

    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
      socket.emit('error', { message: 'Ошибка сервера при отправке сообщения' });
    }
  });

  // Обработка индикатора печати
  socket.on('typing', (data) => {
    if (data && data.username) {
      socket.broadcast.emit('userTyping', {
        username: data.username
      });
    }
  });

  // Обработка остановки печати
  socket.on('stopTyping', (data) => {
    if (data && data.username) {
      socket.broadcast.emit('userStoppedTyping', {
        username: data.username
      });
    }
  });

  // Обработчик добавления реакции
  socket.on('addReaction', (data) => {
    const { messageId, emoji, username } = data;
    
    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, {});
    }
    
    const reactions = messageReactions.get(messageId);
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    // Удаляем предыдущую реакцию пользователя на это сообщение
    Object.keys(reactions).forEach(reactionEmoji => {
      reactions[reactionEmoji] = reactions[reactionEmoji].filter(user => user !== username);
      if (reactions[reactionEmoji].length === 0) {
        delete reactions[reactionEmoji];
      }
    });
    
    // Добавляем новую реакцию
    reactions[emoji].push(username);
    
    // Отправляем обновления всем клиентам
    io.emit('reactionUpdate', {
      messageId,
      reactions: messageReactions.get(messageId)
    });
  });

  // Обработка отключения пользователя
  socket.on('disconnect', () => {
    // НЕ очищаем rate limiting здесь - пусть работает по времени
    // userMessageLimits остается в памяти и очищается автоматически через TIME_WINDOW

    if (socket.username) {
      // Удаляем пользователя из списка активных
      activeUsers = activeUsers.filter(user => user.id !== socket.id);

      console.log(`👋 ${socket.username} покинул чат`);

      // Уведомляем всех об уходе пользователя
      io.emit('userLeft', {
        username: socket.username,
        userCount: activeUsers.length
      });

      // Автоматически останавливаем печать при отключении
      socket.broadcast.emit('userStoppedTyping', {
        username: socket.username
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