// Конфигурация Firebase Admin SDK для Backend
const admin = require('firebase-admin');
const path = require('path');

let firebaseAdmin = null;

try {
  let serviceAccount;
  
  // В продакшене используем переменную окружения
  if (process.env.FIREBASE_CONFIG) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    console.log('📦 Используется FIREBASE_CONFIG из переменных окружения');
  } else {
    // В разработке используем файл
    const serviceAccountPath = path.join(__dirname, 'firebase-admin-key.json');
    serviceAccount = require(serviceAccountPath);
    console.log('📁 Используется firebase-admin-key.json из файла');
  }
  
  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK инициализирован');
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase Admin:', error.message);
  console.log('⚠️ Локально: создайте firebase-admin-key.json');
  console.log('⚠️ На Render: добавьте FIREBASE_CONFIG в Environment Variables');
}

module.exports = {
  admin,
  firebaseAdmin
};
