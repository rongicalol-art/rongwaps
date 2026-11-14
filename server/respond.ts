import type { Env } from './env';

/** Sent on every response. Files Cloudflare serves without running the server get the same list from dist/_headers. */
export function securityHeaders(env: Pick<Env, 'APP_ENV'>): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    ...(env.APP_ENV === 'staging' ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } : {}),
    ...(env.APP_ENV === 'production' || env.APP_ENV === 'staging' ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

/** Answers that depend on who asks are never stored, by the browser or anything in between. */
export const PRIVATE = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };

export const tooManyRequests = (headers: Record<string, string> = {}) =>
  json({ error: 'Too many requests. Try again later.' }, 429, { 'Retry-After': '5', ...headers });

/** A JSON body up to `maxBytes`; null when it is missing, too large or not JSON. */
export async function readJson(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return null;
  try {
    const text = await request.text();
    return text.length > maxBytes ? null : JSON.parse(text) as unknown;
  } catch { return null; }
}
