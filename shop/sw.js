const CACHE_NAME = 'personal-shop-v2';
const urlsToCache = [
  '/shop.html',
  '/manage.html',
  '/main.css',
  '/manage.css',
  '/main.js',
  '/manage.js',
  '/manifest.json',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500&h=500&fit=crop',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
];

// 安裝 Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果在快取中找到資源，直接返回
        if (response) {
          return response;
        }

        // 否則發送網路請求
        return fetch(event.request).then(function(response) {
          // 檢查是否收到有效回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 複製回應
          var responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(function() {
          // 網路請求失敗時，返回離線頁面
          if (event.request.destination === 'document') {
            return caches.match('/shop.html');
          }
        });
      })
  );
});

// 推送通知
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : '新商品上架通知！',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看商品',
        icon: 'icon-192.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: 'icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('個人商店', options)
  );
});

// 處理通知點擊
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/shop.html')
    );
  }
});

// 背景同步
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  return new Promise(function(resolve, reject) {
    // 在這裡執行背景同步任務
    console.log('執行背景同步');
    resolve();
  });
}
