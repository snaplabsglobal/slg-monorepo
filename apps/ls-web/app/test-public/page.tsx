'use client';

export default function TestPublicPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>✅ Public Test Page</h1>
      <p>If you can see this, the app is working!</p>
      <p>Device: {typeof window !== 'undefined' ? navigator.userAgent : 'Server'}</p>
    </div>
  )
}
