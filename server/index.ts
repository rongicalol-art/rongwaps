import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import dotenv from "dotenv";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { supabase } from "./supabase.js";
import { getTtsObject, putTtsObject } from "./ttsStore.js";
import { gradeGrammarAnswer } from "./jevClient.js";
import { isAzureTtsConfigured, synthesizeAzure } from "./azureTts.js";

// Load local server configuration.
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// The production bundle is built with NODE_ENV defined to "production".
const isProd = process.env.NODE_ENV === "production";

// Behind Render's/Cloudflare's proxy so req.ip (rate limits) is the client.
if (isProd) app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
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
const jevUserLimiter = userLimiter(10);
const ttsDailyCap = dailyCap(Number(process.env.TTS_DAILY_LIMIT) || 600);
const jevDailyCap = dailyCap(Number(process.env.JEV_DAILY_LIMIT) || 200);

// In-memory TTS audio cache for up to 1,000 files (~10-15 MB RAM)
interface CachedAudio {
  buffer: Buffer;
  contentType: string;
  etag: string;
}

const AUDIO_CACHE_MAX_ENTRIES = 1000;
const audioMemoryCache = new Map<string, CachedAudio>();

function setInAudioMemoryCache(key: string, item: CachedAudio) {
  if (audioMemoryCache.size >= AUDIO_CACHE_MAX_ENTRIES) {
    const oldestKey = audioMemoryCache.keys().next().value;
    if (oldestKey !== undefined) {
      audioMemoryCache.delete(oldestKey);
    }
  }
  audioMemoryCache.set(key, item);
}

function sendAudioBuffer(
  req: express.Request,
  res: express.Response,
  buffer: Buffer,
  contentType: string,
  etag: string,
  cacheControl: string = "public, max-age=31536000, immutable",
) {
  // HTTP 304 Not Modified validation
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", cacheControl);

  const range = req.headers.range;
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
    start = buffer.length - end;
    end = buffer.length - 1;
  } else if (start !== undefined && end === undefined) {
    // Open range: bytes=500-
    end = buffer.length - 1;
  }

  if (start === undefined || end === undefined || start >= buffer.length || end < start || start < 0) {
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

// ─── Neural TTS endpoint (Azure AI Speech, msedge-tts fallback) ──────────────────
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
  return text.trim().slice(0, 500);
}

async function synthesizeNeural(text: string, voiceName: string): Promise<Buffer> {
  // Preferred provider: Azure AI Speech when configured. Falls back to
  // msedge-tts on any failure so playback never breaks.
  if (isAzureTtsConfigured()) {
    try {
      return await synthesizeAzure(text, voiceName);
    } catch (error) {
      console.warn(
        `Azure TTS failed (${voiceName}); falling back to msedge-tts:`,
        (error as Error).message,
      );
    }
  }
  const voice = TTS_VOICES[voiceName] || TTS_VOICES["zh-CN-XiaoxiaoNeural"]!;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice.name, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text, { rate: 0.9 });
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function getTtsAudio(text: string, voiceName: string): Promise<CachedAudio> {
  const key = ttsCacheKey(text, voiceName);
  const cacheKey = `tts-key:${key}`;
  const inMemory = audioMemoryCache.get(cacheKey);
  if (inMemory) return inMemory;

  // 1. Check cache
  const cachedBuffer = await getTtsObject(key);
  if (cachedBuffer) {
    const buffer = cachedBuffer;
    const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
    const item: CachedAudio = { buffer, contentType: "audio/mpeg", etag };
    setInAudioMemoryCache(cacheKey, item);
    return item;
  }

  // 2. Dedupe concurrent synthesis
  const existing = ttsInFlight.get(key);
  if (existing) {
    const buffer = await existing;
    const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
    return { buffer, contentType: "audio/mpeg", etag };
  }

  const promise = (async () => {
    const audio = await synthesizeNeural(text, voiceName);
    // Best-effort cache write; never block playback on failure.
    await putTtsObject(key, audio);
    return audio;
  })();

  ttsInFlight.set(key, promise);
  try {
    const buffer = await promise;
    const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
    const item: CachedAudio = { buffer, contentType: "audio/mpeg", etag };
    setInAudioMemoryCache(cacheKey, item);
    return item;
  } finally {
    ttsInFlight.delete(key);
  }
}

// Require a valid Supabase session on paid synthesis endpoints so anonymous
// callers cannot burn the TTS provider budget (Azure/Edge). Only
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
    res.status(503).json({ error: "Authentication unavailable right now." });
    return;
  }
  next();
}

app.post("/api/tts", apiLimiter, requireAuth, ttsUserLimiter, ttsDailyCap, async (req: express.Request, res: express.Response) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    const cleanText = sanitizeTtsText(text || "");
    if (!cleanText) {
      return res.status(400).json({ error: "Missing or empty 'text'" });
    }

    const voiceName = voice && TTS_VOICES[voice] ? voice : "zh-CN-XiaoxiaoNeural";
    const cachedAudio = await getTtsAudio(cleanText, voiceName);

    sendAudioBuffer(req, res, cachedAudio.buffer, cachedAudio.contentType, cachedAudio.etag, "private, max-age=86400");
  } catch (err: unknown) {
    console.error("Neural TTS error:", err);
    res.status(502).json({ error: "Neural TTS unavailable right now." });
  }
});

// POST /api/jev/grade-answer — semantic grading for free-text answers.
// 503 when TYPESAFE_API_KEY is unset, so clients fall back to exact matching.
app.post("/api/jev/grade-answer", apiLimiter, requireAuth, jevUserLimiter, jevDailyCap, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const outcome = await gradeGrammarAnswer(req.body);
    if (outcome.status === 200) {
      res.json(outcome.result);
      return;
    }
    res.status(outcome.status).json({ error: outcome.error });
  } catch (err: unknown) {
    next(err);
  }
});

// GET /api/tts-cache/:text — serve cached TTS MP3 by text, or 404 (client synthesizes on miss)
app.get("/api/tts-cache/:text", apiLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const text = decodeURIComponent(req.params.text || "").trim();
    const voice = (req.query.voice as string) || "zh-CN-XiaoxiaoNeural";
    if (!text || !TTS_VOICES[voice]) {
      return res.status(400).json({ error: "Invalid text or voice" });
    }
    const key = ttsCacheKey(text, voice);
    const cacheKey = `tts-key:${key}`;
    let cached = audioMemoryCache.get(cacheKey);

    if (!cached) {
      const buffer = await getTtsObject(key);
      if (!buffer) {
        return res.status(404).json({ error: "TTS audio not cached" });
      }
      const etag = `"tts-${Buffer.from(key).toString("base64url")}-${buffer.length}"`;
      cached = { buffer, contentType: "audio/mpeg", etag };
      setInAudioMemoryCache(cacheKey, cached);
    }

    sendAudioBuffer(req, res, cached.buffer, cached.contentType, cached.etag, "public, max-age=86400");
  } catch (err: unknown) {
    console.error("TTS cache read error:", err);
    res.status(500).json({ error: "Failed to fetch TTS audio" });
  }
});

// GET /api/tts/:voice/:hash.mp3 — direct cache read, same output as POST but cache-only
app.get("/api/tts/:voice/*", apiLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const voice = req.params.voice;
    const fileTail = req.params[0];
    // Keys are `tts/<voice>/<hex(text)>.mp3` (see ttsCacheKey).
    if (!voice || !TTS_VOICES[voice] || !fileTail || !/^[a-f0-9]+\.mp3$/.test(fileTail)) {
      return res.status(400).json({ error: "Invalid voice or filename" });
    }
    const cacheKey = `tts:${voice}:${fileTail}`;
    let cached = audioMemoryCache.get(cacheKey);

    if (!cached) {
      const key = `${TTS_CACHE_PREFIX}${voice}/${fileTail}`;
      const buffer = await getTtsObject(key);
      if (!buffer) {
        return res.status(404).json({ error: "TTS audio not found" });
      }
      const etag = `"tts-${voice}-${fileTail}-${buffer.length}"`;
      cached = { buffer, contentType: "audio/mpeg", etag };
      setInAudioMemoryCache(cacheKey, cached);
    }

    sendAudioBuffer(req, res, cached.buffer, cached.contentType, cached.etag, "public, max-age=86400");
  } catch (err: unknown) {
    console.error("TTS cache read error:", err);
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
    app.use(express.static(distPath, {
      setHeaders(res: express.Response, filePath: string) {
        if (revalidatedFiles.has(path.basename(filePath))) {
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

bootstrap().catch((err) => {
  console.error("Failed to start full-stack server:", err);
  process.exit(1);
});
