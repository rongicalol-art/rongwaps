import { DBCharacterBreakdown } from "../types/database";
import { getMultipleBreakdowns } from "./breakdownService";
import { supabase } from "./supabaseClient";
import { cleanVocabText } from "../utils/vocabCleaner";
import { debugLogger } from "../utils/debugLogger";
import { getCachedMnemonic, saveMnemonicToCache } from "./mnemonicCache";

/** Shared helper: POST to /api/generate-mnemonic */
async function callGenerateAPI(params: {
  word?: string;
  char?: string;
  pinyin?: string;
  definition?: string;
  components?: { char: string; definition?: string; pinyin?: string }[];
  charactersInfo?: { char: string; pinyin?: string; definition?: string }[];
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch("/api/generate-mnemonic", {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errData = await response.json();
      if (errData?.error) errorMessage = errData.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to generate mnemonic: ${errorMessage}`);
  }
  const data = await response.json();
  return data.mnemonic || "Could not generate a mnemonic at this time.";
}

export async function generateWordMnemonic(
  word: string,
  pinyin: string,
  definition: string,
  charactersInfo: { char: string; pinyin?: string; definition?: string }[],
  forceRegenerate: boolean = false
): Promise<string> {
  const cacheKey = `word_${word}`;
  if (!forceRegenerate) {
    const cached = await getCachedMnemonic(cacheKey);
    if (cached) return cached;
  }
  let attempt = 0;
  const maxAttempts = 2;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      debugLogger.info("AI", `Generating mnemonic for Word: "${word}" (${pinyin}) [Attempt ${attempt}]...`, { definition, components: charactersInfo });
      const resultText = await callGenerateAPI({ word, pinyin, definition, charactersInfo });
      debugLogger.info("AI", `Successfully generated word mnemonic for "${word}"`, { response: resultText });
      if (resultText && !resultText.includes("Could not generate")) {
        await saveMnemonicToCache(cacheKey, resultText);
      }
      return resultText;
    } catch (error) {
      debugLogger.error("AI", `Error generating word mnemonic for "${word}" (Attempt ${attempt})`, error);
      console.error("Error generating word mnemonic:", error);
      if (attempt >= maxAttempts) throw error;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  return "Could not generate memory hook at this time.";
}

export async function generateMnemonic(
  char: string,
  breakdown: DBCharacterBreakdown | null,
  components: { char: string; definition?: string; pinyin?: string }[],
  forceRegenerate: boolean = false
): Promise<string> {
  if (!forceRegenerate) {
    const cached = await getCachedMnemonic(char);
    if (cached) return cached;
  }
  let attempt = 0;
  const maxAttempts = 2;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      debugLogger.info("AI", `Generating memory hook for Character: "${char}" [Attempt ${attempt}]`, { breakdown, components });
      const resultText = await callGenerateAPI({
        char,
        definition: breakdown?.definition || "",
        components,
      });
      debugLogger.info("AI", `Successfully generated memory hook for "${char}"`, { response: resultText });
      if (resultText && !resultText.includes("Could not generate")) {
        await saveMnemonicToCache(char, resultText);
      }
      return resultText;
    } catch (error) {
      debugLogger.error("AI", `Error generating memory hook for "${char}" (Attempt ${attempt})`, error);
      console.error("Error generating mnemonic:", error);
      if (attempt >= maxAttempts) throw error;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  return "Could not generate memory hook at this time.";
}

export async function getOrGenerateMnemonic(
  text: string,
  pinyin: string = "",
  definition: string = "",
  forceRegenerate: boolean = false
): Promise<string> {
  if (!text) return "";
  const cleanedText = cleanVocabText(text);
  if (!cleanedText) return "";
  const isWord = cleanedText.length > 1;
  const cacheKey = isWord ? `word_${cleanedText}` : cleanedText;

  if (!forceRegenerate) {
    const cached = await getCachedMnemonic(cacheKey);
    if (cached) return cached;
  }

  if (isWord) {
    try {
      const chars = Array.from(cleanedText).filter(c => /[\u4e00-\u9fa5]/.test(c as string)) as string[];
      let charactersInfo: any[] = [];
      try {
        const breakdowns = await getMultipleBreakdowns(chars);
        charactersInfo = chars.map(c => ({
          char: c,
          pinyin: breakdowns[c]?.pinyin?.[0] || "",
          definition: breakdowns[c]?.definition || ""
        }));
      } catch (err) {
        console.error("Failed to fetch character breakdowns for word mnemonic:", err);
      }
      return await generateWordMnemonic(cleanedText, pinyin, definition, charactersInfo, forceRegenerate);
    } catch (err) {
      console.error("Failed to generate word mnemonic inline:", err);
      return "Could not generate memory hook at this time.";
    }
  } else {
    try {
      let breakdown: any = null;
      let components: any[] = [];
      try {
        const breakdowns = await getMultipleBreakdowns([cleanedText]);
        const b = breakdowns[cleanedText];
        if (b) {
          breakdown = {
            id: cleanedText,
            pinyin: b.pinyin,
            definition: b.definition,
            decomposition: b.decomposition
          };
          const subChars = Array.from(b.decomposition || "").filter(c => /[\u4e00-\u9fa5]/.test(c as string)) as string[];
          if (subChars.length > 0) {
            const subBreakdowns = await getMultipleBreakdowns(subChars);
            components = subChars.map(sc => ({
              char: sc,
              pinyin: subBreakdowns[sc]?.pinyin?.[0] || "",
              definition: subBreakdowns[sc]?.definition || ""
            }));
          }
        }
      } catch (err) {
        console.error("Failed fetching character break down info:", err);
      }
      return await generateMnemonic(cleanedText, breakdown, components, forceRegenerate);
    } catch (err) {
      console.error("Failed to generate character mnemonic inline:", err);
      return "Could not generate memory hook at this time.";
    }
  }
}