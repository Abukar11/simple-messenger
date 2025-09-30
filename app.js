const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Хранилище в памяти
let messages = [];
let activeUsers = [];

// Middleware
app.use(express.static('public'));
app.use(express.json());

// API
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Мессенджер работает!', 
    users: activeUsers.length,
    messages: messages.length,
    timestamp: new Date().toISOString()
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Простой Мессенджер</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; display: flex; justify-content: center; align-items: center;
        }
        .app { width: 100%; max-width: 800px; height: 90vh; background: white;
               border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
               overflow: hidden; display: flex; flex-direction: column; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .status { background: #f5f5f5; padding: 10px 20px; text-align: center; color: #666; }
        .messages { flex: 1; overflow-y: auto; padding: 20px; background: #fafafa; }
        .message { margin-bottom: 15px; padding: 12px 16px; border-radius: 18px; max-width: 70%; animation: fadeIn 0.3s ease-in; }
        .message.my { background: #2196F3; color: white; margin-left: auto; text-align: right; }
        .message.other { background: white; border: 1px solid #e0e0e0; }
        .username { font-size: 12px; font-weight: bold; margin-bottom: 5px; opacity: 0.7; }
        .text { font-size: 16px; line-height: 1.4; }
        .time { font-size: 11px; margin-top: 5px; opacity: 0.7; }
        .input-area { padding: 20px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; }
        .input { flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 25px; font-size: 16px; outline: none; }
        .input:focus { border-color: #2196F3; }
        .send { width: 50px; height: 50px; border-radius: 50%; border: none; background: #2196F3; color: white; font-size: 20px; cursor: pointer; }
        .send:hover { background: #1976D2; }
        .send:disabled { background: #ccc; cursor: not-allowed; }
        .login { max-width: 400px; padding: 40px; text-align: center; }
        .login input { width: 100%; padding: 15px 20px; border: 2px solid #e0e0e0; border-radius: 25px; font-size: 18px; text-align: center; margin: 20px 0; outline: none; }
        .login button { width: 100%; padding: 15px; background: #2196F3; color: white; border: none; border-radius: 25px; font-size: 18px; cursor: pointer; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) { .app { height: 100vh; border-radius: 0; } .message { max-width: 85%; } }
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
        const socket = io();
        let currentUser = '';
        let isLoggedIn = false;
        let messages = [];
        let userCount = 0;
        let isConnected = false;

        function render() {
            const app = document.getElementById('app');
            
            if (!isLoggedIn) {
                app.innerHTML = \`
                    <div class="app">
                        <div class="login">
                            <h1>🚀 Простой Мессенджер</h1>
                            <p style="color: #666; margin: 20px 0;">Введите ваше имя для входа в чат</p>
                            <input type="text" placeholder="Ваше имя..." maxlength="20" onkeypress="handleLogin(event)">
                            <div style="font-size: 14px; color: #999;">
                                \${isConnected ? '🟢 Подключено к серверу' : '🔴 Подключение...'}
                            </div>
                        </div>
                    </div>
                \`;
            } else {
                app.innerHTML = \`
                    <div class="app">
                        <div class="header">
                            <h1>🚀 Простой Мессенджер</h1>
                            <div>Добро пожаловать, \${currentUser}!</div>
                        </div>
                        <div class="status">
                            \${isConnected ? \`🟢 Онлайн • \${userCount} человек\` : '🔴 Соединение...'}
                        </div>
                        <div class="messages" id="messages">
                            \${messages.map(msg => \`
                                <div class="message \${msg.username === currentUser ? 'my' : 'other'}">
                                    \${msg.username !== currentUser ? \`<div class="username">\${msg.username}</div>\` : ''}
                                    <div class="text">\${msg.text}</div>
                                    <div class="time">\${msg.time}</div>
                                </div>
                            \`).join('')}
                        </div>
                        <div class="input-area">
                            <input type="text" placeholder="Введите сообщение..." maxlength="500" 
                                   class="input" id="messageInput" onkeypress="handleSend(event)">
                            <button class="send" onclick="sendMessage()">➤</button>
                        </div>
                    </div>
                \`;
                scrollToBottom();
            }
        }

        function handleLogin(event) {
            if (event.key === 'Enter') {
                const username = event.target.value.trim();
                if (username) {
                    currentUser = username;
                    isLoggedIn = true;
                    socket.emit('userJoin', username);
                    render();
                }
            }
        }

        function handleSend(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (text && isConnected) {
                socket.emit('sendMessage', { username: currentUser, text });
                input.value = '';
            }
        }

        function scrollToBottom() {
            const messagesDiv = document.getElementById('messages');
            if (messagesDiv) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }

        // Socket events
        socket.on('connect', () => {
            isConnected = true;
            render();
        });

        socket.on('disconnect', () => {
            isConnected = false;
            render();
        });

        socket.on('messageHistory', (history) => {
            messages = history;
            render();
        });

        socket.on('newMessage', (message) => {
            messages.push(message);
            render();
        });

        socket.on('userJoined', (data) => {
            userCount = data.userCount;
            render();
        });

        socket.on('userLeft', (data) => {
            userCount = data.userCount;
            render();
        });

        socket.on('joinSuccess', (data) => {
            userCount = data.userCount;
            render();
        });

        render();
    </script>
</body>
</html>`);
});

// Socket.io обработка
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
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    
    messages.push(message);
    if (messages.length > 100) messages = messages.slice(-100);
    
    console.log(`💬 ${message.username}: ${message.text}`);
    io.emit('newMessage', message);
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers = activeUsers.filter(user => user.id !== socket.id);
      console.log(`👋 ${socket.username} покинул чат`);
      io.emit('userLeft', { username: socket.username, userCount: activeUsers.length });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Мессенджер запущен на порту ${PORT}`);
  console.log(`📡 Локально: http://localhost:${PORT}`);
  console.log(`🌍 В продакшене будет доступен по Railway URL`);
});