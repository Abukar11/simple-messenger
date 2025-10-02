const CACHE_NAME = 'raven-chat-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Установка Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker: Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Кэширование файлов');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Активация');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Удаление старого кэша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Возвращаем кэшированную версию или загружаем из сети
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push уведомления
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push уведомление получено');
  
  const options = {
    body: event.data ? event.data.text() : 'Новое сообщение в чате!',
    icon: '/manifest.json',
    badge: '/manifest.json',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Открыть чат',
        icon: '/manifest.json'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Raven Chat', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Клик по уведомлению');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});