import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { supabase } from "./src/services/supabaseClient.js";

// Load local server configuration.
dotenv.config();

// ─── TTS provider configuration ─────────────────────────────────────
// MiniMax Speech (https://platform.minimax.io) — high-quality Mandarin
// TTS. Used when MINIMAX_API_KEY is set; otherwise the built-in
// msedge-tts (Microsoft Edge Read Aloud) voices are used unchanged.
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_BASE_URL = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io").replace(/\/+$/, "");
const MINIMAX_TTS_MODEL = process.env.MINIMAX_TTS_MODEL || "speech-02-hd";

// Client-facing voice names (TTS_VOICES) → MiniMax system voice IDs.
// Only zh-CN voices are mapped: MiniMax has no Taiwanese (zh-TW) voices,
// so zh-TW requests continue to use msedge-tts.
const MINIMAX_VOICE_MAP: Record<string, string> = {
  "zh-CN-XiaoxiaoNeural": "female-tianmei", // warm, clear female
  "zh-CN-YunxiNeural": "male-qn-qingse",    // young, energetic male
};

const app = express();
const PORT = 3000;

app.use(express.json());

// ─── Rate limiting (abuse protection for paid/rate-limited APIs) ──────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

const paidApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10, // Edge TTS synthesis is rate-limited separately.
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

 // ─── Audio proxy endpoint (bypasses CORS for Safari) ──────────────────
 // GET /api/audio/:filename — downloads from Supabase Storage and streams to client
 app.get("/api/audio/*", apiLimiter, async (req: express.Request, res: express.Response) => {
   try {
     const fileName = req.params[0];
     if (!fileName) {
       return res.status(400).json({ error: "Missing filename" });
     }
 
     // Path traversal protection: only allow safe filename characters and forbid ../ segments.
     if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\") || !/^[\w.-]+$/.test(fileName)) {
       return res.status(400).json({ error: "Invalid filename" });
     }
 
     const { data, error } = await supabase.storage.from("vocabulary-audio").download(fileName);
    if (error || !data) {
      console.warn(`Audio proxy: file not found: ${fileName}`, error?.message);
      return res.status(404).json({ error: "Audio file not found" });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
    };
    const contentType = mimeMap[ext || ""] || "audio/mpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err: unknown) {
    console.error("Audio proxy error:", err);
    res.status(500).json({ error: "Failed to fetch audio" });
  }
});

// ─── Neural TTS endpoint (Microsoft Edge Read Aloud) ──────────────────
// POST /api/tts { text, voice? }
// Synthesizes natural neural TTS server-side, caches MP3 in Supabase Storage,
// and streams audio/mpeg back. Fallback: GET /api/audio/:cacheKey serves cache.

const TTS_AUDIO_BUCKET = "vocabulary-audio";
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
  // Guard against length abuse; msedge-tts requires SSML-safe text.
  return text.trim().slice(0, 500);
}

async function synthesizeMiniMax(text: string, voiceName: string): Promise<Buffer> {
  // POST /v1/t2a_v2 — synchronous synthesis, hex-encoded MP3 in the
  // response body. See https://platform.minimax.io/docs/api-reference/speech-t2a-http
  const voiceId = MINIMAX_VOICE_MAP[voiceName] || MINIMAX_VOICE_MAP["zh-CN-XiaoxiaoNeural"]!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${MINIMAX_BASE_URL}/v1/t2a_v2`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MINIMAX_TTS_MODEL,
        text,
        stream: false,
        language_boost: "auto",
        output_format: "hex",
        voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`MiniMax TTS HTTP ${response.status}`);
    }
    const payload = await response.json() as {
      data?: { audio?: string; status?: number };
      base_resp?: { status_code?: number; status_msg?: string };
    };
    if (payload.base_resp && payload.base_resp.status_code !== 0) {
      throw new Error(`MiniMax TTS API error ${payload.base_resp.status_code}: ${payload.base_resp.status_msg}`);
    }
    const hexAudio = payload.data?.audio;
    if (!hexAudio) {
      throw new Error("MiniMax TTS returned no audio");
    }
    return Buffer.from(hexAudio, "hex");
  } finally {
    clearTimeout(timeout);
  }
}

async function synthesizeNeural(text: string, voiceName: string): Promise<Buffer> {
  // Preferred provider: MiniMax Speech for zh-CN voices when configured.
  // Falls back to msedge-tts on any failure so playback never breaks.
  if (MINIMAX_API_KEY && voiceName in MINIMAX_VOICE_MAP) {
    try {
      return await synthesizeMiniMax(text, voiceName);
    } catch (error) {
      console.warn(
        `MiniMax TTS failed (${voiceName}); falling back to msedge-tts:`,
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

async function getTtsAudio(text: string, voiceName: string): Promise<Buffer> {
  const key = ttsCacheKey(text, voiceName);

  // 1. Check cache
  const { data, error } = await supabase.storage.from(TTS_AUDIO_BUCKET).download(key);
  if (!error && data) {
    return Buffer.from(await data.arrayBuffer());
  }

  // 2. Dedupe concurrent synthesis
  const existing = ttsInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const audio = await synthesizeNeural(text, voiceName);
    // Best-effort cache write; never block playback on failure.
    // Plain insert (no upsert): the storage INSERT policy allows anon writes
    // under tts/. Note the anon UPDATE policy was removed in migration
    // 20260816_security_hardening.sql, so upsert would 403 and the cache
    // would never land — keep this as a plain INSERT.
    await supabase.storage
      .from(TTS_AUDIO_BUCKET)
      .upload(key, audio, { contentType: "audio/mpeg" })
      .catch((err: unknown) => console.warn("TTS cache upload failed:", err));
    return audio;
  })();

  ttsInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    ttsInFlight.delete(key);
  }
}

// Require a valid Supabase session on paid synthesis endpoints so anonymous
// callers cannot burn the TTS provider budget (MiniMax/Edge). Guests keep
// browser-speech fallback; only authenticated users get neural audio.
async function requireAuth(req: express.Request, res: express.Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

app.post("/api/tts", paidApiLimiter, async (req: express.Request, res: express.Response) => {
  if (!(await requireAuth(req, res))) return;
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    const cleanText = sanitizeTtsText(text || "");
    if (!cleanText) {
      return res.status(400).json({ error: "Missing or empty 'text'" });
    }

    const voiceName = voice && TTS_VOICES[voice] ? voice : "zh-CN-XiaoxiaoNeural";
    const audio = await getTtsAudio(cleanText, voiceName);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audio.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(audio);
  } catch (err: unknown) {
    console.error("Neural TTS error:", err);
    res.status(502).json({ error: "Neural TTS unavailable right now." });
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
    const { data, error } = await supabase.storage.from(TTS_AUDIO_BUCKET).download(key);
    if (error || !data) {
      return res.status(404).json({ error: "TTS audio not cached" });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
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
    if (!fileTail) {
      return res.status(400).json({ error: "Missing filename" });
    }
    const key = `${TTS_CACHE_PREFIX}${voice}/${fileTail}`;
    const { data, error } = await supabase.storage.from(TTS_AUDIO_BUCKET).download(key);
    if (error || !data) {
      return res.status(404).json({ error: "TTS audio not found" });
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err: unknown) {
    console.error("TTS cache read error:", err);
    res.status(500).json({ error: "Failed to fetch TTS audio" });
  }
});

// Bootstrap Vite middleware in Development OR serve Static Files in Production
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Bootstrap: Initializing Vite dev-server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Bootstrap: Serving static build files from dist/ directory...");
    const distPath = path.join(process.cwd(), "dist");
    // Cache policy (Cloudflare already applies brotli compression):
    //  - /assets/* are content-hashed by Vite -> cache forever.
    //  - Versioned content packs (/data), stroke data (/hanzi-data) and the
    //    dictionary trie are large and change only on deploys -> cache an
    //    hour at browsers/edge; IndexedDB keys carry the real versioning.
    //  - Everything else (index.html, manifest) stays revalidate-every-time.
    const distDataDir = path.join(distPath, "data");
    const distHanziDir = path.join(distPath, "hanzi-data");
    const assetsMarker = `${path.sep}assets${path.sep}`;
    app.use(express.static(distPath, {
      setHeaders(res: express.Response, filePath: string) {
        if (filePath.includes(assetsMarker)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (
          filePath.startsWith(distDataDir)
          || filePath.startsWith(distHanziDir)
          || path.basename(filePath) === "dictionary_trie.json"
        ) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      },
    }));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start full-stack server:", err);
  process.exit(1);
});
