const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3333;

// Хранение данных
let users = [];
let messages = [];

// Статические файлы
app.use(express.static(path.join(__dirname, '../')));

// API маршруты
app.get('/', (req, res) => {
    res.json({
        message: "Простой мессенджер - сервер работает!",
        users: users.length,
        messages: messages.length
    });
});

// Главная страница чата
app.get('/chat', (req, res) => {
    const chatHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Простой Чат</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }
        .chat-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
            height: 90vh;
            max-height: 600px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2E7D32, #60AD66);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            position: relative;
        }
        .header::after {
            content: '💬';
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 20px;
        }
        .connection-info {
            background: #f8f9fa;
            padding: 10px 20px;
            font-size: 12px;
            color: #666;
            border-bottom: 1px solid #eee;
        }
        .login-screen {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            flex: 1;
            padding: 40px;
        }
        .welcome-text {
            text-align: center;
            margin-bottom: 30px;
            color: #666;
        }
        .welcome-text h3 {
            color: #333;
            margin-bottom: 10px;
        }
        .login-screen input {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 20px;
            outline: none;
            transition: border-color 0.3s;
        }
        .login-screen input:focus {
            border-color: #2E7D32;
        }
        .login-screen button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #2E7D32, #60AD66);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
        }
        .login-screen button:hover {
            transform: translateY(-2px);
        }
        .login-screen button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .chat-screen {
            display: none;
            flex-direction: column;
            flex: 1;
        }
        .status {
            padding: 15px 20px;
            color: white;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .status.connected {
            background: linear-gradient(135deg, #4CAF50, #45a049);
        }
        .status.connecting {
            background: linear-gradient(135deg, #FF9800, #F57C00);
        }
        .status.error {
            background: linear-gradient(135deg, #F44336, #d32f2f);
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .message {
            margin-bottom: 15px;
            max-width: 85%;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .message.own {
            margin-left: auto;
            background: linear-gradient(135deg, #2E7D32, #60AD66);
            color: white;
            border-radius: 18px 18px 5px 18px;
        }
        .message.other {
            background: white;
            border-radius: 18px 18px 18px 5px;
            border: 1px solid #e1e5e9;
        }
        .message-content {
            padding: 12px 16px;
        }
        .message-header {
            font-size: 11px;
            opacity: 0.8;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .message-text {
            line-height: 1.4;
        }
        .input-area {
            padding: 20px;
            background: white;
            border-top: 1px solid #eee;
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        .input-area input:focus {
            border-color: #2E7D32;
        }
        .send-btn {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #2E7D32, #60AD66);
            color: white;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        .send-btn:hover {
            transform: scale(1.05);
        }
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* Мобильные стили */
        @media (max-width: 480px) {
            .chat-container {
                height: 100vh;
                border-radius: 0;
                max-height: none;
            }
            .header {
                padding: 15px;
                font-size: 16px;
            }
            .login-screen {
                padding: 30px 20px;
            }
            .messages {
                padding: 15px;
            }
            .input-area {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            Простой Чат
        </div>
        <div class="connection-info">
            🔒 Безопасное подключение • Real-time сообщения
        </div>
        
        <div class="login-screen" id="loginScreen">
            <div class="welcome-text">
                <h3>👋 Добро пожаловать!</h3>
                <p>Введите ваше имя для входа в чат</p>
            </div>
            <input type="text" id="usernameInput" placeholder="Ваше имя..." maxlength="20" autocomplete="name">
            <button id="joinBtn" onclick="joinChat()">🚀 Войти в чат</button>
        </div>
        
        <div class="chat-screen" id="chatScreen">
            <div class="status connecting" id="status">🔄 Подключение к серверу...</div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Напишите сообщение..." onkeypress="handleKeyPress(event)" oninput="handleTyping()">
                <button class="send-btn" id="sendBtn" onclick="sendMessage()" disabled>➤</button>
            </div>
        </div>
    </div>

    <script>
        let socket;
        let username;
        let isConnected = false;

        function joinChat() {
            const usernameInput = document.getElementById('usernameInput');
            const joinBtn = document.getElementById('joinBtn');
            
            username = usernameInput.value.trim();
            
            if (!username) {
                usernameInput.focus();
                return;
            }

            if (username.length < 2) {
                alert('Имя должно содержать минимум 2 символа');
                return;
            }

            joinBtn.disabled = true;
            joinBtn.textContent = '⏳ Подключение...';

            // Скрываем экран входа и показываем чат
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatScreen').style.display = 'flex';

            // Подключаемся к серверу (тот же домен)
            connectToServer();
        }

        function connectToServer() {
            console.log('Подключение к серверу...');
            
            updateStatus('🔄 Подключение к серверу...', 'connecting');

            socket = io({
                transports: ['websocket', 'polling'],
                timeout: 10000
            });

            socket.on('connect', () => {
                console.log('✅ Подключен к серверу');
                isConnected = true;
                updateStatus('🟢 Подключен к чату', 'connected');
                socket.emit('userJoin', username);
            });

            socket.on('disconnect', () => {
                console.log('❌ Отключен от сервера');
                isConnected = false;
                updateStatus('🔴 Соединение потеряно', 'error');
            });

            socket.on('connect_error', (error) => {
                console.error('Ошибка подключения:', error);
                updateStatus('❌ Не удалось подключиться', 'error');
            });

            socket.on('messageHistory', (history) => {
                console.log('📚 История сообщений:', history.length);
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                if (history && history.length > 0) {
                    history.forEach(msg => addMessage(msg));
                }
            });

            socket.on('newMessage', (message) => {
                console.log('💬 Новое сообщение:', message);
                addMessage(message);
            });

            socket.on('userJoined', (data) => {
                updateStatus(\`🟢 В чате: \${data.users.length} 👤\`, 'connected');
            });

            socket.on('userLeft', (data) => {
                updateStatus(\`🟢 В чате: \${data.users.length} 👤\`, 'connected');
            });

            socket.on('joinSuccess', (data) => {
                updateStatus(\`🟢 В чате: \${data.users.length} 👤\`, 'connected');
            });
        }

        function updateStatus(text, status) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = text;
            statusEl.className = \`status \${status}\`;
        }

        function addMessage(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.username === username ? 'own' : 'other'}\`;
            
            const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageDiv.innerHTML = \`
                <div class="message-content">
                    <div class="message-header">\${escapeHtml(message.username)} • \${time}</div>
                    <div class="message-text">\${escapeHtml(message.text)}</div>
                </div>
            \`;

            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function sendMessage() {
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            const text = messageInput.value.trim();

            if (!text || !isConnected) return;

            sendBtn.disabled = true;
            
            socket.emit('sendMessage', {
                text: text,
                username: username,
                timestamp: new Date().toISOString()
            });

            messageInput.value = '';
            sendBtn.disabled = false;
            messageInput.focus();
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        function handleTyping() {
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');
            
            sendBtn.disabled = !messageInput.value.trim() || !isConnected;
        }

        // Автофокус и Enter на поле имени
        document.getElementById('usernameInput').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                joinChat();
            }
        });

        // Автофокус на поле ввода имени
        window.addEventListener('load', () => {
            document.getElementById('usernameInput').focus();
        });
    </script>
</body>
</html>
  `;

    res.send(chatHTML);
});

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('👤 Пользователь подключился:', socket.id);

    // Присоединение пользователя
    socket.on('userJoin', (username) => {
        console.log('📝 Пользователь присоединился:', username);

        // Сохраняем информацию о пользователе
        socket.username = username;
        users.push({
            id: socket.id,
            username: username,
            joinedAt: new Date()
        });

        // Отправляем историю сообщений
        socket.emit('messageHistory', messages);

        // Уведомляем всех о новом пользователе
        io.emit('userJoined', {
            username: username,
            users: users
        });

        // Подтверждаем успешное присоединение
        socket.emit('joinSuccess', {
            users: users
        });

        console.log(\`👥 Пользователей онлайн: \${users.length}\`);
  });

  // Получение сообщения
  socket.on('sendMessage', (messageData) => {
    console.log('💬 Новое сообщение от', messageData.username + ':', messageData.text);
    
    const message = {
      id: Date.now(),
      text: messageData.text,
      username: messageData.username,
      timestamp: messageData.timestamp || new Date().toISOString()
    };

    // Сохраняем сообщение
    messages.push(message);
    
    // Ограничиваем количество сообщений в памяти
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    // Отправляем сообщение всем пользователям
    io.emit('newMessage', message);
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    console.log('👋 Пользователь отключился:', socket.id);
    
    if (socket.username) {
      // Удаляем пользователя из списка
      users = users.filter(user => user.id !== socket.id);
      
      // Уведомляем всех об уходе пользователя
      io.emit('userLeft', {
        username: socket.username,
        users: users
      });

      console.log(\`👥 Пользователей онлайн: \${users.length}\`);
    }
  });
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Единый сервер мессенджера запущен на 0.0.0.0: ${ PORT }`);
  console.log(`📡 Локально: http://localhost:${PORT}/chat`);
            console.log(`📱 В сети: http://192.168.0.30:${PORT}/chat`);
    });