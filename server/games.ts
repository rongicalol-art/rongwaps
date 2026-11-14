import type { Env } from './env';
import { json } from './respond';

/** Public origin of the games Worker (realtime lobby + quiz race rooms), or null when unset. */
export function gameConfiguration(env: Env): Response {
  const development = env.APP_ENV === 'development';
  const value = env.GAMES_SERVER_URL || (development ? 'http://localhost:8787' : undefined);
  let origin: string | null = null;
  try {
    const url = value ? new URL(value) : null;
    if (url?.protocol === 'https:' || (development && url?.protocol === 'http:')) origin = url.origin;
  } catch { /* unset or malformed: no games server */ }
  return json({ url: origin }, 200, { 'Cache-Control': 'no-store' });
}
