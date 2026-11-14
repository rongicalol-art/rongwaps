import type { Env } from './env';

/**
 * The server talks to Supabase with the learner's own token over plain HTTP: every call runs as that learner,
 * so row-level security decides what it may do. No service key exists here.
 */
function isPlaceholder(value: string): boolean {
  return value.trim() === '' || value.startsWith('your_') || value.includes('MY_');
}

export function isSupabaseConfigured(env: Env): boolean {
  const url = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';
  if (isPlaceholder(url) || isPlaceholder(key)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function userHeaders(env: Env, token: string): Record<string, string> {
  if (!isSupabaseConfigured(env)) throw new Error('Supabase environment variables are missing or invalid');
  return { apikey: env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
const base = (env: Env) => env.SUPABASE_URL!.replace(/\/+$/, '');

export interface RpcResult<T> { data: T | null; error: { code?: string; message?: string } | null; status: number }

/** Calls a database function as the learner. A database error comes back as `error` with its Postgres code. */
export async function rpc<T>(env: Env, token: string, name: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
  const response = await fetch(`${base(env)}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: userHeaders(env, token), body: JSON.stringify(args), signal: AbortSignal.timeout(10_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) return { data: null, error: (body && typeof body === 'object' ? body : {}) as RpcResult<T>['error'], status: response.status };
  return { data: body as T, error: null, status: response.status };
}

/** The account a token belongs to, as Supabase Auth sees it now; null when the token is not accepted. */
export async function getUser(env: Env, token: string): Promise<{ id: string } | null> {
  const response = await fetch(`${base(env)}/auth/v1/user`, { headers: userHeaders(env, token), signal: AbortSignal.timeout(10_000) });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Supabase Auth answered ${response.status}`);
  const user = await response.json() as { id?: unknown };
  return typeof user.id === 'string' && user.id ? { id: user.id } : null;
}
