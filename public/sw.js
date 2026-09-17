/*
 * Service worker mínimo, de propósito.
 *
 * O Android só oferece "Instalar" para sites que tenham um service worker
 * registrado. É só para isso que ele existe: repassa toda requisição para a
 * rede e NÃO guarda nada em cache.
 *
 * Por que não guardar: o app é republicado a cada mudança, e um cache mal
 * ajustado deixaria as pessoas presas numa versão velha sem entender por quê.
 * Trocar isso por funcionamento offline daria um trabalho que não se paga —
 * o app precisa do banco para qualquer coisa útil de todo jeito.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (evento) => evento.respondWith(fetch(evento.request)))

// notificação de verdade, na barra do celular (Web Push)
self.addEventListener('push', (evento) => {
  const dados = evento.data ? evento.data.json() : {}
  evento.waitUntil(
    self.registration.showNotification(dados.titulo || 'Rifas do acampamento', {
      body: dados.corpo || '',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
    })
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  evento.waitUntil(self.clients.openWindow('/'))
})
