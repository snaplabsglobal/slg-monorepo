/**
 * JobSite Snap PWA Service Worker v2
 *
 * CRITICAL FIX: All /api/* requests use NetworkOnly
 * This prevents stale cache causing deleted items to reappear
 *
 * Strategy:
 * - /api/* → NetworkOnly (NEVER cache)
 * - Supabase REST → NetworkOnly (NEVER cache)
 * - Pages → Network-first with offline fallback
 * - Static assets → Cache-first
 */

// Versioned cache names - increment on breaking changes
const CACHE_VERSION = 'v2'
const CACHE_PAGES = `jss-pages-${CACHE_VERSION}`
const CACHE_STATIC = `jss-static-${CACHE_VERSION}`

// All cache names we manage
const MANAGED_CACHES = [CACHE_PAGES, CACHE_STATIC]

// Patterns that must NEVER be cached (NetworkOnly)
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,                    // All API routes
  /^\/auth\//,                   // Auth routes
  /supabase.*\/rest\/v1/,        // Supabase REST API
  /supabase.*\/auth/,            // Supabase Auth
]

function isNetworkOnly(url) {
  const pathname = url.pathname
  const href = url.href

  return NETWORK_ONLY_PATTERNS.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(pathname) || pattern.test(href)
    }
    return pathname.startsWith(pattern)
  })
}

// Install: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2...')
  event.waitUntil(self.skipWaiting())
})

// Activate: Claim clients and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2...')

  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),

      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete any cache that:
              // 1. Starts with 'jss-' but is not in MANAGED_CACHES
              // 2. Is the old API cache (jss-api-v1)
              if (name.startsWith('jss-') && !MANAGED_CACHES.includes(name)) {
                console.log('[SW] Deleting old cache:', name)
                return true
              }
              return false
            })
            .map((name) => caches.delete(name))
        )
      }),
    ])
  )
})

// Fetch: Route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin and Supabase requests
  const isSameOrigin = url.origin === self.location.origin
  const isSupabase = url.hostname.includes('supabase')

  if (!isSameOrigin && !isSupabase) return

  // CRITICAL: NetworkOnly for all API/auth/Supabase requests
  if (isNetworkOnly(url)) {
    // Don't intercept - let browser handle with no caching
    // This is the safest approach for dynamic data
    return
  }

  // Navigation requests: Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_PAGES).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => {
          // Offline: try cache
          return caches.match(request)
        })
    )
    return
  }

  // Static assets (images, fonts, etc): Cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached

        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_STATIC).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
      })
    )
    return
  }
})

// Log when SW is ready
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})

console.log('[SW] Service Worker v2 loaded')
