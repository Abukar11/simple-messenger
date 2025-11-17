// Конфигурация Firebase Admin SDK для Backend
const admin = require('firebase-admin');
const path = require('path');

// Проверка наличия файла ключа
const serviceAccountPath = path.join(__dirname, 'firebase-admin-key.json');

let firebaseAdmin = null;

try {
  const serviceAccount = require(serviceAccountPath);
  
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK инициализирован');
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase Admin:', error.message);
  console.log('⚠️ Создайте файл firebase-admin-key.json согласно FIREBASE_SETUP.md');
}

module.exports = {
  admin,
  firebaseAdmin
};
