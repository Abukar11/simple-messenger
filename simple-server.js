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

const PORT = process.env.PORT || 3333;

// Хранение данных
let users = [];
let messages = [];

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
    <title>Простой Чат</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
            width: 100%;
            max-width: 400px;
            height: 90vh;
            max-height: 600px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: #2196F3;
            color: white;
            padding: 20px;
            text-align: center;
            font-weight: bold;
        }
        .login-screen {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            flex: 1;
            padding: 40px;
        }
        .login-screen input {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            font-size: 16px;
            margin-bottom: 20px;
            outline: none;
        }
        .login-screen button {
            width: 100%;
            padding: 15px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
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
            background: #4CAF50;
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
        }
        .message.own {
            margin-left: auto;
            background: #2196F3;
            color: white;
            border-radius: 18px 18px 5px 18px;
            padding: 12px 16px;
        }
        .message.other {
            background: white;
            border-radius: 18px 18px 18px 5px;
            border: 1px solid #ddd;
            padding: 12px 16px;
        }
        .message-header {
            font-size: 11px;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        .input-area {
            padding: 20px;
            background: white;
            display: flex;
            gap: 12px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #ddd;
            border-radius: 20px;
            outline: none;
        }
        .send-btn {
            width: 44px;
            height: 44px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 22px;
            cursor: pointer;
        }
        @media (max-width: 480px) {
            .chat-container {
                height: 100vh;
                border-radius: 0;
                max-height: none;
            }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">Простой Чат</div>
        
        <div class="login-screen" id="loginScreen">
            <h3>Добро пожаловать!</h3>
            <p>Введите ваше имя для входа в чат</p>
            <input type="text" id="usernameInput" placeholder="Ваше имя..." maxlength="20">
            <button onclick="joinChat()">Войти в чат</button>
        </div>
        
        <div class="chat-screen" id="chatScreen">
            <div class="status" id="status">Подключение...</div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Напишите сообщение..." onkeypress="handleKeyPress(event)">
                <button class="send-btn" onclick="sendMessage()">></button>
            </div>
        </div>
    </div>

    <script>
        let socket;
        let username;
        let isConnected = false;

        function joinChat() {
            const usernameInput = document.getElementById('usernameInput');
            username = usernameInput.value.trim();
            
            if (!username) return;

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatScreen').style.display = 'flex';
            connectToServer();
        }

        function connectToServer() {
            socket = io();

            socket.on('connect', () => {
                isConnected = true;
                document.getElementById('status').textContent = 'Подключен к чату';
                socket.emit('userJoin', username);
            });

            socket.on('messageHistory', (history) => {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                if (history) {
                    history.forEach(msg => addMessage(msg));
                }
            });

            socket.on('newMessage', (message) => {
                addMessage(message);
            });

            socket.on('userJoined', (data) => {
                document.getElementById('status').textContent = 'В чате: ' + data.users.length + ' человек';
            });
        }

        function addMessage(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (message.username === username ? 'own' : 'other');
            
            const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageDiv.innerHTML = 
                '<div class="message-header">' + message.username + ' • ' + time + '</div>' +
                '<div>' + message.text + '</div>';

            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function sendMessage() {
            const messageInput = document.getElementById('messageInput');
            const text = messageInput.value.trim();

            if (!text || !isConnected) return;

            socket.emit('sendMessage', {
                text: text,
                username: username,
                timestamp: new Date().toISOString()
            });

            messageInput.value = '';
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

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
  console.log('Пользователь подключился:', socket.id);

  socket.on('userJoin', (username) => {
    socket.username = username;
    users.push({ id: socket.id, username: username });

    socket.emit('messageHistory', messages);
    io.emit('userJoined', { username: username, users: users });
    
    console.log('Пользователей онлайн:', users.length);
  });

  socket.on('sendMessage', (messageData) => {
    const message = {
      text: messageData.text,
      username: messageData.username,
      timestamp: messageData.timestamp || new Date().toISOString()
    };

    messages.push(message);
    
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }

    io.emit('newMessage', message);
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      users = users.filter(user => user.id !== socket.id);
      io.emit('userLeft', { username: socket.username, users: users });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Сервер запущен на порту:', PORT);
  console.log('Локально: http://localhost:' + PORT + '/chat');
});