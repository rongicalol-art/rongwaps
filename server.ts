import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { pregeneratedWordMnemonics, pregeneratedCharMnemonics } from "./src/data/pregeneratedMnemonics.js";
import { supabase } from "./src/services/supabaseClient.js";

// Load .env into process.env so server-side code can read GEMINI_API_KEY
dotenv.config();

const app = express();
const PORT = 3000;

interface MnemonicPart {
  char: string;
  definition?: string;
}

interface GenerateMnemonicBody {
  char?: string;
  word?: string;
  definition?: string;
  components?: MnemonicPart[];
  charactersInfo?: MnemonicPart[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return typeof error.message === 'string' ? error.message : '';
  }
  return typeof error === 'string' ? error : '';
}

function getErrorStatus(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'status' in error
    ? error.status
    : undefined;
}

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
  limit: 10, // Gemini generation + Edge TTS synthesis costs money per call
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

// Initialize Google Gen AI client with server-side API Key
const apiKey = process.env.CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY;
const aiClient = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Ensure we fail-safely or lazily report if API key is not present when requested
function getAIClient() {
  if (!aiClient) {
    throw new Error("GEMINI_API_KEY environment variable is required server-side.");
  }
  return aiClient;
}

// ─── Single mnemonic generation endpoint ───────────────────────────────
// Handles both characters and words.
// Body: { char?, word?, pinyin?, definition?, components?, charactersInfo? }
// Response: { mnemonic, usage }
app.post("/api/generate-mnemonic", paidApiLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization token." });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized request." });
    }

    const { char, word, definition, components, charactersInfo } = req.body as GenerateMnemonicBody;

    // Determine mode: word or character
    const isWord = !!word;
    const text = isWord ? word : char;

    if (!text) {
      return res.status(400).json({ error: "Missing 'char' or 'word' in request body" });
    }

    // Check local pregenerated map first (saves API quota)
    if (isWord && pregeneratedWordMnemonics[text]) {
      console.log(`Using pre-generated mnemonic for word: ${text}`);
      return res.json({ mnemonic: pregeneratedWordMnemonics[text] });
    }
    if (!isWord && pregeneratedCharMnemonics[text]) {
      console.log(`Using pre-generated mnemonic for char: ${text}`);
      return res.json({ mnemonic: pregeneratedCharMnemonics[text] });
    }

    const ai = getAIClient();
    const model = "gemini-2.5-flash-lite";

    let prompt: string;
    let systemInstruction: string;

    if (isWord) {
      // ── Word mnemonic ───────────────────────────────────────────────
      let charactersDetails = "";
      if (charactersInfo && charactersInfo.length > 0) {
        charactersDetails = charactersInfo.map((c) => {
          const shortDef = (c.definition || "unknown").split(/[;,/]/)[0].trim();
          return `${c.char}/${shortDef}`;
        }).join(", ");
      }

      const shortDef = definition ? definition.split(/[;,/]/)[0].trim() : "";
      prompt = `${text} | ${shortDef} | ${charactersDetails}`;

      systemInstruction = `Write a 1-sentence mnemonic for this Chinese word. Rules:
1. Create a memory bridge connecting the Parts to explain the Meaning.
2. You MUST bold every part's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY part mentioned.
3. End with: ", so together means **[Mean]** ([Word])."
Example: A **mouth** (口) **begging** (乞) for food, so together means **to eat** (吃).`;
    } else {
      // ── Character mnemonic ──────────────────────────────────────────
      let componentsInfo = "";
      if (components && components.length > 0) {
        componentsInfo = components.map((c) => {
          const shortDef = (c.definition || "unknown").split(/[;,/]/)[0].trim();
          return `${c.char}/${shortDef}`;
        }).join(", ");
      }

      const shortDef = definition ? definition.split(/[;,/]/)[0].trim() : "";
      prompt = `${text} | ${shortDef} | ${componentsInfo}`;

      if (components && components.length > 1) {
        systemInstruction = `Write a 1-sentence mnemonic for this Chinese character. Rules:
1. Create a memory bridge connecting the Parts to explain the Meaning.
2. You MUST bold every part's English meaning and write its Chinese character in parentheses: **meaning** (character). Bold EVERY part mentioned.
3. End with: ", so this character means **[Mean]** ([Char])."
Example: A **person** (亻) resting against a **tree** (木), so this character means **to rest** (休).`;
      } else {
        systemInstruction = `Write a 1-sentence origin/visual mnemonic for this Chinese character. Rules:
1. Explain how the visual shape or origin relates to its meaning.
2. Bold the core English meaning: **meaning**.
3. End with: ", so this character means **[Mean]** ([Char])."
Example: Three drops of water flowing downward, so this character means **water** (水).`;
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction, temperature: 0.2 }
    });

    const usage = response.usageMetadata;
    console.log(`[Token Usage] ${isWord ? 'Word' : 'Char'}: "${text}", Prompt: ${usage?.promptTokenCount}, Output: ${usage?.candidatesTokenCount}, Total: ${usage?.totalTokenCount}`);

    const resultText = response.text?.trim() || "Could not generate a mnemonic at this time.";
    res.json({ mnemonic: resultText, usage });
  } catch (error: unknown) {
    console.error("Backend Error /api/generate-mnemonic:", error);
    const message = getErrorMessage(error);
    if (getErrorStatus(error) === "RESOURCE_EXHAUSTED" || message.includes("exceeded")) {
      return res.status(200).json({ mnemonic: "Generating online failed (Quota Over). Consider contributing to the local pre-generated dictionary file!" });
    }
    res.status(500).json({ error: message || "Failed to generate mnemonic" });
  }
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

async function synthesizeNeural(text: string, voiceName: string): Promise<Buffer> {
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
    // under tts/, while upsert (INSERT ... ON CONFLICT DO UPDATE) requires an
    // UPDATE policy that anon lacks — so upserts 403 and the cache never lands.
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

app.post("/api/tts", paidApiLimiter, async (req: express.Request, res: express.Response) => {
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
    app.use(express.static(distPath));
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