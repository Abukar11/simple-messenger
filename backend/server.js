const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  },
  maxHttpBufferSize: 10e6 // 10MB для голосовых сообщений в base64
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличиваем лимит для аудио
app.use(express.static('public')); // Добавляем обслуживание статических файлов

// Настройка multer для загрузки аудио файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'voice-' + uniqueSuffix + '.webm');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // Лимит 5MB
  },
  fileFilter: function (req, file, cb) {
    // Разрешаем только аудио файлы
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Только аудио файлы разрешены!'));
    }
  }
});

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

  // Если это не голосовое сообщение — проверяем текст сообщения
  if (data.type !== 'voice') {
    if (!data.text || typeof data.text !== 'string') {
      return { valid: false, error: 'Пустое сообщение' };
    }
  } else {
    // Для voice-сообщений допускаем отсутствие текста, но требуем аудиоданные (audioData или audioUrl)
    if (!data.audioData && !data.audioUrl) {
      return { valid: false, error: 'Отсутствуют аудиоданные для голосового сообщения' };
    }
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

// Роут для загрузки голосовых сообщений
app.post('/api/upload-voice', upload.single('voice'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const audioUrl = `/audio/${req.file.filename}`;
    res.json({ 
      success: true, 
      audioUrl: audioUrl,
      filename: req.file.filename 
    });
  } catch (error) {
    console.error('Ошибка загрузки аудио:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
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

      // Логируем входящие данные для голосовых сообщений
      if (data.type === 'voice') {
        console.log('🎤 Получено голосовое сообщение:', {
          username: data.username,
          type: data.type,
          hasAudioData: !!data.audioData,
          audioDataLength: data.audioData?.length,
          hasAudioUrl: !!data.audioUrl,
          duration: data.duration
        });
      }

      // Создаем сообщение с очищенными данными
      const message = {
        id: Date.now(),
        username: sanitizeMessage(data.username.trim()),
        // Для голосовых сообщений текст может быть пустым или служебным
        text: data.type === 'voice' ? sanitizeMessage((data.text && data.text.trim()) || '🎤 Голосовое сообщение') : sanitizeMessage(data.text.trim()),
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: data.type || 'text',
        // Если клиент передал base64 аудио или URL — сохраняем в сообщении для пересылки
        audioData: data.audioData || null,
        audioUrl: data.audioUrl || null,
        duration: data.duration || null
      };

      // Логируем исходящее сообщение для голосовых
      if (message.type === 'voice') {
        console.log('📤 Отправляем голосовое сообщение:', {
          id: message.id,
          type: message.type,
          hasAudioData: !!message.audioData,
          audioDataLength: message.audioData?.length,
          hasAudioUrl: !!message.audioUrl,
          duration: message.duration
        });
      }

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