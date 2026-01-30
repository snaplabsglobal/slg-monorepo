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
    async headers() {
        return [
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
        ]
    },
    // Set output file tracing root to monorepo root for proper dependency resolution
    outputFileTracingRoot: path.join(__dirname, '../..'),
    // Configure images to allow R2 storage domains
    // Note: Next.js remotePatterns supports wildcards, but for R2 we need to match pub-*.r2.dev pattern
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.r2.dev', // Match all subdomains of r2.dev
            },
            // Also allow specific R2 public bucket patterns
            {
                protocol: 'https',
                hostname: 'pub-*.r2.dev',
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
