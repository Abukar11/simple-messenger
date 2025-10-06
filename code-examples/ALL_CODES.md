# 📱 Полный код мессенджера - Все файлы

*Дата создания: 25 сентября 2025 г.*  
*Автор: Абубакар Мамилов*

---

## 📋 Содержание

1. [🚀 Главное приложение (App.js)](#app-js)
2. [🖥️ Backend сервер (server.js)](#server-js)
3. [🔐 Экран входа (LoginScreen.js)](#loginscreen-js)
4. [💬 Экран чата (ChatScreen.js)](#chatscreen-js)
5. [⚙️ Конфигурационные файлы](#config-files)
6. [🌐 Веб-версии](#web-versions)

---

## 🚀 App.js {#app-js}

**Файл:** `mobile/App.js`  
**Описание:** Главный файл React Native приложения с навигацией

```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ 
            title: 'Простой чат',
            headerShown: true 
          }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={({ route }) => ({ 
            title: `Общий чат - ${route.params?.username || 'Гость'}`,
            headerLeft: null, // Убираем кнопку "Назад"
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Что делает:**
- ✅ Настраивает навигацию между экранами
- ✅ Устанавливает синий дизайн заголовков
- ✅ Передает имя пользователя в экран чата
- ✅ Убирает кнопку "Назад" в чате

---

## 🖥️ server.js {#server-js}

**Файл:** `backend/server.js`  
**Описание:** Node.js сервер с Socket.io для real-time сообщений

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Создаем приложение Express
const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*", // В продакшене укажите конкретный домен
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Хранилище сообщений в памяти (для простоты)
let messages = [];
let activeUsers = [];

// Простой API endpoint для проверки работы сервера
app.get('/', (req, res) => {
  res.json({ 
    message: 'Простой мессенджер - сервер работает!',
    users: activeUsers.length,
    messages: messages.length 
  });
});

// Socket.io обработка подключений
io.on('connection', (socket) => {
  console.log(`👤 Новый пользователь подключился: ${socket.id}`);
  
  // Отправляем историю сообщений новому пользователю
  socket.emit('messageHistory', messages);
  
  // Обработка входа пользователя в чат
  socket.on('userJoin', (username) => {
    socket.username = username;
    activeUsers.push({ id: socket.id, username });
    
    console.log(`✅ ${username} присоединился к чату`);
    
    // Уведомляем всех о новом пользователе
    io.emit('userJoined', { username, userCount: activeUsers.length });
    socket.emit('joinSuccess', { username, userCount: activeUsers.length });
  });
  
  // Обработка отправки сообщения
  socket.on('sendMessage', (data) => {
    const message = {
      id: Date.now(),
      username: data.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    // Сохраняем сообщение
    messages.push(message);
    
    // Ограничиваем историю последними 100 сообщениями
    if (messages.length > 100) {
      messages = messages.slice(-100);
    }
    
    console.log(`💬 ${message.username}: ${message.text}`);
    
    // Отправляем сообщение всем подключенным пользователям
    io.emit('newMessage', message);
  });
  
  // Обработка отключения пользователя
  socket.on('disconnect', () => {
    if (socket.username) {
      // Удаляем пользователя из списка активных
      activeUsers = activeUsers.filter(user => user.id !== socket.id);
      
      console.log(`👋 ${socket.username} покинул чат`);
      
      // Уведомляем всех об уходе пользователя
      io.emit('userLeft', { 
        username: socket.username, 
        userCount: activeUsers.length 
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
```

**Что делает:**
- ✅ Создает Express сервер с Socket.io
- ✅ Обрабатывает подключения пользователей
- ✅ Сохраняет сообщения в памяти
- ✅ Отправляет real-time уведомления
- ✅ Ведет список активных пользователей

---

## 🔐 LoginScreen.js {#loginscreen-js}

**Файл:** `mobile/screens/LoginScreen.js`  
**Описание:** Экран входа с валидацией имени пользователя

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');

  const handleJoinChat = () => {
    if (username.trim().length === 0) {
      Alert.alert('Ошибка', 'Пожалуйста, введите ваше имя');
      return;
    }

    if (username.trim().length < 2) {
      Alert.alert('Ошибка', 'Имя должно содержать минимум 2 символа');
      return;
    }

    // Переходим на экран чата
    navigation.navigate('Chat', { username: username.trim() });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Добро пожаловать!</Text>
        <Text style={styles.subtitle}>Как вас зовут?</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Введите ваше имя..."
          value={username}
          onChangeText={setUsername}
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="join"
          onSubmitEditing={handleJoinChat}
        />
        
        <TouchableOpacity 
          style={[styles.button, username.trim().length < 2 && styles.buttonDisabled]}
          onPress={handleJoinChat}
          disabled={username.trim().length < 2}
        >
          <Text style={styles.buttonText}>Войти в чат</Text>
        </TouchableOpacity>
        
        <Text style={styles.info}>
          Это простой мессенджер для общения{'\n'}
          Все сообщения видны всем участникам
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
```

**Что делает:**
- ✅ Красивый интерфейс с материал дизайном
- ✅ Валидация имени пользователя (мин. 2 символа)
- ✅ Автоматическая капитализация имени
- ✅ Поддержка клавиатуры (Enter = войти)
- ✅ Responsive дизайн для разных устройств

---

## 💬 ChatScreen.js {#chatscreen-js}

**Файл:** `mobile/screens/ChatScreen.js`  
**Описание:** Основной экран чата с real-time сообщениями

```javascript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import io from 'socket.io-client';

// Определяем адрес сервера автоматически
const getServerUrl = () => {
  // Для веб-версии используем localhost или публичный URL
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    } else if (window.location.hostname.includes('serveo.net')) {
      return 'https://8f2b1687d1e0567a6b3ac5ad45ecbc5a.serveo.net';
    }
    return `http://${window.location.hostname}:3000`;
  }
  // Для мобильного приложения используем localhost
  return 'http://localhost:3000';
};

const SERVER_URL = getServerUrl();

export default function ChatScreen({ route }) {
  const { username } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Подключаемся к серверу
    socketRef.current = io(SERVER_URL);
    
    // Обработка подключения
    socketRef.current.on('connect', () => {
      console.log('Подключен к серверу');
      setIsConnected(true);
      
      // Сообщаем серверу о входе пользователя
      socketRef.current.emit('userJoin', username);
    });

    // Обработка отключения
    socketRef.current.on('disconnect', () => {
      console.log('Отключен от сервера');
      setIsConnected(false);
    });

    // Получение истории сообщений
    socketRef.current.on('messageHistory', (history) => {
      setMessages(history);
    });

    // Получение нового сообщения
    socketRef.current.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Уведомления о пользователях
    socketRef.current.on('userJoined', (data) => {
      setUserCount(data.userCount);
    });

    socketRef.current.on('userLeft', (data) => {
      setUserCount(data.userCount);
    });

    socketRef.current.on('joinSuccess', (data) => {
      setUserCount(data.userCount);
    });

    // Обработка ошибок
    socketRef.current.on('error', (error) => {
      console.error('Ошибка Socket.io:', error);
      Alert.alert('Ошибка соединения', 'Не удается подключиться к серверу');
    });

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = () => {
    if (messageText.trim().length === 0) return;
    
    if (!isConnected) {
      Alert.alert('Ошибка', 'Нет соединения с сервером');
      return;
    }

    // Отправляем сообщение на сервер
    socketRef.current.emit('sendMessage', {
      username: username,
      text: messageText.trim(),
    });

    setMessageText('');
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.username === username;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.messageUsername}>{item.username}</Text>
        )}
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Статус подключения */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? `🟢 Онлайн • ${userCount} чел.` : '🔴 Соединение...'}
        </Text>
      </View>

      {/* Список сообщений */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Поле ввода */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Введите сообщение..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, messageText.trim().length === 0 && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={messageText.trim().length === 0}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

**Что делает:**
- ✅ Socket.io подключение к серверу
- ✅ Real-time отправка и получение сообщений
- ✅ История сообщений при входе
- ✅ Счетчик активных пользователей
- ✅ Автоскролл к новым сообщениям
- ✅ Разные стили для своих/чужих сообщений
- ✅ Статус подключения в реальном времени

---

## ⚙️ Конфигурационные файлы {#config-files}

### Backend package.json

**Файл:** `backend/package.json`

```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "socket.io": "^4.8.1"
  }
}
```

### Mobile package.json

**Файл:** `mobile/package.json`

```json
{
  "name": "mobile",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-navigation/native": "^7.1.17",
    "@react-navigation/stack": "^7.4.8",
    "expo": "~54.0.10",
    "expo-status-bar": "~3.0.8",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.4",
    "react-native-safe-area-context": "^5.6.1",
    "react-native-screens": "^4.16.0",
    "react-native-web": "^0.21.0",
    "socket.io-client": "^4.8.1"
  },
  "private": true
}
```

### Mobile app.json (Expo конфигурация)

**Файл:** `mobile/app.json`

```json
{
  "expo": {
    "name": "SimpleMessenger",
    "slug": "simple-messenger",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "platforms": [
      "ios",
      "android",
      "web"
    ]
  }
}
```

---

## 🌐 Веб-версии {#web-versions}

### Простая HTML версия чата

**Файл:** `public-chat.html`  
**Описание:** Минимальная веб-версия чата для быстрого тестирования

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Простой Чат</title>
    <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .chat-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 90%;
            max-width: 400px;
            height: 600px;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #2196F3;
            color: white;
            padding: 20px;
            border-radius: 20px 20px 0 0;
            text-align: center;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        .message {
            margin-bottom: 10px;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 10px;
        }
        .input-area {
            padding: 15px;
            display: flex;
            gap: 10px;
        }
        input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 20px;
            outline: none;
        }
        button {
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <h2>💬 Простой Чат</h2>
            <div id="status">Подключение...</div>
        </div>
        <div id="messages" class="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button onclick="sendMessage()">Отправить</button>
        </div>
    </div>

    <script>
        const socket = io('http://localhost:3000');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const statusDiv = document.getElementById('status');
        
        // Простое имя пользователя
        const username = prompt('Как вас зовут?') || 'Гость';
        
        socket.on('connect', () => {
            statusDiv.textContent = 'Подключен';
            socket.emit('userJoin', username);
        });
        
        socket.on('newMessage', (message) => {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `<strong>${message.username}:</strong> ${message.text}`;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
                socket.emit('sendMessage', { username, text });
                messageInput.value = '';
            }
        }
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
```

---

## 📋 Команды для запуска

### Установка и запуск Backend:

```bash
cd backend
npm install
npm start
```

### Установка и запуск Mobile приложения:

```bash
cd mobile
npm install
npx expo start
```

### Быстрый запуск всего проекта:

```bash
# В одном терминале (backend)
cd backend && npm start

# В другом терминале (mobile)
cd mobile && npx expo start
```

---

## 🎯 Структура файлов проекта

```
simple-messenger/
├── 📱 mobile/                    # React Native приложение
│   ├── App.js                   # Главный файл с навигацией
│   ├── screens/
│   │   ├── LoginScreen.js       # Экран входа
│   │   └── ChatScreen.js        # Экран чата
│   ├── package.json             # Зависимости mobile
│   ├── app.json                 # Конфигурация Expo
│   └── assets/                  # Изображения и иконки
│
├── 🖥️ backend/                   # Node.js сервер
│   ├── server.js                # Основной сервер
│   └── package.json             # Зависимости backend
│
├── 🌐 Веб-версии/                # HTML версии
│   ├── public-chat.html         # Простая веб-версия
│   └── safari-chat.html         # Safari совместимая версия
│
├── 📋 code-examples/             # Документация с кодами
│   └── ALL_CODES.md            # Этот файл!
│
└── 📚 Документация/
    ├── README.md               # Основная документация
    ├── БЫСТРЫЙ_СТАРТ.md       # Инструкции по запуску
    └── project-overview.md     # Обзор проекта
```

---

## 🎉 Готовые ссылки для тестирования

1. **📱 Мобильное приложение:** http://localhost:8081
2. **🖥️ Backend API:** http://localhost:3000  
3. **🌐 Веб-чат:** Откройте `public-chat.html` в браузере
4. **📱 QR код:** В терминале Expo для тестирования на телефоне

---

*Файл создан: 25 сентября 2025 г.*  
*Все коды вашего мессенджера собраны в одном месте! 🚀*