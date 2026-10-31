/*
 * Service worker do Entrega Já: mostra as notificações push mesmo com a aba fechada.
 * Se o site estiver aberto e em foco, a central de notificações já mostrou o aviso pelo
 * tempo real; nesse caso o sistema não mostra de novo (sem notificação duplicada).
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let p = {};
      try {
        p = event.data ? event.data.json() : {};
      } catch {
        p = { title: 'Entrega Já', body: event.data ? event.data.text() : '' };
      }
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = windows.some((w) => w.visibilityState === 'visible' && w.focused);
      if (focused && !p.urgent) return;
      await self.registration.showNotification(p.title || 'Entrega Já', {
        body: p.body || '',
        tag: p.tag,
        icon: '/icon-192.png',
        badge: '/badge-96.png',
        requireInteraction: Boolean(p.urgent),
        vibrate: p.urgent ? [300, 100, 300, 100, 300] : [200, 100, 200],
        data: { link: p.link || '/' },
      });
    })(),
  );
});

// Tocar na notificação abre o link (foca uma aba do site se já houver)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.link || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        tab.postMessage({ type: 'navigate', link: event.notification.data?.link || '/' });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// A inscrição foi trocada pelo navegador: a página reenvia ao servidor na próxima abertura
self.addEventListener('pushsubscriptionchange', () => {
  self.clients.matchAll({ type: 'window' }).then((ws) => ws.forEach((w) => w.postMessage({ type: 'resubscribe' })));
});
