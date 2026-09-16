import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

function getEnv(key: string): string | undefined {
  const viteValue = import.meta.env?.[key];
  return (typeof viteValue === 'string' ? viteValue : undefined)
    || (typeof process !== 'undefined' ? process.env?.[key] : undefined);
}

let _client: SupabaseClient<Database> | null = null;

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

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    const url = getEnv('VITE_SUPABASE_URL') || '';
    const key = getEnv('VITE_SUPABASE_ANON_KEY') || '';
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase environment variables are missing or invalid');
    }
    _client = createClient<Database>(url, key);
  }
  return _client;
}

// Proxy-based export: defers actual client creation to first use,
// which is after dotenv.config() has run in server/index.ts or Vite has
// injected env vars in the browser.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
  set(_target, prop, value) {
    return Reflect.set(getClient(), prop, value);
  },
});

export function getSupabase(): SupabaseClient<Database> {
  return getClient();
}
