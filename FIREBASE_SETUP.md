# 🔥 Firebase Phone Authentication - Инструкция по настройке

## 📋 Шаг 1: Создание Firebase проекта

1. **Перейдите на:** https://console.firebase.google.com/
2. **Нажмите:** "Add project" (Добавить проект)
3. **Введите название:** "SimpleMessenger" (или любое другое)
4. **Google Analytics:** Можно отключить (не обязательно)
5. **Нажмите:** "Create project"

---

## 📱 Шаг 2: Настройка для Android/iOS

### **Для Android:**
1. В Firebase Console → "Project Overview" → "Add app" → Android иконка
2. **Android package name:** `com.simplemessenger.app` (или ваше)
3. **Скачайте:** `google-services.json`
4. **Положите файл:** `/mobile/google-services.json`

### **Для iOS:**
1. В Firebase Console → "Add app" → iOS иконка
2. **iOS bundle ID:** `com.simplemessenger.app`
3. **Скачайте:** `GoogleService-Info.plist`
4. **Положите файл:** `/mobile/GoogleService-Info.plist`

### **Для Web:**
1. В Firebase Console → "Add app" → Web иконка
2. **Скопируйте конфигурацию** (firebaseConfig)
3. **Создайте файл:** `/mobile/firebase-config.js` с этими данными

---

## 🔐 Шаг 3: Включение Phone Authentication

1. **В Firebase Console:** Authentication → Sign-in method
2. **Включите:** "Phone" (Phone authentication)
3. **Сохраните**

---

## 🎁 Бесплатный лимит

✅ **10,000 SMS в месяц** - бесплатно
✅ Обновляется каждый месяц автоматически

---

## 🔑 Шаг 4: Получение Service Account ключа (для Backend)

1. **В Firebase Console:** Project Settings (⚙️) → Service accounts
2. **Нажмите:** "Generate new private key"
3. **Скачайте файл:** `serviceAccountKey.json`
4. **Переместите:** `/backend/firebase-admin-key.json`
5. **⚠️ ВАЖНО:** Добавьте в `.gitignore`:
   ```
   firebase-admin-key.json
   ```

---

## 📦 Шаг 5: Установка зависимостей

### Backend:
```bash
cd backend
npm install firebase-admin
```

### Mobile:
```bash
cd mobile
npx expo install firebase
npm install @react-native-firebase/app @react-native-firebase/auth
```

---

## ✅ Готово!

После выполнения всех шагов:
- Создайте файлы конфигурации (см. примеры ниже)
- Перезапустите backend и mobile
- Протестируйте регистрацию через телефон

---

## 📝 Примеры конфигураций

### `/mobile/firebase-config.js`:
```javascript
export const firebaseConfig = {
  apiKey: "ВАШ_API_KEY",
  authDomain: "ВАШ_PROJECT_ID.firebaseapp.com",
  projectId: "ВАШ_PROJECT_ID",
  storageBucket: "ВАШ_PROJECT_ID.appspot.com",
  messagingSenderId: "ВАШ_SENDER_ID",
  appId: "ВАШ_APP_ID"
};
```

### `/backend/.env`:
```env
FIREBASE_ADMIN_KEY_PATH=./firebase-admin-key.json
```

---

## 🐛 Troubleshooting

**Проблема:** "Auth/invalid-phone-number"
**Решение:** Убедитесь что номер в формате: +7XXXXXXXXXX

**Проблема:** "Quota exceeded"
**Решение:** Превышен лимит 10,000 SMS/месяц

**Проблема:** "Auth/internal-error"
**Решение:** Проверьте что Phone Auth включен в консоли

---

## 💰 Стоимость

| Месячный объем | Стоимость |
|---------------|-----------|
| 0 - 10,000 SMS | **$0** (Бесплатно) |
| 10,001+ SMS | ~$0.01 за SMS |

**Итого:** Для малых и средних приложений - полностью бесплатно! 🎉
