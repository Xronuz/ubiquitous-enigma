const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/health',
          destination: 'http://localhost:3001/api/health',
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/:path*`,
        },
      ],
    };
  },
};

module.exports = withNextIntl(nextConfig);
