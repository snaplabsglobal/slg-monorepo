/**
 * JobSite Snap PWA Service Worker
 * - API cache whitelist (GET only); NO cache for auth APIs
 * - Pages: network-first with fallback
 * - Critical: Auth API must NEVER be cached
 */

const CACHE_API = 'jss-api-v1'
const CACHE_PAGES = 'jss-pages-v1'

// APIs that can be cached (GET only)
const CACHEABLE_APIS = [
  '/api/jobs',
  '/api/dashboard/stats',
]

// APIs that must NEVER be cached (auth, upload, billing)
const NO_CACHE_APIS = [
  '/api/auth',
  '/api/upload',
  '/api/billing',
  '/api/admin',
  '/auth/',
]

function isCacheableApi(pathname) {
  // First check if it's a no-cache API
  if (NO_CACHE_APIS.some((p) => pathname.startsWith(p))) return false
  // Then check if it's cacheable
  return CACHEABLE_APIS.some((p) => pathname.startsWith(p))
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // CRITICAL: Never cache auth-related requests
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/auth')) {
    return // Let browser handle normally
  }

  // GET API whitelist: Stale-while-revalidate
  if (url.pathname.startsWith('/api/') && request.method === 'GET' && isCacheableApi(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_API).then((cache) =>
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
