// Importar Firebase SDK para Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con la configuración del cliente)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "sodasist-xxxxx.firebaseapp.com",
  projectId: "sodasist-xxxxx",
  storageBucket: "sodasist-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Inicializar Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'sodasist-v2';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/Logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalación completada');
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activación completada');
      return self.clients.claim();
    })
  );
});

// Interceptar requests para cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar versión en cache o fetch desde la red
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Background sync para acciones offline
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync activado:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Manejar notificaciones push en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Service Worker: Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'SodAsist';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva notificación',
    icon: payload.notification?.icon || '/Logo.png',
    badge: payload.notification?.badge || '/Logo.png',
    tag: payload.data?.tag || 'sodasist-notification',
    data: payload.data,
    requireInteraction: payload.data?.priority === 'high',
    actions: payload.data?.actionUrl ? [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/Logo.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ] : undefined
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Click en notificación:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Si hay una URL de acción, navegar a ella
  if (event.notification.data?.actionUrl) {
    event.waitUntil(
      clients.openWindow(event.notification.data.actionUrl)
    );
  } else {
    // Abrir la aplicación principal
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', event => {
  console.log('Service Worker: Notificación cerrada:', event);
  
  // Aquí podrías enviar analytics o actualizar el estado
  if (event.notification.data?.trackClose) {
    // Enviar evento de cierre al servidor
    fetch('/api/notification-closed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: event.notification.data.id,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Error enviando evento de cierre:', error);
    });
  }
});

// Función de background sync
function doBackgroundSync() {
  console.log('Service Worker: Ejecutando background sync...');
  
  // Sincronizar datos offline
  return Promise.all([
    syncOfflineData(),
    syncNotifications()
  ]);
}

// Sincronizar datos offline
function syncOfflineData() {
  return new Promise((resolve) => {
    // Aquí implementarías la lógica para sincronizar datos offline
    console.log('Service Worker: Sincronizando datos offline...');
    resolve();
  });
}

// Sincronizar notificaciones
function syncNotifications() {
  return new Promise((resolve) => {
    console.log('Service Worker: Sincronizando notificaciones...');
    
    // Verificar si hay notificaciones pendientes
    // y sincronizarlas con el servidor
    resolve();
  });
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  console.log('Service Worker: Mensaje recibido del cliente:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Cargado correctamente');