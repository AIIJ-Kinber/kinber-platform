/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ IMPORTANT: Explicitly enable App Router in /src/app
  experimental: {
    appDir: true,
  },

  images: {
    domains: ['lh3.googleusercontent.com'],
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
