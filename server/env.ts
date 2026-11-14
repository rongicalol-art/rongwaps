/**
 * What the server is given to run with. On Cloudflare these are the Worker's bindings (server/wrangler.jsonc);
 * `npm run dev` and the tests build the same shape from process.env or by hand (server/index.ts).
 */
export interface AssetFetcher { fetch(input: Request | URL | string, init?: RequestInit): Promise<Response> }
/** Cloudflare's rate limiting binding; `memoryLimiter` stands in where there is none. */
export interface RateLimiter { limit(options: { key: string }): Promise<{ success: boolean }> }

export interface Env {
  /** The built site (dist/). Absent in `npm run dev`, where Vite serves the files. */
  ASSETS?: AssetFetcher;
  APP_ENV?: string;
  /** The deployed commit; release checks read it from /healthz. */
  COMMIT?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GAMES_SERVER_URL?: string;
  RESEND_API_KEY?: string;
  FEEDBACK_EMAIL_FROM?: string;
  FEEDBACK_EMAIL_TO?: string;
  SENTRY_DSN?: string;
  /** Requests without a verified session, per IP. */
  IP_LIMIT?: RateLimiter;
  /** Per learner. */
  CONTENT_LIMIT?: RateLimiter;
  FEEDBACK_LIMIT?: RateLimiter;
  REPORT_LIMIT?: RateLimiter;
}

export interface Context {
  env: Env;
  /** Error tracking (Sentry on Cloudflare); never throws. */
  report(error: unknown, operation: string): void;
}

/** Fixed-window limiter for one process: development and tests only (Cloudflare runs many copies of the server). */
export function memoryLimiter(limit: number, periodMs = 60_000): RateLimiter {
  const windows = new Map<string, { count: number; until: number }>();
  return {
    async limit({ key }) {
      const now = Date.now();
      let entry = windows.get(key);
      if (!entry || entry.until <= now) {
        if (windows.size > 5000) for (const [stale, value] of windows) if (value.until <= now) windows.delete(stale);
        entry = { count: 0, until: now + periodMs };
        windows.set(key, entry);
      }
      entry.count += 1;
      return { success: entry.count <= limit };
    },
  };
}
