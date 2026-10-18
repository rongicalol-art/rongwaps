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

// ─── Rate limiting (abuse protection for APIs and protected content) ──
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
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
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { data: allowed, error: accessError, status } = await createUserSupabaseClient(token).rpc('has_beta_access');
    if (accessError) {
      res.status(status === 403 || status === 401 ? status : 503).json({
        error: status === 403 ? 'Use your Shu-Te student Google account.' : 'Access verification unavailable.',
      });
      return;
    }
    if (allowed !== true) {
      res.status(403).json({ error: 'Use your Shu-Te student Google account.' });
      return;
    }
    res.locals.userId = user.id;
  } catch (err: unknown) {
    console.error("Auth check failed:", err);
    captureServerException(err, "auth-check");
    res.status(503).json({ error: "Authentication unavailable right now." });
    return;
  }
  next();
}

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
    // Cache policy (Cloudflare already applies brotli compression):
    //  - /assets/* are content-hashed by Vite -> cache forever.
    //  - Versioned content packs (/data) and the dictionary trie are large
    //    and change only on deploys -> cache an hour at browsers/edge;
    //    IndexedDB keys carry the real versioning.
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
    const contentRequestLimiter = userLimiter(600);
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
      res.setHeader('Cache-Control', 'private, no-store');
      res.vary('Authorization');
      apiLimiter(req, res, (limitErr?: unknown) => {
        if (limitErr) return next(limitErr);
        requireAuth(req, res, (authErr?: unknown) => {
          if (authErr) return next(authErr);
          contentRequestLimiter(req, res, next);
        });
      });
    });
    app.use(express.static(distPath, {
      setHeaders(res: express.Response, filePath: string) {
        if (revalidatedFiles.has(path.basename(filePath))) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(assetsMarker)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (gatedDirs.some((dir) => filePath.startsWith(dir))) {
          // Never let a shared cache (Cloudflare edge) hand lesson content to someone signed out.
          res.setHeader("Cache-Control", "private, no-store");
        } else if (
          filePath.startsWith(distDataDir)
          || path.basename(filePath) === "dictionary_trie.json"
        ) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }));
    // Only extensionless navigation gets the SPA shell; missing files 404.
    app.get("*", (req: express.Request, res: express.Response) => {
      if (req.path.startsWith("/data/") || path.extname(req.path)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
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
