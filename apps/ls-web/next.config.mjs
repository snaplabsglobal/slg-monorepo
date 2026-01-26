/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use webpack instead of Turbopack to avoid "too many open files" error
    // Explicitly disable Turbopack by setting empty config
    turbopack: {},
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
