const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8082;

let messages = [];
let users = new Map();

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Server is running',
    users: Array.from(users.values()),
    messages: messages.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raven Chat</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        #app { width: 100%; max-width: 500px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); overflow: hidden; }
        #login-screen { padding: 40px; text-align: center; }
        #login-screen h1 { color: #2E7D32; margin-bottom: 30px; font-size: 32px; }
        #login-screen input { width: 100%; padding: 15px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 16px; margin-bottom: 20px; }
        #login-screen button { width: 100%; padding: 15px; background: #2E7D32; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
        #chat-screen { display: none; height: 600px; flex-direction: column; }
        #chat-header { background: #2E7D32; color: white; padding: 20px; text-align: center; }
        #messages { flex: 1; padding: 20px; overflow-y: auto; background: #F5F5F5; }
        .message { margin-bottom: 15px; padding: 12px 16px; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .message strong { color: #2E7D32; }
        #input-area { display: flex; padding: 20px; background: white; border-top: 1px solid #E0E0E0; }
        #message-input { flex: 1; padding: 12px; border: 2px solid #E0E0E0; border-radius: 8px; font-size: 14px; }
        #send-button { margin-left: 10px; padding: 12px 24px; background: #2E7D32; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>
    <div id="app">
        <div id="login-screen">
            <h1>🐦 Raven Chat</h1>
            <input type="text" id="username" placeholder="Введите ваше имя" />
            <button onclick="login()">Войти</button>
        </div>
        <div id="chat-screen">
            <div id="chat-header"><h2>Raven Chat</h2></div>
            <div id="messages"></div>
            <div id="input-area">
                <input type="text" id="message-input" placeholder="Сообщение..." />
                <button id="send-button" onclick="sendMessage()">Отправить</button>
            </div>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket;
        let currentUser = '';
        function login() {
            const username = document.getElementById('username').value.trim();
            if (username) {
                currentUser = username;
                socket = io();
                socket.emit('join', username);
                socket.on('message', (data) => {
                    const messagesDiv = document.getElementById('messages');
                    const messageEl = document.createElement('div');
                    messageEl.className = 'message';
                    messageEl.innerHTML = '<strong>' + data.user + ':</strong> ' + data.text;
                    messagesDiv.appendChild(messageEl);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                });
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('chat-screen').style.display = 'flex';
            }
        }
        function sendMessage() {
            const input = document.getElementById('message-input');
            const text = input.value.trim();
            if (text && socket) {
                socket.emit('send', text);
                input.value = '';
            }
        }
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>`);
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', (username) => {
    users.set(socket.id, username);
    messages.forEach(msg => socket.emit('message', msg));
  });

  socket.on('send', (text) => {
    const username = users.get(socket.id) || 'Anonymous';
    const message = { user: username, text, timestamp: Date.now() };
    messages.push(message);
    io.emit('message', message);
  });

  socket.on('disconnect', () => {
    users.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
