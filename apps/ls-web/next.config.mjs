import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use webpack instead of Turbopack to avoid "too many open files" error
    // Explicitly disable Turbopack by setting empty config
    turbopack: {},
    // Prevent CDN/browser from caching dynamic pages (dev.ledgersnap.app updates)
    // PWA + CSP (CTO#1): security headers for all routes
    async headers() {
        // Allow same-origin, Supabase, local dev; https: wss: so 30s polling / fetch never blocked by CSP (no TypeError flicker)
        const connectSrc = "'self' https: wss: https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321"
        const securityHeaders = [
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "img-src 'self' data: blob: https:",
                    "font-src 'self' https://fonts.gstatic.com",
                    `connect-src ${connectSrc}`,
                    "frame-ancestors 'none'",
                    "base-uri 'self'",
                    "object-src 'none'",
                ].join('; '),
            },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ]
        return [
            { source: '/(.*)', headers: securityHeaders },
            {
                source: '/dashboard/:path*',
                headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
            },
            {
                source: '/transactions/:path*',
                headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
            },
            {
                source: '/login',
                headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
            },
            {
                source: '/sw.js',
                headers: [
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                ],
            },
        ]
    },
    // Set output file tracing root to monorepo root for proper dependency resolution
    outputFileTracingRoot: path.join(__dirname, '../..'),
    // Configure images to allow R2 and Supabase Storage domains
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.r2.dev',
            },
            {
                protocol: 'https',
                hostname: 'pub-*.r2.dev',
            },
            // Supabase Storage (e.g. receipt-images bucket public URLs)
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
    // Use very aggressive watch options (dev only)
    webpack: (config, { isServer, dev }) => {
        if (dev) {
            // Use polling mode exclusively to avoid inotify limits
            config.watchOptions = {
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/.next/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/coverage/**',
                    '**/.turbo/**',
                    '**/supabase/**',
                    // Ignore other apps in monorepo
                    '**/apps/jss-web/**',
                    '**/apps/slg-corporate/**',
                    '**/packages/**',
                    // Ignore root level files
                    '**/package.json',
                    '**/pnpm-lock.yaml',
                    '**/turbo.json',
                ],
                // Use polling exclusively (no file system events)
                poll: 5000, // Check every 5 seconds
                aggregateTimeout: 2000,
                followSymlinks: false,
            };
        }
        return config;
    },
};

export default nextConfig;
