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

const PORT = process.env.PORT || 8082;

// In-memory storage
let messages = [];
let users = new Map(); // socketId -> username
let typingUsers = new Set();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Raven Chat Server',
    online: users.size,
    messages: messages.length,
    timestamp: new Date().toISOString()
  });
});

// Serve main HTML
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🐦‍⬛ Raven Chat</title>
    <style>
        :root {
            --accent-color: #2E7D32;
            --accent-gradient-end: #60AD66;
            --bg-primary: #fafafa;
            --border: #e0e0e0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
            background: var(--bg-primary);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .app-container {
            width: 100%;
            max-width: 800px;
            height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: linear-gradient(135deg, var(--accent-color), var(--accent-gradient-end));
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .status {
            background: #f5f5f5;
            padding: 10px 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
            border-bottom: 1px solid var(--border);
        }
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 70%;
            word-wrap: break-word;
            animation: fadeIn 0.3s;
        }
        .message.my {
            background: var(--accent-color);
            color: white;
            margin-left: auto;
        }
        .message.other {
            background: white;
            border: 1px solid var(--border);
        }
        .message-username {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            opacity: 0.8;
        }
        .message-text { font-size: 16px; line-height: 1.4; }
        .message-time { font-size: 11px; margin-top: 5px; opacity: 0.7; }
        .voice-message {
            background: #e9f3ea;
            border: 1px solid var(--accent-color);
            border-radius: 15px;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 8px;
        }
        .voice-play-btn {
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            font-size: 18px;
        }
        .voice-duration { font-size: 13px; color: #666; }
        .input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .voice-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid var(--border);
            background: white;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .voice-btn:hover { border-color: var(--accent-color); transform: scale(1.05); }
        .voice-btn.recording { background: #f44336; color: white; animation: pulse 1s infinite; }
        .input-field {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid var(--border);
            border-radius: 25px;
            font-size: 16px;
            outline: none;
        }
        .input-field:focus { border-color: var(--accent-color); }
        .send-button {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: var(--accent-color);
            color: white;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .send-button:hover { background: #276129; transform: scale(1.05); }
        .send-button:disabled { background: #ccc; cursor: not-allowed; }
        .login-container {
            max-width: 400px;
            padding: 40px;
            text-align: center;
        }
        .login-container h1 { color: var(--accent-color); font-size: 36px; margin-bottom: 30px; }
        .login-input {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid var(--border);
            border-radius: 25px;
            font-size: 18px;
            margin: 20px 0;
            outline: none;
        }
        .login-input:focus { border-color: var(--accent-color); }
        .login-button {
            width: 100%;
            padding: 15px;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .login-button:hover { background: #276129; }
        .typing-indicator {
            padding: 10px 15px;
            background: rgba(46, 125, 50, 0.1);
            border-radius: 20px;
            margin: 5px 0;
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
        .typing-animation { display: inline-flex; gap: 3px; margin-left: 5px; }
        .typing-animation span {
            width: 6px;
            height: 6px;
            background: var(--accent-color);
            border-radius: 50%;
            animation: typingBounce 1.4s infinite ease-in-out;
        }
        .typing-animation span:nth-child(1) { animation-delay: -0.32s; }
        .typing-animation span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes typingBounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @media (max-width: 768px) {
            .app-container { height: 100vh; border-radius: 0; }
            .message { max-width: 85%; }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="app-container" id="login-screen">
            <div class="login-container">
                <h1>🐦‍⬛ Raven Chat</h1>
                <input type="text" id="username" class="login-input" placeholder="Введите ваше имя" />
                <button class="login-button" onclick="login()">Войти в чат</button>
            </div>
        </div>
        <div class="app-container" id="chat-screen" style="display: none;">
            <div class="header">
                <h1>🐦‍⬛ Raven Chat</h1>
            </div>
            <div class="status" id="status">Подключение...</div>
            <div class="messages-container" id="messages"></div>
            <div id="typing-container"></div>
            <div class="input-container">
                <button class="voice-btn" id="voice-btn" onclick="toggleVoiceRecording()">🎤</button>
                <input type="text" id="message-input" class="input-field" placeholder="Сообщение..." />
                <button class="send-button" id="send-button" onclick="sendMessage()">▶</button>
            </div>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket;
        let currentUser = '';
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let typingTimeout;

        function login() {
            const username = document.getElementById('username').value.trim();
            if (username) {
                currentUser = username;
                socket = io();
                
                socket.on('connect', () => {
                    socket.emit('join', username);
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('chat-screen').style.display = 'flex';
                });

                socket.on('status', (data) => {
                    document.getElementById('status').textContent = 
                        \`👥 Онлайн: \${data.online} | 💬 Сообщений: \${data.messages}\`;
                });

                socket.on('history', (msgs) => {
                    msgs.forEach(msg => displayMessage(msg));
                });

                socket.on('message', (msg) => {
                    displayMessage(msg);
                });

                socket.on('user_typing', (data) => {
                    if (data.username !== currentUser) {
                        showTypingIndicator(data.username);
                    }
                });
            }
        }

        function displayMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const messageEl = document.createElement('div');
            messageEl.className = \`message \${msg.user === currentUser ? 'my' : 'other'}\`;
            
            const time = new Date(msg.timestamp).toLocaleTimeString('ru', {hour: '2-digit', minute: '2-digit'});
            
            let content = \`
                <div class="message-username">\${msg.user}</div>
                <div class="message-text">\${escapeHtml(msg.text || '')}</div>
            \`;

            if (msg.type === 'voice' && msg.audioUrl) {
                content += \`
                    <div class="voice-message">
                        <button class="voice-play-btn" onclick="playVoice('\${msg.audioUrl}')">▶</button>
                        <span class="voice-duration">\${msg.duration || '0:00'}</span>
                    </div>
                \`;
            }

            content += \`<div class="message-time">\${time}</div>\`;
            messageEl.innerHTML = content;
            messagesDiv.appendChild(messageEl);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function sendMessage() {
            const input = document.getElementById('message-input');
            const text = input.value.trim();
            if (text && socket) {
                socket.emit('send', { text, type: 'text' });
                input.value = '';
            }
        }

        async function toggleVoiceRecording() {
            const btn = document.getElementById('voice-btn');
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    
                    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            socket.emit('send', {
                                type: 'voice',
                                audioUrl: reader.result,
                                duration: '0:' + Math.floor(audioChunks.length / 10).toString().padStart(2, '0')
                            });
                        };
                        reader.readAsDataURL(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };
                    
                    mediaRecorder.start();
                    isRecording = true;
                    btn.classList.add('recording');
                    btn.textContent = '⏹️';
                } catch (err) {
                    alert('Ошибка доступа к микрофону: ' + err.message);
                }
            } else {
                mediaRecorder.stop();
                isRecording = false;
                btn.classList.remove('recording');
                btn.textContent = '🎤';
            }
        }

        function playVoice(audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        }

        function showTypingIndicator(username) {
            const container = document.getElementById('typing-container');
            container.innerHTML = \`
                <div class="typing-indicator">
                    \${username} печатает
                    <span class="typing-animation">
                        <span></span><span></span><span></span>
                    </span>
                </div>
            \`;
            setTimeout(() => { container.innerHTML = ''; }, 3000);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
            
            if (socket) {
                socket.emit('typing', currentUser);
            }
        });

        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    </script>
</body>
</html>`);
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('join', (username) => {
    users.set(socket.id, username);
    console.log(\`\${username} joined. Total users: \${users.size}\`);
    
    // Send current status
    io.emit('status', {
      online: users.size,
      messages: messages.length
    });

    // Send message history
    socket.emit('history', messages.slice(-50)); // Last 50 messages
  });

  socket.on('send', (data) => {
    const username = users.get(socket.id) || 'Anonymous';
    const message = {
      user: username,
      text: data.text || '',
      type: data.type || 'text',
      audioUrl: data.audioUrl || null,
      duration: data.duration || null,
      timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    
    // Keep only last 100 messages in memory
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
    
    io.emit('message', message);
    io.emit('status', {
      online: users.size,
      messages: messages.length
    });
  });

  socket.on('typing', (username) => {
    socket.broadcast.emit('user_typing', { username });
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    console.log(\`\${username || 'User'} disconnected. Total users: \${users.size}\`);
    
    io.emit('status', {
      online: users.size,
      messages: messages.length
    });
  });
});

server.listen(PORT, () => {
  console.log(\`🐦‍⬛ Raven Chat server running on port \${PORT}\`);
});
