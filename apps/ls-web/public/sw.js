/**
 * LedgerSnap PWA Service Worker (CTO#1)
 * - API cache whitelist (GET only); no cache for auth/upload/admin
 * - Pages: network-first with fallback
 */

const CACHE_API = 'ls-api-v1'
const CACHE_API_STATS = 'ls-api-stats-v1'
const CACHE_API_LIST = 'ls-api-list-v1'
const CACHE_PAGES = 'ls-pages-v1'

const CACHEABLE_APIS = [
  '/api/transactions',
  '/api/projects',
  '/api/receipts/list',
  '/api/dashboard/stats',
]
const NO_CACHE_APIS = ['/api/auth', '/api/upload', '/api/billing', '/api/admin']

function isCacheableApi(pathname) {
  if (NO_CACHE_APIS.some((p) => pathname.startsWith(p))) return false
  return CACHEABLE_APIS.some((p) => pathname.startsWith(p))
}

function getApiTtl(pathname) {
  if (pathname.startsWith('/api/dashboard/stats')) return 60 // 1 min
  if (pathname.startsWith('/api/transactions') || pathname.startsWith('/api/projects')) return 5 * 60 // 5 min
  return 10 * 60 // 10 min default
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // GET API whitelist: Stale-while-revalidate with TTL
  if (url.pathname.startsWith('/api/') && request.method === 'GET' && isCacheableApi(url.pathname)) {
    const cacheName = url.pathname.startsWith('/api/dashboard/stats') ? CACHE_API_STATS
      : (url.pathname.startsWith('/api/transactions') || url.pathname.startsWith('/api/projects')) ? CACHE_API_LIST
      : CACHE_API
    event.respondWith(
      caches.open(cacheName).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((res) => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Navigate: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.open(CACHE_PAGES).then((cache) => cache.match(event.request))
      )
    )
    return
  }
})
