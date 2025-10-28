const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Создаем приложение Express
const app = express();
const server = http.createServer(app);

// Инициализация базы данных SQLite
const db = new sqlite3.Database(path.join(__dirname, 'messenger.db'), (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('✅ SQLite база данных подключена');
  }
});

// Создаем таблицу пользователей, если не существует
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Создаем таблицу сообщений, если не существует
db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT NOT NULL,
  username TEXT NOT NULL,
  text TEXT,
  type TEXT,
  attachmentUrl TEXT,
  attachmentType TEXT,
  filename TEXT,
  mimetype TEXT,
  audioUrl TEXT,
  duration REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
// API: регистрация пользователя
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
  }
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Имя пользователя должно быть от 3 до 50 символов' });
  }
  if (password.length < 4 || password.length > 100) {
    return res.status(400).json({ error: 'Пароль должен быть от 4 до 100 символов' });
  }
  // Хэшируем пароль
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
      }
      return res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
    // Генерируем JWT
    const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username });
  });
});

// API: вход пользователя
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера при входе' });
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Неверный пароль' });
    // Генерируем JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: user.username });
  });
});

// Middleware для проверки JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Нет токена авторизации' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Неверный формат токена' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный или истёкший токен' });
    req.user = user;
    next();
  });
}

// API: отправка сообщения (POST /api/message)
app.post('/api/message', authMiddleware, (req, res) => {
  const { room, text, type, attachmentUrl, attachmentType, filename, mimetype, audioUrl, duration } = req.body;
  const username = req.user.username;
  if (!room || !username) return res.status(400).json({ error: 'Комната и имя пользователя обязательны' });
  // Сохраняем сообщение в базе
  db.run(`INSERT INTO messages (room, username, text, type, attachmentUrl, attachmentType, filename, mimetype, audioUrl, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [room, username, text || '', type || 'text', attachmentUrl || null, attachmentType || null, filename || null, mimetype || null, audioUrl || null, duration || null],
    function(err) {
      if (err) return res.status(500).json({ error: 'Ошибка сервера при сохранении сообщения' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// API: получение истории сообщений (GET /api/messages?room=roomName)
app.get('/api/messages', authMiddleware, (req, res) => {
  const room = req.query.room;
  if (!room) return res.status(400).json({ error: 'Комната обязательна' });
  db.all('SELECT * FROM messages WHERE room = ? ORDER BY timestamp ASC LIMIT 100', [room], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера при получении сообщений' });
    res.json({ success: true, messages: rows });
  });
});

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

// Отключение кэширования для всех статических файлов
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Используем абсолютный путь к папке public для надёжной отдачи статики
app.use(express.static(path.join(__dirname, 'public'))); // Добавляем обслуживание статических файлов

// Отдельный маршрут для favicon — перенаправляем на существующую иконку в /public/icons
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(__dirname, 'public', 'icons', 'icon-192.svg');
  // Если хотите, можно заменить на .png/.ico файл в папке public
  if (fs.existsSync(icoPath)) {
    return res.sendFile(icoPath);
  }
  // Если файла нет — вернём 204 No Content чтобы убрать клиентский 404
  return res.status(204).end();
});

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

// Настройка multer для общих вложений (изображения, файлы, аудио)
const uploadsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const uploadAll = multer({
  storage: uploadsStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 // по умолчанию 15MB
  }
});

// Хранилище сообщений по комнатам
let roomMessages = {}; // { roomName: [messages] }
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

  // Если это не голосовое сообщение — проверяем текст или наличие вложения
  if (data.type !== 'voice') {
    // Разрешаем сообщение без текста, если есть вложение (attachmentUrl) или аудио URL
    if ((!data.text || typeof data.text !== 'string') && !data.attachmentUrl && !data.audioUrl) {
      return { valid: false, error: 'Пустое сообщение' };
    }
    if (data.text && typeof data.text === 'string') {
      const txt = data.text.trim();
      if (txt.length === 0 && !data.attachmentUrl && !data.audioUrl) {
        return { valid: false, error: 'Пустое сообщение' };
      }
      if (txt.length > 1000) {
        return { valid: false, error: 'Сообщение должно быть от 1 до 1000 символов' };
      }
    }
  } else {
    // Для voice: допускаем отсутствие текста, требуем аудиоданные (audioData или audioUrl)
    if (!data.audioData && !data.audioUrl) {
      return { valid: false, error: 'Отсутствуют аудиоданные для голосового сообщения' };
    }
    // Если текст присутствует — только проверяем максимальную длину
    if (data.text && typeof data.text === 'string') {
      const txt = data.text.trim();
      if (txt.length > 1000) return { valid: false, error: 'Сообщение слишком длинное' };
    }
  }

  // Ограничения на длину username
  if (data.username.trim().length === 0 || data.username.length > 50) {
    return { valid: false, error: 'Имя должно быть от 1 до 50 символов' };
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
  // Подсчитываем общее количество сообщений по всем комнатам
  const totalMessages = Object.values(roomMessages).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  res.json({
    message: 'Простой мессенджер - сервер работает!',
    users: activeUsers.length,
    messages: totalMessages
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

// Общий роут для загрузки файлов/изображений/аудио (dev: локально в public/uploads)
app.post('/api/upload', uploadAll.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.originalname,
      storedFilename: req.file.filename,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
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

  // Пользователь должен выбрать комнату (room)
  socket.on('joinRoom', ({ username, room }) => {
    try {
      if (!username || typeof username !== 'string' || !room || typeof room !== 'string') {
        socket.emit('error', { message: 'Неверные данные для входа в комнату' });
        return;
      }
      const cleanUsername = username.trim();
      const cleanRoom = room.trim();
      if (cleanUsername.length === 0 || cleanUsername.length > 50 || cleanRoom.length === 0 || cleanRoom.length > 100) {
        socket.emit('error', { message: 'Некорректное имя пользователя или комнаты' });
        return;
      }
      // Проверяем, не занято ли имя в этой комнате
      const existingUser = activeUsers.find(user => user.username.toLowerCase() === cleanUsername.toLowerCase() && user.room === cleanRoom);
      if (existingUser) {
        socket.emit('error', { message: 'Это имя уже используется в этой комнате. Выберите другое.' });
        return;
      }
      const sanitizedUsername = sanitizeMessage(cleanUsername);
      socket.username = sanitizedUsername;
      socket.room = cleanRoom;
      activeUsers.push({ id: socket.id, username: sanitizedUsername, room: cleanRoom });
      socket.join(cleanRoom);
      // Отправляем историю сообщений по комнате
      if (!roomMessages[cleanRoom]) roomMessages[cleanRoom] = [];
      socket.emit('messageHistory', roomMessages[cleanRoom]);
      // Уведомляем всех в комнате о новом пользователе
      io.to(cleanRoom).emit('userJoined', { username: sanitizedUsername, userCount: activeUsers.filter(u => u.room === cleanRoom).length, room: cleanRoom });
      socket.emit('joinSuccess', { username: sanitizedUsername, userCount: activeUsers.filter(u => u.room === cleanRoom).length, room: cleanRoom });
      console.log(`✅ ${sanitizedUsername} присоединился к комнате ${cleanRoom}`);
    } catch (error) {
      console.error('Ошибка при входе пользователя в комнату:', error);
      socket.emit('error', { message: 'Ошибка сервера при входе в комнату' });
    }
  });

  // Для обратной совместимости (старый клиент)
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
      // Требуем, чтобы пользователь был зарегистрирован через userJoin
      if (!socket.username) {
        socket.emit('error', { message: 'Неавторизованный пользователь. Сначала выполните вход.' });
        return;
      }


      // Определяем комнату для сообщения
      const usernameToUse = socket.username;
      const roomToUse = socket.room || (data.room && typeof data.room === 'string' ? data.room : 'main');
      data.username = usernameToUse;
      data.room = roomToUse;

      // Валидация данных (теперь username уже установлен)
      const validation = validateMessage(data);
      if (!validation.valid) {
        socket.emit('error', { message: validation.error });
        return;
      }

      // Проверяем rate limiting по имени пользователя
      const rateLimitCheck = checkRateLimit(usernameToUse);
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
        text: data.type === 'voice' ? sanitizeMessage((data.text && data.text.trim()) || '🎤 Голосовое сообщение') : sanitizeMessage((data.text && data.text.trim()) || ''),
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: data.type || 'text',
        // Поддержка вложений: attachmentUrl (images/files), attachmentType, filename, mimetype
        attachmentUrl: data.attachmentUrl || null,
        attachmentType: data.attachmentType || null,
        filename: data.filename || null,
        mimetype: data.mimetype || null,
        // Существующая поддержка аудио
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


      // Сохраняем сообщение в нужной комнате
      if (!roomMessages[roomToUse]) roomMessages[roomToUse] = [];
      roomMessages[roomToUse].push(message);
      // Ограничиваем историю последними 100 сообщениями в комнате
      if (roomMessages[roomToUse].length > 100) {
        roomMessages[roomToUse] = roomMessages[roomToUse].slice(-100);
      }
      console.log(`💬 [${roomToUse}] ${message.username}: ${message.text} (${rateLimitCheck.remaining}/${MESSAGE_LIMIT} оставшихся)`);
      // Отправляем сообщение только в комнату
      io.to(roomToUse).emit('newMessage', message);

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

    if (socket.username && socket.room) {
      // Удаляем пользователя из списка активных
      activeUsers = activeUsers.filter(user => user.id !== socket.id);
      console.log(`👋 ${socket.username} покинул комнату ${socket.room}`);
      // Уведомляем только комнату об уходе пользователя
      io.to(socket.room).emit('userLeft', {
        username: socket.username,
        userCount: activeUsers.filter(u => u.room === socket.room).length,
        room: socket.room
      });
      // Автоматически останавливаем печать при отключении
      socket.to(socket.room).emit('userStoppedTyping', {
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