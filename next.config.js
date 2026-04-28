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
    //
    // script-src includes 'unsafe-inline' because Next.js's App Router emits
    // inline <script> tags for hydration (the __next_f stream and JSON-LD
    // blocks in layout.tsx). Without it the page never hydrates. The proper
    // fix is per-request nonces injected via middleware — until that ships,
    // the static CSP has to allow inline scripts. cloudflareinsights.com is
    // allowed for the auto-injected analytics beacon.
    //
    // frame-src 'self': allows the sandboxed <iframe srcDoc> on the review page.
    const prod = [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com; frame-src 'self'; frame-ancestors 'none';",
      },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    ];

    return [
      {
        source: '/(.*)',
        headers: isDev ? common : [...common, ...prod],
      },
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/llms:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/agents.md',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/sdk/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
