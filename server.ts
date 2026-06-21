import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { pregeneratedWordMnemonics, pregeneratedCharMnemonics } from "./src/data/pregeneratedMnemonics.js";
import { supabase } from "./src/services/supabaseClient.js";

// Load .env into process.env so server-side code can read GEMINI_API_KEY
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
app.post("/api/generate-mnemonic", async (req: express.Request, res: express.Response) => {
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

    const { char, word, pinyin, definition, components, charactersInfo } = req.body;

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
        charactersDetails = charactersInfo.map((c: any) => {
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
        componentsInfo = components.map((c: any) => {
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
  } catch (error: any) {
    console.error("Backend Error /api/generate-mnemonic:", error);
    if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("exceeded")) {
      return res.status(200).json({ mnemonic: "Generating online failed (Quota Over). Consider contributing to the local pre-generated dictionary file!" });
    }
    res.status(500).json({ error: error.message || "Failed to generate mnemonic" });
  }
});

// ─── Audio proxy endpoint (bypasses CORS for Safari) ──────────────────
// GET /api/audio/:filename — downloads from Supabase Storage and streams to client
app.get("/api/audio/*", async (req: express.Request, res: express.Response) => {
  try {
    const fileName = req.params[0];
    if (!fileName) {
      return res.status(400).json({ error: "Missing filename" });
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
  } catch (err: any) {
    console.error("Audio proxy error:", err);
    res.status(500).json({ error: "Failed to fetch audio" });
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
