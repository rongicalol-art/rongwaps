import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import * as Sentry from "@sentry/node";
import { supabase } from "./supabase.js";
import { getTtsObject, putTtsObject } from "./ttsStore.js";

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

// ─── Rate limiting (abuse protection for paid/rate-limited APIs) ──────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

// Per-user limits for paid endpoints. Run after requireAuth, which stashes the
// user id on res.locals, so one account cannot burn the budget from many IPs.
const userLimiter = (limit: number) => rateLimit({
  windowMs: 60 * 1000,
  limit,
  keyGenerator: (_req, res) => String(res.locals.userId),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

// Daily per-user cap. Counters are in-memory, so they are per instance and
// reset on restart/deploy; a hard budget needs a shared store.
function dailyCap(limit: number): express.RequestHandler {
  const counts = new Map<string, number>();
  let day = "";
  return (_req, res, next) => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      counts.clear();
    }
    const userId = String(res.locals.userId);
    const used = (counts.get(userId) ?? 0) + 1;
    if (used > limit) {
      res.status(429).json({ error: "Daily limit reached. Try again tomorrow." });
      return;
    }
    counts.set(userId, used);
    next();
  };
}

const ttsUserLimiter = userLimiter(30);
const ttsDailyCap = dailyCap(Number(process.env.TTS_DAILY_LIMIT) || 600);

// In-memory TTS audio cache, bounded by 1,000 files and 32 MiB.
interface CachedAudio {
  buffer: Buffer;
  contentType: string;
  etag: string;
}

const AUDIO_CACHE_MAX_ENTRIES = 1000;
const AUDIO_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const audioMemoryCache = new Map<string, CachedAudio>();

function setInAudioMemoryCache(key: string, item: CachedAudio) {
  if (item.buffer.length > AUDIO_CACHE_MAX_BYTES) return;
  audioMemoryCache.delete(key);
  audioMemoryCache.set(key, item);
  let bytes = [...audioMemoryCache.values()].reduce((sum, audio) => sum + audio.buffer.length, 0);
  while (audioMemoryCache.size > AUDIO_CACHE_MAX_ENTRIES || bytes > AUDIO_CACHE_MAX_BYTES) {
    const oldestKey = audioMemoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    bytes -= audioMemoryCache.get(oldestKey)!.buffer.length;
    audioMemoryCache.delete(oldestKey);
  }
}

export function sendAudioBuffer(
  req: express.Request,
  res: express.Response,
  buffer: Buffer,
  contentType: string,
  etag: string,
  cacheControl: string = "public, max-age=31536000, immutable",
) {
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", cacheControl);

  if (req.headers["if-none-match"]?.split(',').some((tag) => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag)) return res.status(304).end();
  const range = !req.headers["if-range"] || req.headers["if-range"] === etag ? req.headers.range : undefined;
  if (!range) {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  }

  // Parse Range header e.g. "bytes=0-1023" or "bytes=0-" or "bytes=-500"
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) {
    res.setHeader("Content-Range", `bytes */${buffer.length}`);
    return res.status(416).end();
  }

  let start = match[1] ? parseInt(match[1], 10) : undefined;
  let end = match[2] ? parseInt(match[2], 10) : undefined;

  if (start === undefined && end !== undefined) {
    // Suffix range: bytes=-500 (last 500 bytes)
    start = Math.max(0, buffer.length - end);
    end = buffer.length - 1;
  } else if (start !== undefined && end === undefined) {
    // Open range: bytes=500-
    end = buffer.length - 1;
  }

  if (start === undefined || end === undefined || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || (!match[1] && Number(match[2]) === 0) || start >= buffer.length || end < start || start < 0) {
    res.setHeader("Content-Range", `bytes */${buffer.length}`);
    return res.status(416).end();
  }

  end = Math.min(end, buffer.length - 1);
  const chunkSize = end - start + 1;

  res.status(206);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
  res.setHeader("Content-Length", chunkSize);
  return res.send(buffer.subarray(start, end + 1));
}

// ─── Neural TTS endpoint (msedge-tts) ───────────────────────────────────────────
// POST /api/tts { text, voice? }
// Synthesizes natural neural TTS server-side, caches MP3 in R2 (Supabase Storage if R2 is unset),
// and streams audio/mpeg back. Fallback: GET /api/tts-cache/:text serves cache.

const TTS_CACHE_PREFIX = "tts/";

const TTS_VOICES: Record<string, { name: string; lang: string }> = {
  "zh-CN-XiaoxiaoNeural": { name: "zh-CN-XiaoxiaoNeural", lang: "zh-CN" },
  "zh-CN-YunxiNeural": { name: "zh-CN-YunxiNeural", lang: "zh-CN" },
  "zh-TW-HsiaoChenNeural": { name: "zh-TW-HsiaoChenNeural", lang: "zh-TW" },
  "zh-TW-YunJheNeural": { name: "zh-TW-YunJheNeural", lang: "zh-TW" },
};

function ttsCacheKey(text: string, voiceName: string): string {
  return `${TTS_CACHE_PREFIX}${voiceName}/${Buffer.from(text).toString("hex")}.mp3`;
}

// Dedupe concurrent synthesis of the same cache key
const ttsInFlight = new Map<string, Promise<Buffer>>();

function sanitizeTtsText(text: string): string {
  // Guard against length abuse; SSML escaping happens in the providers.
  return Array.from(text.trim()).slice(0, 500).join('');
}

export async function synthesizeNeural(text: string, voiceName: string): Promise<Buffer> {
  const voice = Object.hasOwn(TTS_VOICES, voiceName) ? TTS_VOICES[voiceName] : TTS_VOICES["zh-CN-XiaoxiaoNeural"]!;
  const tts = new MsEdgeTTS();
  let stream: ReturnType<MsEdgeTTS['toStream']>['audioStream'] | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        expired = true;
        const error = new Error('TTS synthesis timed out');
        stream?.destroy(error);
        reject(error);
      }, 15_000);
    });
    const work = (async () => {
      await tts.setMetadata(voice.name, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      if (expired) throw new Error('TTS synthesis timed out');
      // msedge-tts accepts SSML. This API accepts plain text only.
      const escaped = text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
      ({ audioStream: stream } = tts.toStream(escaped, { rate: 0.9 }));
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 4 * 1024 * 1024) throw new Error('TTS output exceeds limit');
        chunks.push(buffer);
      }
      if (!bytes) throw new Error('TTS returned empty audio');
      return Buffer.concat(chunks);
    })();
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
    stream?.destroy();
    try { tts.close(); } catch { /* provider connection may already be closed */ }
  }
}

export async function getTtsAudio(text: string, voiceName: string): Promise<CachedAudio> {
  const key = ttsCacheKey(text, voiceName);
  const inMemory = audioMemoryCache.get(key);
  if (inMemory) {
    audioMemoryCache.delete(key);
    audioMemoryCache.set(key, inMemory);
    return inMemory;
  }
  let promise = ttsInFlight.get(key);
  if (!promise) {
    if (ttsInFlight.size >= 4) throw new Error('TTS concurrency limit reached');
    promise = (async () => {
      const cached = await getTtsObject(key);
      if (cached?.length) return cached;
      const audio = await synthesizeNeural(text, voiceName);
      // Persistence is best effort and must not hold up the response.
      void putTtsObject(key, audio);
      return audio;
    })();
    ttsInFlight.set(key, promise);
  }
  try {
    const buffer = await promise;
    const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
    const item: CachedAudio = { buffer, contentType: "audio/mpeg", etag };
    setInAudioMemoryCache(key, item);
    return item;
  } finally {
    if (ttsInFlight.get(key) === promise) ttsInFlight.delete(key);
  }
}

// Require a valid Supabase session on synthesis endpoints so anonymous
// callers cannot consume unlimited TTS resources. Only
// authenticated users get neural audio.
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
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
    res.locals.userId = user.id;
  } catch (err: unknown) {
    console.error("Auth check failed:", err);
    captureServerException(err, "auth-check");
    res.status(503).json({ error: "Authentication unavailable right now." });
    return;
  }
  next();
}

app.post("/api/tts", apiLimiter, requireAuth, ttsUserLimiter, ttsDailyCap, async (req: express.Request, res: express.Response) => {
  try {
    const { text, voice } = (req.body ?? {}) as { text?: unknown; voice?: unknown };
    if (typeof text !== 'string' || (voice !== undefined && typeof voice !== 'string')) {
      return res.status(400).json({ error: "Invalid text or voice" });
    }
    const cleanText = sanitizeTtsText(text);
    if (!cleanText) {
      return res.status(400).json({ error: "Missing or empty 'text'" });
    }

    const voiceName = typeof voice === 'string' && Object.hasOwn(TTS_VOICES, voice) ? voice : "zh-CN-XiaoxiaoNeural";
    const cachedAudio = await getTtsAudio(cleanText, voiceName);

    sendAudioBuffer(req, res, cachedAudio.buffer, cachedAudio.contentType, cachedAudio.etag, "private, max-age=86400");
  } catch (err: unknown) {
    console.error("Neural TTS error:", err);
    captureServerException(err, "tts-synthesis");
    res.status(502).json({ error: "Neural TTS unavailable right now." });
  }
});

// GET /api/tts-cache/:text — serve cached TTS MP3 by text, or 404 (client synthesizes on miss)
app.get("/api/tts-cache/:text", apiLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const text = sanitizeTtsText(req.params.text || "");
    const voice = req.query.voice ?? "zh-CN-XiaoxiaoNeural";
    if (!text || typeof voice !== 'string' || !Object.hasOwn(TTS_VOICES, voice)) {
      return res.status(400).json({ error: "Invalid text or voice" });
    }
    const key = ttsCacheKey(text, voice);
    const cacheKey = key;
    let cached = audioMemoryCache.get(cacheKey);

    if (!cached) {
      const buffer = await getTtsObject(key);
      if (!buffer?.length) {
        return res.status(404).json({ error: "TTS audio not cached" });
      }
      const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
      cached = { buffer, contentType: "audio/mpeg", etag };
      setInAudioMemoryCache(cacheKey, cached);
    }

    sendAudioBuffer(req, res, cached.buffer, cached.contentType, cached.etag, "public, max-age=86400");
  } catch (err: unknown) {
    console.error("TTS cache read error:", err);
    captureServerException(err, "tts-cache-read");
    res.status(500).json({ error: "Failed to fetch TTS audio" });
  }
});

// GET /api/tts/:voice/:hash.mp3 — direct cache read, same output as POST but cache-only
app.get("/api/tts/:voice/*", apiLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const voice = req.params.voice;
    const fileTail = req.params[0];
    // Keys are `tts/<voice>/<hex(text)>.mp3` (see ttsCacheKey).
    if (!voice || !Object.hasOwn(TTS_VOICES, voice) || !fileTail || !/^(?:[a-f0-9]{2}){1,2000}\.mp3$/.test(fileTail)) {
      return res.status(400).json({ error: "Invalid voice or filename" });
    }
    const cacheKey = `${TTS_CACHE_PREFIX}${voice}/${fileTail}`;
    let cached = audioMemoryCache.get(cacheKey);

    if (!cached) {
      const buffer = await getTtsObject(cacheKey);
      if (!buffer?.length) {
        return res.status(404).json({ error: "TTS audio not found" });
      }
      const etag = `"tts-${voice}-${fileTail}-${buffer.length}"`;
      cached = { buffer, contentType: "audio/mpeg", etag };
      setInAudioMemoryCache(cacheKey, cached);
    }

    sendAudioBuffer(req, res, cached.buffer, cached.contentType, cached.etag, "public, max-age=86400");
  } catch (err: unknown) {
    console.error("TTS cache read error:", err);
    captureServerException(err, "tts-cache-read");
    res.status(500).json({ error: "Failed to fetch TTS audio" });
  }
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
    // Lesson content is served to signed-in users only (keep in sync with GATED_CONTENT in
    // src/services/staticContentService.ts). Dictionary, breakdown and other reference packs stay public.
    const gatedDirs = [
      "vocabulary", "readings", "grammar", "course-examples", "dialogue-alignment", "flashcard-extras", "book-pages",
    ].map((dir) => path.join(distDataDir, dir) + path.sep);
    const lessonContentLimiter = userLimiter(600);
    app.use("/data", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      let requested: string;
      try {
        requested = path.join(distDataDir, decodeURIComponent(req.path)); // decode so %-encoded paths cannot dodge the gate
      } catch {
        res.status(400).json({ error: "Bad request" });
        return;
      }
      if (!gatedDirs.some((dir) => requested.startsWith(dir))) return next();
      apiLimiter(req, res, (limitErr?: unknown) => {
        if (limitErr) return next(limitErr);
        requireAuth(req, res, (authErr?: unknown) => {
          if (authErr) return next(authErr);
          lessonContentLimiter(req, res, next);
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
          res.setHeader("Cache-Control", "private, max-age=3600");
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
