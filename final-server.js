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

// Статические файлы
app.use(express.static('.'));

// Главная страница чата
app.get('/chat', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="format-detection" content="telephone=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Простой Чат</title>
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
            height: 600px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 18px;
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
            -webkit-appearance: none;
            -webkit-border-radius: 10px;
        }
        .login-screen input:focus {
            border-color: #2196F3;
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
            background: #4CAF50;
            color: white;
            text-align: center;
            font-size: 14px;
            font-weight: bold;
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
        .input-area {
            padding: 20px;
            background: white;
            border-top: 1px solid #eee;
            display: flex;
            gap: 12px;
            align-items: center;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
        }
        @media (max-width: 768px) {
            .chat-container {
                height: 100vh;
                border-radius: 0;
                max-width: 100%;
            }
            .messages {
                padding-bottom: 100px;
            }
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 20px;
            outline: none;
            font-size: 16px;
            -webkit-appearance: none;
            -webkit-border-radius: 20px;
        }
        .input-area input:focus {
            border-color: #2196F3;
        }
        .send-btn {
            width: 44px;
            height: 44px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 22px;
            cursor: pointer;
            font-size: 18px;
            -webkit-appearance: none;
            touch-action: manipulation;
        }
        
        /* Мобильные стили */
        @media (max-width: 480px) {
            .chat-container {
                height: 100vh;
                border-radius: 0;
                max-width: 100%;
            }
            .input-area {
                padding-bottom: env(safe-area-inset-bottom, 20px);
            }
        }
        
        /* Исправление для iOS Safari */
        input[type="text"] {
            -webkit-appearance: none;
            -webkit-border-radius: 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">Простой Чат</div>
        
        <div class="login-screen" id="loginScreen">
            <h3>Добро пожаловать!</h3>
            <p>Введите ваше имя для входа в чат</p>
            <br>
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
            
            if (!username) {
                alert('Пожалуйста, введите ваше имя');
                return;
            }

            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatScreen').style.display = 'flex';

            connectToServer();
        }

        function connectToServer() {
            socket = io();

            socket.on('connect', () => {
                console.log('Подключен к серверу');
                isConnected = true;
                updateStatus('Подключен к чату');
                socket.emit('userJoin', username);
            });

            socket.on('disconnect', () => {
                console.log('Отключен от сервера');
                isConnected = false;
                updateStatus('Соединение потеряно');
            });

            socket.on('messageHistory', (history) => {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                if (history && history.length > 0) {
                    history.forEach(msg => addMessage(msg));
                }
            });

            socket.on('newMessage', (message) => {
                addMessage(message);
            });

            socket.on('userJoined', (data) => {
                updateStatus('В чате: ' + data.users.length + ' человек');
            });

            socket.on('userLeft', (data) => {
                updateStatus('В чате: ' + data.users.length + ' человек');
            });

            socket.on('joinSuccess', (data) => {
                updateStatus('В чате: ' + data.users.length + ' человек');
            });
        }

        function updateStatus(text) {
            document.getElementById('status').textContent = text;
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
                '<div class="message-content">' +
                    '<div class="message-header">' + message.username + ' • ' + time + '</div>' +
                    '<div>' + message.text + '</div>' +
                '</div>';

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

        document.getElementById('usernameInput').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                joinChat();
            }
        });

        window.addEventListener('load', () => {
            document.getElementById('usernameInput').focus();
        });
    </script>
</body>
</html>
    `);
});

// Socket.IO обработчики
io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);

    socket.on('userJoin', (username) => {
        console.log('Пользователь присоединился:', username);
        
        socket.username = username;
        
        if (!users.find(u => u.id === socket.id)) {
            users.push({
                id: socket.id,
                username: username
            });
        }

        socket.emit('messageHistory', messages);
        socket.emit('joinSuccess', { users: users });
        socket.broadcast.emit('userJoined', { users: users });
    });

    socket.on('sendMessage', (data) => {
        const message = {
            id: Date.now(),
            username: data.username,
            text: data.text,
            timestamp: data.timestamp || new Date().toISOString()
        };

        messages.push(message);
        
        if (messages.length > 100) {
            messages = messages.slice(-50);
        }

        io.emit('newMessage', message);
        console.log('Сообщение от', data.username + ':', data.text);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
        
        users = users.filter(user => user.id !== socket.id);
        socket.broadcast.emit('userLeft', { users: users });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 Сервер мессенджера запущен!');
    console.log('📡 Локально: http://localhost:' + PORT + '/chat');
    console.log('📱 В сети: http://0.0.0.0:' + PORT + '/chat');
    console.log('='.repeat(50));
});