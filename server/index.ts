import { lookupDictionary, searchDictionary, lookupCourseCards, lookupExamples } from './dictionary.js';
import { gameConfiguration } from './games.js';
import { submitFeedback } from './feedback.js';
import { existsSync, statSync } from 'node:fs';
import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import { createUserSupabaseClient, supabase } from "./supabase.js";

// Load local server configuration.
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// The production bundle is built with NODE_ENV defined to "production".
const isProd = process.env.NODE_ENV === "production";
const errorMonitoringEnabled = isProd && Boolean(process.env.SENTRY_DSN);

if (errorMonitoringEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend(event) {
      event.request = undefined;
      event.user = undefined;
      event.extra = undefined;
      event.breadcrumbs = undefined;
      return event;
    },
  });
}

function captureServerException(error: unknown, operation: string) {
  if (errorMonitoringEnabled) {
    Sentry.captureException(error, { tags: { operation } });
  }
}

// Behind Render's/Cloudflare's proxy so req.ip (rate limits) is the client.
if (isProd) app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  captureServerException(reason, "unhandled-rejection");
});

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (isProd) res.setHeader("Strict-Transport-Security", "max-age=31536000");
  next();
});
app.use(compression());
app.use(express.json({ limit: "16kb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// ─── Auth + rate limiting (abuse protection for APIs and protected content) ──
// A lesson opens dozens of /data files in parallel with the same token. Verify
// each token once (shared in-flight promise), then trust it briefly, so content
// requests skip two Supabase round trips and never trip the per-IP limit.
const AUTH_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFIED_TOKENS = 2000;
type AuthResult = { userId: string } | { status: number; error: string };
const verifiedTokens = new Map<string, { result: Promise<AuthResult>; until: number }>();

function bearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

function tokenExpiryMs(token: string): number {
  try {
    const exp = Number(JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).exp);
    return Number.isFinite(exp) ? exp * 1000 : Infinity;
  } catch { return Infinity; }
}

async function verifyToken(token: string): Promise<AuthResult> {
  try {
    const [userResult, accessResult] = await Promise.all([
      supabase.auth.getUser(token),
      createUserSupabaseClient(token).rpc('has_beta_access'),
    ]);
    const { data: { user }, error } = userResult;
    if (error || !user) return { status: 401, error: "Unauthorized" };
    const { data: allowed, error: accessError, status } = accessResult;
    if (accessError) {
      return status === 403 || status === 401
        ? { status, error: status === 403 ? 'Use your Shu-Te student Google account.' : 'Access verification unavailable.' }
        : { status: 503, error: 'Access verification unavailable.' };
    }
    if (allowed !== true) return { status: 403, error: 'Use your Shu-Te student Google account.' };
    return { userId: user.id };
  } catch (err: unknown) {
    console.error("Auth check failed:", err);
    captureServerException(err, "auth-check");
    return { status: 503, error: "Authentication unavailable right now." };
  }
}

function isVerified(token: string | null): boolean {
  const entry = token ? verifiedTokens.get(token) : undefined;
  return Boolean(entry && entry.until > Date.now());
}

// Only unverified requests count per IP (carrier NAT puts many phones on one IP).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300, // Admit a 150-student classroom plus reconnects before token checks are warm.
  skip: (req) => isVerified(bearerToken(req)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

// Per-user limits run after requireAuth, which stashes the user id on res.locals.
const userLimiter = (limit: number) => rateLimit({
  windowMs: 60 * 1000,
  limit,
  keyGenerator: (_req, res) => String(res.locals.userId),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

// Require a valid Supabase session and beta access for protected lesson content.
export async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const now = Date.now();
  let entry = verifiedTokens.get(token);
  if (!entry || entry.until <= now) {
    const until = Math.min(now + AUTH_TTL_MS, tokenExpiryMs(token));
    const created = { result: verifyToken(token), until };
    entry = created;
    verifiedTokens.set(token, created);
    // Keep successes only; failures must re-check on the next request.
    void created.result.then((result) => {
      if ('status' in result && verifiedTokens.get(token) === created) verifiedTokens.delete(token);
    });
    for (const [key, value] of verifiedTokens) {
      if (verifiedTokens.size <= MAX_VERIFIED_TOKENS) break;
      if (value.until <= now || key !== token) verifiedTokens.delete(key);
    }
  }
  const result = await entry.result;
  if ('status' in result) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.locals.userId = result.userId;
  next();
}

app.get('/api/games/config', gameConfiguration);
app.post('/api/feedback', apiLimiter, requireAuth, userLimiter(3), submitFeedback);

const dictionaryLimiter = userLimiter(180);
app.use('/api/dictionary', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.vary('Authorization');
  next();
// `npm run dev` serves /data without a session (signed-out dev mode); the dictionary API matches.
// Fail closed: only an explicit NODE_ENV=development skips the check.
}, ...(process.env.NODE_ENV === 'development' ? [] : [apiLimiter, requireAuth, dictionaryLimiter]));
app.get('/api/dictionary/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = req.query.limit === undefined ? 30 : Number(req.query.limit);
  if (!query || query.length > 128 || (query.match(/[*?＊？]/g)?.length ?? 0) > 4
    || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    res.status(400).json({ error: 'Invalid search' }); return;
  }
  try { res.json(await searchDictionary(query, limit)); }
  catch (error) { captureServerException(error, 'dictionary-search'); res.status(503).json({ error: 'Dictionary unavailable. Please try again.' }); }
});
app.post(['/api/dictionary/lookup', '/api/dictionary/course'], async (req, res) => {
  const words: unknown = req.body?.words;
  if (!Array.isArray(words) || words.length > 64 || !words.every(word => typeof word === 'string' && word.trim().length > 0 && word.length <= 128)) {
    res.status(400).json({ error: 'Invalid words' }); return;
  }
  try { res.json(await (req.path.endsWith('/course') ? lookupCourseCards : lookupDictionary)([...new Set((words as string[]).map(word => word.trim()))])); }
  catch (error) { captureServerException(error, 'dictionary-lookup'); res.status(503).json({ error: 'Dictionary unavailable. Please try again.' }); }
});

app.get('/api/dictionary/examples', async (req, res) => {
  const word = typeof req.query.word === 'string' ? req.query.word.trim() : '';
  const limit = req.query.limit === undefined ? 3 : Number(req.query.limit);
  if (!word || word.length > 128 || !Number.isInteger(limit) || limit < 1 || limit > 30) {
    res.status(400).json({ error: 'Invalid word' }); return;
  }
  try { res.json(await lookupExamples(word, limit)); }
  catch (error) { captureServerException(error, 'dictionary-examples'); res.status(503).json({ error: 'Examples unavailable. Please try again.' }); }
});

app.use("/api", (_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: "Not found" });
});

// Bootstrap Vite middleware in Development OR serve Static Files in Production
async function bootstrap() {
  if (!isProd) {
    console.log("Bootstrap: Initializing Vite dev-server middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Bootstrap: Serving static build files from dist/ directory...");
    const distPath = path.join(process.cwd(), "dist");
    // Public assets are immutable; authenticated content is memory-only on the client.
    //  - /assets/* are content-hashed by Vite -> cache forever.
    //  - /data/* is checked on every request and never stored in shared caches.
    //  - Everything else stays revalidate-every-time; the shell files
    //    (index.html, service worker, manifest) are forced to no-cache.
    const distDataDir = path.join(distPath, "data");
    const revalidatedFiles = new Set([
      "index.html", "sw.js", "registerSW.js", "manifest.json", "manifest.webmanifest",
    ]);
    const assetsMarker = `${path.sep}assets${path.sep}`;
    // Authenticated content is same-origin so every pack request can be checked.
    // Keep in sync with PROTECTED_CONTENT in src/services/staticContentService.ts.
    const gatedDirs = [distDataDir + path.sep];
    const contentRequestLimiter = userLimiter(1200);
    // Content-hashed build outputs, e.g. study/1001001-8989b311b07f.json, pronunciation-audio/1d770a43c180f6f8.json.
    const HASHED_FILE = /[-/][a-f0-9]{12,16}\.json$/;
    // Packs fetched as `shard.json?v=<sha256>` are content-addressed too (the manifest owns the hash).
    const isImmutable = (req: express.Request, requested: string) =>
      HASHED_FILE.test(requested) || (typeof req.query.v === 'string' && /^[a-f0-9]{12,64}$/.test(req.query.v));
    // Inspect the decoded full path before express.static, rather than mounting
    // on /data: encoded mount names and duplicate slashes must hit the same gate.
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      let requested: string;
      try {
        requested = path.resolve(distPath, `.${decodeURIComponent(req.path)}`);
      } catch {
        res.status(400).json({ error: "Bad request" });
        return;
      }
      if (!gatedDirs.some((dir) => requested.startsWith(dir))) return next();
      // Errors (401/403/429) are never cached; only a passed check sets the cache policy.
      res.setHeader('Cache-Control', 'private, no-store');
      apiLimiter(req, res, (limitErr?: unknown) => {
        if (limitErr) return next(limitErr);
        requireAuth(req, res, (authErr?: unknown) => {
          if (authErr) return next(authErr);
          contentRequestLimiter(req, res, (limitError?: unknown) => {
            // Browser-only cache (`private`: never Cloudflare). Hashed names never change;
            // the rest revalidate (cheap 304). No Vary: Authorization, or every hourly
            // token refresh would empty the browser cache.
            if (!limitError) res.setHeader('Cache-Control', isImmutable(req, requested) ? 'private, max-age=31536000, immutable' : 'private, no-cache');
            next(limitError);
          });
        });
      });
    });
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      let target: string;
      try { target = path.resolve(distPath, `.${decodeURIComponent(req.path)}`); } catch { return next(); }
      if (!target.startsWith(distDataDir + path.sep) || !target.endsWith('.json')) return next();
      res.vary('Accept-Encoding');
      const encoding = req.acceptsEncodings('br', 'gzip', 'identity');
      const suffix = encoding === 'br' ? '.br' : encoding === 'gzip' ? '.gz' : '';
      if (!suffix) return next();
      // A sidecar older than its JSON (e.g. after a manual trim) is never served.
      let usable = false;
      try { usable = statSync(target + suffix).mtimeMs >= statSync(target).mtimeMs; } catch { /* no sidecar */ }
      if (!usable) return next();
      res.setHeader('Content-Encoding', encoding as string);
      res.type('application/json');
      res.sendFile(target + suffix, { cacheControl: false }, error => { if (error) next(error); });
    });
    app.use(express.static(distPath, {
      setHeaders(res: express.Response, filePath: string) {
        if (gatedDirs.some((dir) => filePath.startsWith(dir))) {
          // Cache-Control already set by the auth gate above (also for data manifest.json files).
        } else if (revalidatedFiles.has(path.basename(filePath))) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(assetsMarker)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (
          filePath.startsWith(distDataDir)
          || path.basename(filePath) === "dictionary_trie.json"
        ) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }));
    // Public pages prerendered at build time (scripts/build/prerender.ts) get their own HTML.
    const prerenderedPages = new Set(["/about", "/sources", "/privacy", "/terms"]);
    const knownRoutes = new Set(["", "path", "search", "library", "profile", "join", "about", "sources", "privacy", "terms"]);
    // Only extensionless navigation gets the SPA shell; missing files 404.
    app.get("*", (req: express.Request, res: express.Response) => {
      if (req.path.startsWith("/data/") || path.extname(req.path)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      const page = req.path.replace(/\/+$/, "");
      // Unknown paths still get the shell (it shows the landing or app) but answer 404 so search engines drop them.
      if (!knownRoutes.has(page.split("/")[1] ?? "")) res.status(404).setHeader("X-Robots-Tag", "noindex");
      const prerendered = prerenderedPages.has(page) ? path.join(distPath, `${page}.html`) : null;
      res.sendFile(prerendered && existsSync(prerendered) ? prerendered : path.join(distPath, "index.html"));
    });
  }

  if (errorMonitoringEnabled) Sentry.setupExpressErrorHandler(app);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs the 4-arg signature.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled request error:", err);
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      res.status(status).json({ error: "Bad request" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  void bootstrap().catch((err) => {
    console.error("Failed to start full-stack server:", err);
    captureServerException(err, "server-bootstrap");
    process.exit(1);
  });
}
export { app };
