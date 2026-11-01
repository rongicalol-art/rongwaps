/**
 * Supabase access tokens: signature checks against the project's JWKS (games Worker and Express) and the
 * school-access claims the sign-in token hook stamps into every token it issues
 * (`private.school_beta_access_token_hook`, migration 20261101120000). One owner for both.
 */
type Jwk = JsonWebKey & { kid?: string; alg?: string; imported?: CryptoKey };
let cache: { url: string; keys: Jwk[]; until: number; fetchedAt: number } | null = null;
let pending: { url: string; promise: Promise<Jwk[]> } | null = null;
const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const json = (part: string) => JSON.parse(new TextDecoder().decode(decode(part))) as Record<string, unknown>;

async function keys(url: string, refresh = false): Promise<Jwk[]> {
  if (cache?.url === url && ((!refresh && cache.until > Date.now()) || (refresh && Date.now() - cache.fetchedAt < 60_000))) return cache.keys;
  if (pending?.url === url) return pending.promise;
  const promise = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Signing keys unavailable.');
    const body = await response.json() as { keys?: Jwk[] };
    if (!Array.isArray(body.keys)) throw new Error('Invalid signing keys.');
    cache = { url, keys: body.keys, until: Date.now() + 10 * 60_000, fetchedAt: Date.now() };
    return cache.keys;
  })();
  pending = { url, promise };
  try { return await promise; } finally { if (pending?.promise === promise) pending = null; }
}

export interface VerifiedAccessToken { userId: string; expiresAt: number; claims: Record<string, unknown> }

/** True for tokens this module can check locally (asymmetric project signing keys); legacy shared-secret tokens are not. */
export function isLocallyVerifiable(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = json(parts[0]);
    return typeof header.kid === 'string' && ['ES256', 'RS256'].includes(String(header.alg));
  } catch { return false; }
}

/** Null means invalid credentials; key-service outages throw so the caller can retry or fall back. */
export async function verifyAccessToken(authorization: string | null, supabaseUrl: string): Promise<VerifiedAccessToken | null> {
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) return null;
  const parts = authorization.slice(7).split('.');
  if (parts.length !== 3) return null;
  const issuer = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
  let header: Record<string, unknown>;
  let claims: Record<string, unknown>;
  try {
    header = json(parts[0]); claims = json(parts[1]);
    const now = Date.now() / 1000;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (typeof header.kid !== 'string' || !header.kid || !['ES256', 'RS256'].includes(String(header.alg))
      || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 64
      || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now
      || (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now))
      || (claims.iat !== undefined && (typeof claims.iat !== 'number' || claims.iat > now + 30))
      || claims.role !== 'authenticated' || claims.is_anonymous === true
      || claims.iss !== issuer || !aud.includes('authenticated')) return null;
  } catch { return null; }
  const url = `${issuer}/.well-known/jwks.json`;
  let jwk = (await keys(url)).find(key => key.kid === header.kid);
  jwk ??= (await keys(url, true)).find(key => key.kid === header.kid);
  if (!jwk || (jwk.alg && jwk.alg !== header.alg)) return null;
  try {
    const ec = header.alg === 'ES256';
    if (ec ? jwk.kty !== 'EC' || jwk.crv !== 'P-256' : jwk.kty !== 'RSA') return null;
    const algorithm = ec ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    jwk.imported ??= await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, n: jwk.n, e: jwk.e }, algorithm, false, ['verify']);
    const valid = await crypto.subtle.verify(ec ? { name: 'ECDSA', hash: 'SHA-256' } : algorithm, jwk.imported, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return valid ? { userId: claims.sub as string, expiresAt: Number(claims.exp) * 1000, claims } : null;
  } catch { return null; }
}

export interface SchoolAccess { school: boolean; fullCourse: boolean }

/**
 * The school decision the token hook made when it issued this token, or null for tokens issued before the hook
 * stamped it (or by a project without the hook): callers then ask the database. Reading claims does not prove
 * the token is genuine: the server verifies the signature first; the app only uses this to skip a round trip,
 * and the database keeps enforcing access on every request.
 */
export function schoolAccessFromClaims(claims: Record<string, unknown> | null | undefined): SchoolAccess | null {
  if (!claims || claims.school_beta !== true || typeof claims.full_course !== 'boolean') return null;
  return { school: true, fullCourse: claims.full_course };
}

/** Claims of a token without checking its signature (the app's own session; never for authorization). */
export function unverifiedClaims(token: string | null | undefined): Record<string, unknown> | null {
  const part = token?.split('.')[1];
  if (!part) return null;
  try { return json(part); } catch { return null; }
}
