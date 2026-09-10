import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-owned Supabase client. The server must not import browser
 * application infrastructure (src/services reads import.meta.env); this
 * module reads process.env only and defers creation to first use, after
 * dotenv.config() has run in server/index.ts.
 */

let _client: SupabaseClient | null = null;

function isPlaceholder(value: string): boolean {
  return value.trim() === '' || value.startsWith('your_') || value.includes('MY_');
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (isPlaceholder(url) || isPlaceholder(key)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.VITE_SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || '';
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase environment variables are missing or invalid');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
  set(_target, prop, value) {
    return Reflect.set(getClient(), prop, value);
  },
});
