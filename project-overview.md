# 📱 Обзор проекта мессенджера

## 🎯 **Где найти код:**

### Backend (Сервер):
- **Главный файл:** `backend/server.js` - основной сервер с Socket.io
- **Зависимости:** `backend/package.json` 
- **Альтернативы:** `final-server.js`, `simple-server.js`, `unified-server.js`

### Frontend (Мобильное приложение):
- **Главный файл:** `mobile/App.js` - точка входа в приложение
- **Экран входа:** `mobile/screens/LoginScreen.js`
- **Экран чата:** `mobile/screens/ChatScreen.js`
- **Конфигурация:** `mobile/app.json`, `mobile/package.json`

### Веб-версии:
- **Простой чат:** `public-chat.html`
- **Safari версия:** `safari-chat.html`

## 🌐 **Где тестировать:**

1. **Веб-версия мессенджера:** http://localhost:8081
2. **Backend API:** http://localhost:3000
3. **QR код** для мобильного тестирования (в терминале Expo)

## 📁 **Структура проекта:**

```
simple-messenger/
├── backend/
│   ├── server.js          ← Основной сервер
│   └── package.json       
├── mobile/
│   ├── App.js            ← Главное приложение
│   ├── screens/
│   │   ├── LoginScreen.js ← Экран входа
│   │   └── ChatScreen.js  ← Экран чата
│   └── package.json
├── public-chat.html       ← Веб-версия чата
└── README.md             ← Документация
```

## 🚀 **Команды для запуска:**

```bash
# Backend
cd backend && npm start

# Mobile app
cd mobile && npx expo start
```