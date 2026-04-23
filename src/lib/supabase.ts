import { createClient } from '@supabase/supabase-js';

// Detect mock mode: explicit USE_MOCK=true or service key starts with 'mock-'
const isMockMode =
  process.env.USE_MOCK === 'true' ||
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').startsWith('mock-');

// Lazy-load mock modules so they are never imported in production.
// mock-store.ts calls seed() at module level which uses crypto.randomUUID() —
// Cloudflare Workers disallow crypto during module evaluation.
async function getMockServiceClient() {
  const { createMockServiceClient } = await import('./supabase-mock');
  return createMockServiceClient();
}

async function getMockBrowserClient() {
  const { createMockBrowserClient } = await import('./supabase-mock');
  return createMockBrowserClient();
}

// Server-side client (service role - full access)
export async function createServiceClient() {
  if (isMockMode) {
    return getMockServiceClient();
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Browser client (anon key - RLS enforced)
export async function createBrowserClient() {
  if (isMockMode) {
    return getMockBrowserClient();
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
