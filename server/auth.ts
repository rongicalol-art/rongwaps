import { isLocallyVerifiable, schoolAccessFromClaims, verifyAccessToken } from '../shared/accessToken';
import { memoryLimiter, type Context, type RateLimiter } from './env';
import { json, PRIVATE, tooManyRequests } from './respond';
import { getUser, rpc } from './supabase';

// ─── Sign-in checks and rate limits (abuse protection for the APIs and the lesson content) ──
// A lesson opens dozens of /data files with the same token. A token that passed is trusted briefly, so most
// content requests cost no check at all. Only settled results are shared: Cloudflare forbids one request
// waiting on another request's unfinished work.
const AUTH_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFIED_TOKENS = 2000;
type AuthResult = { userId: string } | { status: number; error: string };
const verifiedTokens = new Map<string, { userId: string; until: number }>();

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

function tokenExpiryMs(token: string): number {
  try {
    const part = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const exp = Number((JSON.parse(atob(part)) as { exp?: unknown }).exp);
    return Number.isFinite(exp) ? exp * 1000 : Infinity;
  } catch { return Infinity; }
}

/**
 * Tokens signed with the project's asymmetric keys are checked here, and the school decision the sign-in hook
 * stamped into them is trusted: no Supabase round trip. Older tokens, legacy shared-secret tokens and signing-key
 * outages fall back to asking Supabase. A forged or expired asymmetric token is refused at once.
 */
async function verifyLocally({ env }: Context, token: string): Promise<AuthResult | null> {
  if (!env.SUPABASE_URL || !isLocallyVerifiable(token)) return null;
  let verified: Awaited<ReturnType<typeof verifyAccessToken>>;
  try { verified = await verifyAccessToken(`Bearer ${token}`, env.SUPABASE_URL); }
  catch { return null; }
  if (!verified) return { status: 401, error: 'Unauthorized' };
  return schoolAccessFromClaims(verified.claims)?.school ? { userId: verified.userId } : null;
}

const NO_ACCESS = 'This account can’t use Ron’s Mandarin right now.';
async function verifyToken(context: Context, token: string): Promise<AuthResult> {
  const local = await verifyLocally(context, token);
  if (local) return local;
  try {
    const [user, access] = await Promise.all([getUser(context.env, token), rpc<boolean>(context.env, token, 'has_beta_access')]);
    if (!user) return { status: 401, error: 'Unauthorized' };
    if (access.error) {
      return access.status === 403 || access.status === 401
        ? { status: access.status, error: access.status === 403 ? NO_ACCESS : 'Access verification unavailable.' }
        : { status: 503, error: 'Access verification unavailable.' };
    }
    if (access.data !== true) return { status: 403, error: NO_ACCESS };
    return { userId: user.id };
  } catch (error: unknown) {
    console.error('Auth check failed:', error);
    context.report(error, 'auth-check');
    return { status: 503, error: 'Authentication unavailable right now.' };
  }
}

const fallbackLimiters = new Map<string, RateLimiter>();
/** The Cloudflare limiter when bound; otherwise one for this process (development, tests). */
function limiter(bound: RateLimiter | undefined, name: string, limit: number): RateLimiter {
  if (bound) return bound;
  let fallback = fallbackLimiters.get(name);
  if (!fallback) { fallback = memoryLimiter(limit); fallbackLimiters.set(name, fallback); }
  return fallback;
}

/** A limiter that is down never locks learners out. */
async function allowed(bound: RateLimiter, key: string): Promise<boolean> {
  try { return (await bound.limit({ key })).success; } catch { return true; }
}

export const USER_LIMITS = { content: 1200, feedback: 3, report: 10 } as const;

/**
 * Requires a valid Supabase session with school access, then applies the learner's own limit for `use`.
 * Returns the learner's id, or the response to send instead. Refusals are never cached.
 */
export async function requireUser(context: Context, request: Request, use: keyof typeof USER_LIMITS): Promise<{ userId: string; token: string } | Response> {
  const { env } = context;
  const token = bearerToken(request);
  const now = Date.now();
  let entry = token ? verifiedTokens.get(token) : undefined;
  if (entry && entry.until <= now) { verifiedTokens.delete(token!); entry = undefined; }
  if (!entry) {
    // Only requests without a verified session count per IP (carrier NAT puts many phones on one IP):
    // 300 a minute admits a 150-student classroom plus reconnects before their tokens are trusted.
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!await allowed(limiter(env.IP_LIMIT, 'ip', 300), ip)) return tooManyRequests(PRIVATE);
    if (!token) return json({ error: 'Unauthorized' }, 401, PRIVATE);
    const result = await verifyToken(context, token);
    if ('status' in result) return json({ error: result.error }, result.status, PRIVATE);
    entry = { userId: result.userId, until: Math.min(now + AUTH_TTL_MS, tokenExpiryMs(token)) };
    verifiedTokens.set(token, entry);
    for (const [key, value] of verifiedTokens) {
      if (verifiedTokens.size <= MAX_VERIFIED_TOKENS) break;
      if (value.until <= now || key !== token) verifiedTokens.delete(key);
    }
  }
  const bound = use === 'content' ? env.CONTENT_LIMIT : use === 'feedback' ? env.FEEDBACK_LIMIT : env.REPORT_LIMIT;
  if (!await allowed(limiter(bound, use, USER_LIMITS[use]), entry.userId)) return tooManyRequests(PRIVATE);
  return { userId: entry.userId, token: token! };
}

/** Tests start from an empty memory. */
export function resetAuthState() { verifiedTokens.clear(); fallbackLimiters.clear(); }
