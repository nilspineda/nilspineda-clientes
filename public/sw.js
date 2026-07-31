import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

const POCKETBASE_URL = self.location.origin.includes('localhost')
  ? 'http://localhost:8090'
  : 'https://pocketbase.nilspineda.com'

registerRoute(
  ({ url }) => url.href.startsWith(`${POCKETBASE_URL}/api/`) && url.method === 'GET',
  new NetworkFirst({
    cacheName: 'pocketbase-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.href.startsWith(`${POCKETBASE_URL}/api/files/`),
  new CacheFirst({
    cacheName: 'pocketbase-files',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.href.startsWith('https://fonts.cdnfonts.com/'),
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
)

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() || 'Nilspineda Clientes' }
  }

  const title = data.title || 'Nilspineda Clientes'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-48.png',
    tag: data.tag || 'default',
    renotify: false,
    data: data.data || { url: data.url || '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/dashboard'
  const url = new URL(urlToOpen, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})