/** Supabase access tokens verified with project JWKS; no app-server hop or user-editable metadata checks. */
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

/** Null means invalid credentials; key-service outages throw so the client can retry a 503. */
export async function verifyAccessToken(authorization: string | null, supabaseUrl: string): Promise<{ userId: string; expiresAt: number } | null> {
  if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) return null;
  const parts = authorization.slice(7).split('.');
  if (parts.length !== 3) return null;
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
      || claims.iss !== `${supabaseUrl}/auth/v1` || !aud.includes('authenticated')) return null;
  } catch { return null; }
  const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  let jwk = (await keys(url)).find(key => key.kid === header.kid);
  jwk ??= (await keys(url, true)).find(key => key.kid === header.kid);
  if (!jwk || (jwk.alg && jwk.alg !== header.alg)) return null;
  try {
    const ec = header.alg === 'ES256';
    if (ec ? jwk.kty !== 'EC' || jwk.crv !== 'P-256' : jwk.kty !== 'RSA') return null;
    const algorithm = ec ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    jwk.imported ??= await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, n: jwk.n, e: jwk.e }, algorithm, false, ['verify']);
    const valid = await crypto.subtle.verify(ec ? { name: 'ECDSA', hash: 'SHA-256' } : algorithm, jwk.imported, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return valid ? { userId: claims.sub as string, expiresAt: Number(claims.exp) * 1000 } : null;
  } catch { return null; }
}
