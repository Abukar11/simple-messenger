# 🚀 Инструкция по обновлению публичной версии

## Проблема
Публичная ссылка https://simple-messenger-7x2u.onrender.com еще использует старую версию без эмодзи.

## Решение 1: Обновление через Git (рекомендуется)

```bash
# 1. Добавить изменения в Git
git add .
git commit -m "Add emoji panel and typing indicators"
git push origin main

# 2. Render автоматически обновится
```

## Решение 2: Ручное обновление файлов на Render

1. Зайти на https://render.com
2. Найти проект simple-messenger
3. Перейти в Settings → Environment
4. Нажать "Manual Deploy" → "Deploy latest commit"

## Проверка обновления

После деплоя проверить https://simple-messenger-7x2u.onrender.com:
- ✅ Должна появиться кнопка эмодзи 😀
- ✅ Панель с эмодзи при нажатии  
- ✅ Индикатор печати
- ✅ Звуки уведомлений

## Локальные версии (уже работают)

- 🌐 Веб: http://localhost:3000
- 📱 Мобильные: http://localhost:8082
- 🛠️ Backend: http://localhost:3000/api/status

## Файлы обновлены

- ✅ `/deploy/server.js` - с поддержкой typing
- ✅ `/deploy/public/index.html` - с эмодзи панелью
- ✅ `/backend/server.js` - обновлен
- ✅ `/mobile/screens/ChatScreen.js` - с эмодзи