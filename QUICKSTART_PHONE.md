# 🚀 Быстрый запуск Phone Auth

## 📱 Запустить и протестировать СЕЙЧАС:

### Terminal 1 - Backend:
```bash
cd /Users/abubakarmamilov/Desktop/simple-messenger/backend
npm start
```

### Terminal 2 - Mobile:
```bash
cd /Users/abubakarmamilov/Desktop/simple-messenger/mobile
npx expo start
```

### Тест в приложении:
1. Нажмите **"📱 Войти по телефону"**
2. Введите: `+79991234567`
3. В алерте увидите код (например: `123456`)
4. Введите код → Готово! ✅

---

## 📖 Полная документация:
- `PHONE_AUTH_COMPLETE.md` - что сделано + как тестировать
- `FIREBASE_SETUP.md` - настройка Firebase для реальных SMS

---

## ⚡ Работает БЕЗ Firebase (эмуляция):
- Backend генерирует случайные 6-значные коды
- Коды показываются в Alert (для разработки)
- Для продакшена следуйте `FIREBASE_SETUP.md` (5 минут)

---

## 💡 Что нового:
✅ Вход по номеру телефона  
✅ SMS коды (эмуляция + Firebase)  
✅ 10,000 бесплатных SMS/месяц  
✅ Готово к использованию!
