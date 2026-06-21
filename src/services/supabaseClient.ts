import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string): string | undefined {
  return (import.meta as any).env?.[key] || (typeof process !== 'undefined' ? process.env?.[key] : undefined);
}

let _client: SupabaseClient | null = null;

function isPlaceholder(value: string): boolean {
  return value.trim() === '' || value.startsWith('your_') || value.includes('MY_');
}

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = getEnv('VITE_SUPABASE_URL') || '';
  const key = getEnv('VITE_SUPABASE_ANON_KEY') || '';
  return !isPlaceholder(url) && !isPlaceholder(key) && isValidSupabaseUrl(url);
}

function getClient(): SupabaseClient {
  if (!_client) {
    const url = getEnv('VITE_SUPABASE_URL') || '';
    const key = getEnv('VITE_SUPABASE_ANON_KEY') || '';
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase environment variables are missing or invalid');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Proxy-based export: defers actual client creation to first use,
// which is after dotenv.config() has run in server.ts or Vite has
// injected env vars in the browser.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
  set(_target, prop, value) {
    (getClient() as any)[prop] = value;
    return true;
  },
});

export function getSupabase(): SupabaseClient {
  return getClient();
}
