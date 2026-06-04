// +++ الخدمة الخلفية للتنبيهات الفورية (Service Worker for Push & Alarms & Offline Caching) +++
// تم تصميمها بنبض عالي الكفاءة للعمل بالخلفية وإطلاق تذكيرات الأدوية وشرب المياه ومطابقة شروط متصفحات الموبايل بالكامل (PWA)

const CACHE_NAME = 'healthcompanion-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استقبال البش نوتيفيكيشن الحقيقي أو المحاكي عبر السيرفر
self.addEventListener('push', (event) => {
  let title = 'تنبيه صحي من لايف كومبانيون 🔔';
  let body = 'حان موعد شرب كوب ماء أو جرعة دوائية للحفاظ على سلامتك.';
  let url = '/';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      url = data.url || url;
    } catch (e) {
      if (typeof event.data.text === 'function') {
        body = event.data.text();
      }
    }
  }

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    dir: 'rtl',
    data: { url }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// استقبال الأوامر المباشرة من التطبيق عند تفعيل جدولة أوفلاين في الخلفية
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULED_NOTIFICATION') {
    const { title, body, url } = event.data;
    const options = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [150, 80, 150],
      dir: 'rtl',
      data: { url: url || '/' }
    };
    self.registration.showNotification(title, options);
  }
});

// توجيه المستخدم لصفحة التطبيق عند نقر التنبيه بالخلفية
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كان هناك نافذة مفتوحة بالفعل، وجهها
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // وإلا افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// معالج جلب البيانات (Fetch Handler) - وهو الشرط الأساسي الذي يطلبه متصفح كروم لتثبيت التطبيق على الجوال!
self.addEventListener('fetch', (event) => {
  // عدم كشونة طلبات الـ API أو الطلبات الخارجية غير الآمنة
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // تخزين الاستجابات الصالحة في الخلفية لتسريع الفتح القادم
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.startsWith(self.location.origin) || event.request.url.includes('fonts.googleapis.com'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
