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

// só repassa GET (páginas, imagens, scripts). POST/PUT (enviar comprovante,
// registrar venda etc.) o service worker NUNCA intercepta: refazer um fetch
// de uma requisição com corpo binário aqui dentro perde o corpo pelo
// caminho — é o bug que fazia o envio de foto falhar com "No content
// provided". Sem chamar respondWith(), o navegador cuida sozinho, direto.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return
  evento.respondWith(fetch(evento.request))
})

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
