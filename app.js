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
let messageIdCounter = 1;

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: https://simple-messenger-7x2u.onrender.com/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://simple-messenger-7x2u.onrender.com</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.get('/yandex_40285b87b9850f1b.html', (req, res) => {
    res.send('<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>Verification: 40285b87b9850f1b</body></html>');
});

app.get('/manifest.json', (req, res) => {
    res.json({
        "name": "Raven Messenger",
        "short_name": "Raven",
        "description": "Современный веб-мессенджер с голосовыми сообщениями",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#000000",
        "theme_color": "#000000",
        "orientation": "portrait",
        "icons": [
            {
                "src": "/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "/icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        "categories": ["social", "communication"],
        "screenshots": []
    });
});

app.get('/sw.js', (req, res) => {
    res.type('application/javascript');
    res.send(`
self.addEventListener('install', (e) => {
    console.log('Service Worker: Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('Service Worker: Activated');
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => {
            return new Response('Offline mode', {
                headers: {'Content-Type': 'text/plain'}
            });
        })
    );
});
`);
});

app.get('/icon-192.png', (req, res) => {
    res.redirect('https://via.placeholder.com/192/000000/FFFFFF/?text=R');
});

app.get('/icon-512.png', (req, res) => {
    res.redirect('https://via.placeholder.com/512/000000/FFFFFF/?text=R');
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
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="yandex-verification" content="40285b87b9850f1b" />
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Raven">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="theme-color" content="#000000">
<title>Raven - Бесплатный онлайн мессенджер</title>
<meta name="description" content="Raven - современный веб-мессенджер с голосовыми сообщениями. Общайтесь онлайн бесплатно, без регистрации. Поддержка темной и светлой темы.">
<meta name="keywords" content="мессенджер, чат, онлайн общение, голосовые сообщения, raven, бесплатный чат, веб-мессенджер">
<meta name="author" content="Raven Chat">
<meta property="og:title" content="Raven - Бесплатный онлайн мессенджер">
<meta property="og:description" content="Современный веб-мессенджер с голосовыми сообщениями. Общайтесь онлайн бесплатно!">
<meta property="og:type" content="website">
<meta property="og:url" content="https://simple-messenger-7x2u.onrender.com">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Raven - Бесплатный онлайн мессенджер">
<meta name="twitter:description" content="Современный веб-мессенджер с голосовыми сообщениями">
<link rel="canonical" href="https://simple-messenger-7x2u.onrender.com">
<style>
:root{--accent:#000000;--gradient:#1A1A1A;--bg:#000000;--card:#0A0A0A;--card-light:#151515;--border:#222222;--text:#FFFFFF;--text-dim:#888888}
body.light-theme{--accent:#7C3AED;--gradient:#A78BFA;--bg:#F5F5F5;--card:#FFFFFF;--card-light:#FAFAFA;--border:#E5E5E5;--text:#1A1A1A;--text-dim:#666666}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:var(--bg);min-height:100vh;display:flex;align-items:center;justify-content:center;transition:background 0.3s}
.app{width:100%;max-width:800px;height:90vh;background:var(--card);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.9);overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border);transition:all 0.3s}
body.light-theme .app{box-shadow:0 20px 40px rgba(0,0,0,0.1)}
.header{background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;padding:20px;text-align:center;box-shadow:0 2px 20px rgba(0,0,0,0.5);position:relative}
body.light-theme .header{box-shadow:0 2px 20px rgba(124,58,237,0.3)}
.header h1{font-size:24px}
.theme-toggle{position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:20px;transition:all 0.2s}
.theme-toggle:hover{background:rgba(255,255,255,0.25);transform:translateY(-50%) scale(1.1)}
.status{background:var(--card-light);padding:10px 20px;text-align:center;color:var(--text-dim);font-size:14px;border-bottom:1px solid var(--border)}
.messages{flex:1;padding:20px;overflow-y:auto;background:var(--bg)}
.message{margin-bottom:15px;padding:12px 16px;border-radius:18px;max-width:70%;word-wrap:break-word;animation:fadeIn 0.3s;position:relative}
.message.my{background:var(--text);color:var(--bg);margin-left:auto;border:1px solid rgba(255,255,255,0.1)}
.delete-btn{position:absolute;top:8px;right:8px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer;opacity:0;transition:all 0.2s;display:flex;align-items:center;justify-content:center}
.message.my:hover .delete-btn{opacity:1}
.delete-btn:hover{background:#DC2626;transform:scale(1.1)}
body.light-theme .message.my{box-shadow:0 4px 12px rgba(124,58,237,0.3)}
.message.other{background:var(--card-light);border:1px solid var(--border);color:var(--text)}
.msg-user{font-size:12px;font-weight:bold;margin-bottom:5px;opacity:0.8}
.msg-text{font-size:16px;line-height:1.4}
.msg-time{font-size:11px;margin-top:5px;opacity:0.7}
.voice-msg{background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:15px;padding:10px;display:flex;align-items:center;gap:10px;margin-top:8px}
body.light-theme .voice-msg{background:rgba(124,58,237,0.15);border-color:var(--accent)}
.voice-play{background:var(--text);color:var(--bg);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:18px;transition:all 0.2s}
.voice-play:hover{background:var(--text-dim);transform:scale(1.1)}
body.light-theme .voice-play{background:var(--accent);color:white}
body.light-theme .voice-play:hover{background:var(--gradient)}
.voice-duration{font-size:13px;color:var(--text-dim)}
.input-box{padding:20px;background:var(--card);border-top:1px solid var(--border);display:flex;gap:10px;align-items:center}
.voice-btn{width:50px;height:50px;border-radius:50%;border:2px solid var(--border);background:var(--card-light);color:var(--text);font-size:20px;cursor:pointer;transition:all 0.2s}
.voice-btn:hover{border-color:var(--text);transform:scale(1.05);background:rgba(255,255,255,0.05)}
body.light-theme .voice-btn:hover{border-color:var(--accent);background:rgba(124,58,237,0.1)}
.voice-btn.recording{background:#DC2626;color:white;animation:pulse 1s infinite;border-color:#DC2626}
.input-field{flex:1;padding:12px 16px;border:2px solid var(--border);border-radius:25px;font-size:16px;outline:none;background:var(--card-light);color:var(--text)}
.input-field:focus{border-color:var(--accent);background:var(--card)}
.input-field::placeholder{color:var(--text-dim)}
.send-btn{width:50px;height:50px;border-radius:50%;border:none;background:var(--text);color:var(--bg);font-size:20px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 12px rgba(255,255,255,0.2)}
.send-btn:hover{transform:scale(1.05);box-shadow:0 6px 16px rgba(255,255,255,0.3)}
body.light-theme .send-btn{background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;box-shadow:0 4px 12px rgba(124,58,237,0.3)}
body.light-theme .send-btn:hover{box-shadow:0 6px 16px rgba(124,58,237,0.4)}
.login{max-width:400px;padding:40px;text-align:center}
.raven-logo{width:80px;height:80px;margin:0 auto 20px;display:block;color:var(--text);filter:drop-shadow(0 4px 12px rgba(255,255,255,0.1))}
body.light-theme .raven-logo{color:var(--accent);filter:drop-shadow(0 4px 12px rgba(124,58,237,0.2))}
.login h1{color:var(--text);font-size:36px;margin-bottom:30px}
body.light-theme .login h1{background:linear-gradient(135deg,var(--accent),var(--gradient));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.raven-icon{width:28px;height:28px;display:inline-block;vertical-align:middle;margin-right:10px}
.login-input{width:100%;padding:15px 20px;border:2px solid var(--border);border-radius:25px;font-size:18px;margin:20px 0;outline:none;background:var(--card-light);color:var(--text)}
.login-input:focus{border-color:var(--accent);background:var(--card)}
.login-input::placeholder{color:var(--text-dim)}
.login-btn{width:100%;padding:15px;background:var(--text);color:var(--bg);border:none;border-radius:25px;font-size:18px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 12px rgba(255,255,255,0.2);font-weight:bold}
.login-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(255,255,255,0.3)}
body.light-theme .login-btn{background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;box-shadow:0 4px 12px rgba(124,58,237,0.3)}
body.light-theme .login-btn:hover{box-shadow:0 6px 20px rgba(124,58,237,0.4)}
.typing{padding:10px 15px;background:rgba(255,255,255,0.05);border-radius:20px;margin:5px 20px;font-size:14px;color:var(--text-dim);font-style:italic;display:none}
body.light-theme .typing{background:rgba(124,58,237,0.1)}
.typing.show{display:block}
.typing-dots{display:inline-flex;gap:3px;margin-left:5px}
.typing-dots span{width:6px;height:6px;background:var(--text);border-radius:50%;animation:bounce 1.4s infinite ease-in-out}
body.light-theme .typing-dots span{background:var(--accent)}
.typing-dots span:nth-child(1){animation-delay:-0.32s}
.typing-dots span:nth-child(2){animation-delay:-0.16s}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes bounce{0%,80%,100%{transform:scale(0.8);opacity:0.5}40%{transform:scale(1);opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
@media (max-width:768px){.app{height:100vh;border-radius:0}.message{max-width:85%}}
</style>
</head>
<body>
<div id="app">
<div class="app" id="login-screen">
<div class="login">
<svg class="raven-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<path d="M50 15 Q45 12 40 15 L35 20 L30 18 L28 22 Q25 25 25 30 L22 35 Q20 40 22 45 L20 50 Q18 55 20 60 L25 70 Q30 75 35 78 L40 82 Q45 85 50 87 Q55 85 60 82 L65 78 Q70 75 75 70 L80 60 Q82 55 80 50 L78 45 Q80 40 78 35 L75 30 Q75 25 72 22 L70 18 L65 20 L60 15 Q55 12 50 15 Z M45 30 Q43 28 45 26 Q47 24 49 26 Q51 28 49 30 Q47 32 45 30 Z" fill="currentColor"/>
<ellipse cx="45" cy="28" rx="2" ry="3" fill="var(--bg)"/>
<path d="M50 35 Q48 37 46 35 L44 38 Q46 42 50 43 Q54 42 56 38 L54 35 Q52 37 50 35 Z" fill="var(--bg)" opacity="0.3"/>
</svg>
<h1>Raven</h1>
<input type="text" id="username" class="login-input" placeholder="Введите ваше имя">
<button class="login-btn" onclick="login()">Войти в чат</button>
</div>
</div>
<div class="app" id="chat-screen" style="display:none">
<div class="header">
<svg class="raven-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<path d="M50 15 Q45 12 40 15 L35 20 L30 18 L28 22 Q25 25 25 30 L22 35 Q20 40 22 45 L20 50 Q18 55 20 60 L25 70 Q30 75 35 78 L40 82 Q45 85 50 87 Q55 85 60 82 L65 78 Q70 75 75 70 L80 60 Q82 55 80 50 L78 45 Q80 40 78 35 L75 30 Q75 25 72 22 L70 18 L65 20 L60 15 Q55 12 50 15 Z M45 30 Q43 28 45 26 Q47 24 49 26 Q51 28 49 30 Q47 32 45 30 Z" fill="white"/>
<ellipse cx="45" cy="28" rx="2" ry="3" fill="rgba(0,0,0,0.3)"/>
</svg>
<h1>Raven</h1>
<button class="theme-toggle" onclick="toggleTheme()" title="Сменить тему">🌓</button>
</div>
<div class="status" id="status">Подключение...</div>
<div class="messages" id="messages"></div>
<div class="typing" id="typing"></div>
<div class="input-box">
<button class="voice-btn" id="voice-btn" onclick="toggleVoice()">🎤</button>
<input type="text" id="msg-input" class="input-field" placeholder="Сообщение...">
<button class="send-btn" onclick="sendMsg()">▶</button>
</div>
</div>
</div>
<script src="/socket.io/socket.io.js"></script>
<script>
if('serviceWorker'in navigator){
navigator.serviceWorker.register('/sw.js').then(()=>console.log('SW registered')).catch(e=>console.log('SW error:',e));
}
let socket,currentUser='',mediaRec,audioChunks=[],isRec=false,recStartTime=0;
function login(){
const u=document.getElementById('username').value.trim();
if(u){
currentUser=u;socket=io();
socket.on('connect',()=>{
socket.emit('join',u);
document.getElementById('login-screen').style.display='none';
document.getElementById('chat-screen').style.display='flex';
});
socket.on('status',d=>document.getElementById('status').textContent='👥 Онлайн: '+d.online+' | 💬 Сообщений: '+d.messages);
socket.on('history',msgs=>msgs.forEach(m=>showMsg(m)));
socket.on('message',m=>showMsg(m));
socket.on('message_deleted',id=>{const el=document.getElementById('msg_'+id);if(el)el.remove()});
socket.on('user_typing',d=>{if(d.username!==currentUser)showTyping(d.username)});
}
}
function showMsg(m){
const div=document.getElementById('messages'),el=document.createElement('div');
el.className='message '+(m.user===currentUser?'my':'other');
el.id='msg_'+m.id;
const t=new Date(m.timestamp).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
let c='<div class="msg-user">'+esc(m.user)+'</div><div class="msg-text">'+esc(m.text||'')+'</div>';
if(m.type==='voice'&&m.audioUrl){
const audioId='audio_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
c+='<div class="voice-msg"><button class="voice-play" id="'+audioId+'" onclick="playVoice(this,\\''+m.audioUrl+'\\')">▶</button><span class="voice-duration">'+(m.duration||'0:00')+'</span></div>';
}
c+='<div class="msg-time">'+t+'</div>';
if(m.user===currentUser){
c+='<button class="delete-btn" onclick="deleteMsg('+m.id+')" title="Удалить">✕</button>';
}
el.innerHTML=c;div.appendChild(el);div.scrollTop=div.scrollHeight;
}
function sendMsg(){
const inp=document.getElementById('msg-input'),txt=inp.value.trim();
if(txt&&socket){socket.emit('send',{text:txt,type:'text'});inp.value='';}
}
async function toggleVoice(){
const btn=document.getElementById('voice-btn');
if(!isRec){
try{
const stream=await navigator.mediaDevices.getUserMedia({audio:true});
mediaRec=new MediaRecorder(stream,{mimeType:'audio/webm'});
audioChunks=[];
recStartTime=Date.now();
mediaRec.ondataavailable=e=>{if(e.data.size>0)audioChunks.push(e.data)};
mediaRec.onstop=()=>{
const duration=Math.floor((Date.now()-recStartTime)/1000);
const durStr=Math.floor(duration/60)+':'+String(duration%60).padStart(2,'0');
const blob=new Blob(audioChunks,{type:'audio/webm'});
const reader=new FileReader();
reader.onloadend=()=>{
socket.emit('send',{type:'voice',audioUrl:reader.result,duration:durStr});
};
reader.readAsDataURL(blob);
stream.getTracks().forEach(t=>t.stop());
};
mediaRec.start();
isRec=true;
btn.classList.add('recording');
btn.textContent='⏹️';
}catch(err){alert('Ошибка микрофона: '+err.message)}
}else{
mediaRec.stop();
isRec=false;
btn.classList.remove('recording');
btn.textContent='🎤';
}
}
function playVoice(btn,url){
const audio=new Audio(url);
btn.textContent='⏸️';
btn.disabled=true;
audio.onended=()=>{btn.textContent='▶';btn.disabled=false};
audio.onerror=()=>{alert('Ошибка воспроизведения');btn.textContent='▶';btn.disabled=false};
audio.play().catch(e=>{alert('Не удалось воспроизвести: '+e.message);btn.textContent='▶';btn.disabled=false});
}
function showTyping(u){
const c=document.getElementById('typing');
c.innerHTML=u+' печатает<span class="typing-dots"><span></span><span></span><span></span></span>';
c.classList.add('show');
setTimeout(()=>c.classList.remove('show'),3000);
}
function deleteMsg(id){
if(confirm('Удалить это сообщение?')){
socket.emit('delete_message',id);
}
}
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
document.getElementById('msg-input').addEventListener('keypress',e=>{
if(e.key==='Enter')sendMsg();
if(socket)socket.emit('typing',currentUser);
});
document.getElementById('username').addEventListener('keypress',e=>{if(e.key==='Enter')login()});
function toggleTheme(){
const body=document.body;
body.classList.toggle('light-theme');
localStorage.setItem('theme',body.classList.contains('light-theme')?'light':'dark');
}
if(localStorage.getItem('theme')==='light'){
document.body.classList.add('light-theme');
}
</script>
</body>
</html>`;
    res.send(html);
});

io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('join', (username) => {
        users.set(socket.id, username);
        console.log(username + ' joined. Total: ' + users.size);

        io.emit('status', {
            online: users.size,
            messages: messages.length
        });

        socket.emit('history', messages.slice(-50));
    });

    socket.on('send', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        const msg = {
            id: messageIdCounter++,
            user: username,
            text: data.text || '',
            type: data.type || 'text',
            audioUrl: data.audioUrl || null,
            duration: data.duration || null,
            timestamp: new Date().toISOString()
        };

        messages.push(msg);
        if (messages.length > 100) {
            messages = messages.slice(-100);
        }

        io.emit('message', msg);
        io.emit('status', {
            online: users.size,
            messages: messages.length
        });
    });

    socket.on('delete_message', (msgId) => {
        const msgIndex = messages.findIndex(m => m.id === msgId);
        if (msgIndex !== -1) {
            const msg = messages[msgIndex];
            const username = users.get(socket.id);
            // Можно удалить только своё сообщение
            if (msg.user === username) {
                messages.splice(msgIndex, 1);
                io.emit('message_deleted', msgId);
                io.emit('status', {
                    online: users.size,
                    messages: messages.length
                });
            }
        }
    });

    socket.on('typing', (username) => {
        socket.broadcast.emit('user_typing', { username: username });
    });

    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        users.delete(socket.id);
        console.log((username || 'User') + ' disconnected. Total: ' + users.size);

        io.emit('status', {
            online: users.size,
            messages: messages.length
        });
    });
});

server.listen(PORT, () => {
    console.log('Raven server running on port ' + PORT);
});
