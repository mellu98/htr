/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Explicit webpack alias for `@/*` -> `./*` (mirrors tsconfig paths).
  // Render's build environment was failing to resolve `@/...` imports via
  // tsconfig paths alone. Belt-and-suspenders fix.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    };
    return config;
  },
  // Allow large video files to be served efficiently.
  async headers() {
    return [
      {
        source: '/videos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Accept-Ranges', value: 'bytes' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
