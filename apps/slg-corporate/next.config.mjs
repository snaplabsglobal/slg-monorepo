import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Disable Turbopack to avoid "too many open files" error
    // Use webpack with very aggressive watch options
    // Configure path aliases for webpack
    webpack: (config, { isServer, dev }) => {
        // Resolve path aliases
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.resolve(__dirname, 'app'),
        };
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
                    '**/apps/ls-web/**',
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
