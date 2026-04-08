/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  experimental: {},
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '0' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    // CSP is skipped in dev — Next.js HMR requires inline scripts and ws:// connections.
    // In production, tighten script-src with a nonce before deploying publicly.
    // frame-src 'self': allows the sandboxed <iframe srcDoc> on the review page.
    const prod = [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self'; frame-ancestors 'none';",
      },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ];

    return [
      {
        source: '/(.*)',
        headers: isDev ? common : [...common, ...prod],
      },
    ];
  },
};

module.exports = nextConfig;
