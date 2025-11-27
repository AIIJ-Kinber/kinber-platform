/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8000',
    NEXT_PUBLIC_SUPABASE_URL: 'https://sujntuhrsbnzkbqmlspt.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_8NfFvVIgKJAeqIsANtD7cw_Y5gitLa4'
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  }
}
export default nextConfig;