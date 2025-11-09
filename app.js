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
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Raven</title>
<style>
:root{--accent:#7C3AED;--gradient:#A78BFA;--bg:#0F0F0F;--card:#1A1A1A;--card-light:#252525;--border:#2A2A2A;--text:#E5E5E5;--text-dim:#A0A0A0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:var(--bg);min-height:100vh;display:flex;align-items:center;justify-content:center}
.app{width:100%;max-width:800px;height:90vh;background:var(--card);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--border)}
.header{background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;padding:20px;text-align:center;box-shadow:0 2px 20px rgba(124,58,237,0.3)}
.header h1{font-size:24px}
.status{background:var(--card-light);padding:10px 20px;text-align:center;color:var(--text-dim);font-size:14px;border-bottom:1px solid var(--border)}
.messages{flex:1;padding:20px;overflow-y:auto;background:var(--bg)}
.message{margin-bottom:15px;padding:12px 16px;border-radius:18px;max-width:70%;word-wrap:break-word;animation:fadeIn 0.3s}
.message.my{background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;margin-left:auto;box-shadow:0 4px 12px rgba(124,58,237,0.3)}
.message.other{background:var(--card-light);border:1px solid var(--border);color:var(--text)}
.msg-user{font-size:12px;font-weight:bold;margin-bottom:5px;opacity:0.8}
.msg-text{font-size:16px;line-height:1.4}
.msg-time{font-size:11px;margin-top:5px;opacity:0.7}
.voice-msg{background:rgba(124,58,237,0.15);border:1px solid var(--accent);border-radius:15px;padding:10px;display:flex;align-items:center;gap:10px;margin-top:8px}
.voice-play{background:var(--accent);color:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:18px;transition:all 0.2s}
.voice-play:hover{background:var(--gradient);transform:scale(1.1)}
.voice-duration{font-size:13px;color:var(--text-dim)}
.input-box{padding:20px;background:var(--card);border-top:1px solid var(--border);display:flex;gap:10px;align-items:center}
.voice-btn{width:50px;height:50px;border-radius:50%;border:2px solid var(--border);background:var(--card-light);color:var(--text);font-size:20px;cursor:pointer;transition:all 0.2s}
.voice-btn:hover{border-color:var(--accent);transform:scale(1.05);background:rgba(124,58,237,0.1)}
.voice-btn.recording{background:#DC2626;color:white;animation:pulse 1s infinite;border-color:#DC2626}
.input-field{flex:1;padding:12px 16px;border:2px solid var(--border);border-radius:25px;font-size:16px;outline:none;background:var(--card-light);color:var(--text)}
.input-field:focus{border-color:var(--accent);background:var(--card)}
.input-field::placeholder{color:var(--text-dim)}
.send-btn{width:50px;height:50px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;font-size:20px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 12px rgba(124,58,237,0.3)}
.send-btn:hover{transform:scale(1.05);box-shadow:0 6px 16px rgba(124,58,237,0.4)}
.login{max-width:400px;padding:40px;text-align:center}
.login h1{background:linear-gradient(135deg,var(--accent),var(--gradient));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:36px;margin-bottom:30px}
.login-input{width:100%;padding:15px 20px;border:2px solid var(--border);border-radius:25px;font-size:18px;margin:20px 0;outline:none;background:var(--card-light);color:var(--text)}
.login-input:focus{border-color:var(--accent);background:var(--card)}
.login-input::placeholder{color:var(--text-dim)}
.login-btn{width:100%;padding:15px;background:linear-gradient(135deg,var(--accent),var(--gradient));color:white;border:none;border-radius:25px;font-size:18px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 12px rgba(124,58,237,0.3)}
.login-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(124,58,237,0.4)}
.typing{padding:10px 15px;background:rgba(124,58,237,0.1);border-radius:20px;margin:5px 20px;font-size:14px;color:var(--text-dim);font-style:italic;display:none}
.typing.show{display:block}
.typing-dots{display:inline-flex;gap:3px;margin-left:5px}
.typing-dots span{width:6px;height:6px;background:var(--accent);border-radius:50%;animation:bounce 1.4s infinite ease-in-out}
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
<h1>🐦 Raven</h1>
<input type="text" id="username" class="login-input" placeholder="Введите ваше имя">
<button class="login-btn" onclick="login()">Войти в чат</button>
</div>
</div>
<div class="app" id="chat-screen" style="display:none">
<div class="header"><h1>Raven</h1></div>
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
socket.on('user_typing',d=>{if(d.username!==currentUser)showTyping(d.username)});
}
}
function showMsg(m){
const div=document.getElementById('messages'),el=document.createElement('div');
el.className='message '+(m.user===currentUser?'my':'other');
const t=new Date(m.timestamp).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
let c='<div class="msg-user">'+esc(m.user)+'</div><div class="msg-text">'+esc(m.text||'')+'</div>';
if(m.type==='voice'&&m.audioUrl){
const audioId='audio_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);
c+='<div class="voice-msg"><button class="voice-play" id="'+audioId+'" onclick="playVoice(this,\\''+m.audioUrl+'\\')">▶</button><span class="voice-duration">'+(m.duration||'0:00')+'</span></div>';
}
c+='<div class="msg-time">'+t+'</div>';
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
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
document.getElementById('msg-input').addEventListener('keypress',e=>{
if(e.key==='Enter')sendMsg();
if(socket)socket.emit('typing',currentUser);
});
document.getElementById('username').addEventListener('keypress',e=>{if(e.key==='Enter')login()});
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
