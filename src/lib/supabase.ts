import { createClient } from '@supabase/supabase-js';
import { createMockServiceClient, createMockBrowserClient } from './supabase-mock';

// Detect mock mode: explicit USE_MOCK=true or service key starts with 'mock-'
const isMockMode =
  process.env.USE_MOCK === 'true' ||
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').startsWith('mock-');

// Server-side client (service role - full access)
export function createServiceClient() {
  if (isMockMode) {
    return createMockServiceClient();
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Browser client (anon key - RLS enforced)
export function createBrowserClient() {
  if (isMockMode) {
    return createMockBrowserClient();
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
