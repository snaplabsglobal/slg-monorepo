/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {},

    // PR-1: Control Tower Evidence Exposure
    // CORS headers for proof-pack - CEO Control Tower access
    async headers() {
        return [
            {
                source: '/proof-pack/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: 'https://snaplabs.global',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, HEAD, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-store, must-revalidate',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
