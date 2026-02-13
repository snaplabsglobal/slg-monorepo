import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'com.ledgersnap.pwa',
    name: 'LedgerSnap',
    short_name: 'LS',
    description: 'LedgerSnap - receipts, GST/PST ready, jobsite-proof offline capture.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#0b1220',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
