import { debugLogger } from "../utils/debugLogger";
import { hasCachedMnemonic, getCachedMnemonic } from "./mnemonicCache";
import { getOrGenerateMnemonic } from "./mnemonicGenerator";
import { supabase } from "./supabaseClient";

/** Characters/words queued for background pre-generation. */
const pendingPreGen = new Set<string>();
let preGenInProgress = false;

/**
 * Pre-generation hook: call this when entering a study session.
 * Fires background requests to ensure all characters/words have mnemonics in Supabase.
 * Non-blocking — returns immediately, generates in the background.
 *
 * For multi-character words, also extracts individual characters and queues them
 * so that character-level mnemonics are available when the user drills into
 * character breakdown overlays during study.
 */
export function preGenerateMnemonics(items: { text: string; pinyin?: string; definition?: string }[]): void {
  for (const item of items) {
    if (!item.text) continue;
    const isWord = item.text.length > 1;
    const cacheKey = isWord ? `word_${item.text}` : item.text;
    if (!hasCachedMnemonic(cacheKey)) {
      pendingPreGen.add(cacheKey);
    }
    if (isWord) {
      const chars = Array.from(item.text).filter(c => /[\u4e00-\u9fa5]/.test(c));
      for (const ch of chars) {
        if (!hasCachedMnemonic(ch)) {
          pendingPreGen.add(ch);
        }
      }
    }
  }
  if (!preGenInProgress && pendingPreGen.size > 0) {
    flushPreGenQueue().catch(err => {
      debugLogger.warn("Cache", "Background pre-generation error", err);
    });
  }
}

/**
 * Flush the pre-generation queue: generate mnemonics for all queued items.
 * Runs sequentially with delays to avoid rate limiting.
 */
async function flushPreGenQueue(): Promise<void> {
  if (preGenInProgress) return;
  preGenInProgress = true;
  debugLogger.info("Cache", `Starting background pre-generation for ${pendingPreGen.size} items...`);

  for (const cacheKey of pendingPreGen) {
    if (hasCachedMnemonic(cacheKey)) {
      pendingPreGen.delete(cacheKey);
      continue;
    }
    // Check Supabase first (another client may have generated it)
    try {
      const { data } = await supabase
        .from('mnemonics')
        .select('mnemonic')
        .eq('id', cacheKey)
        .single();
      if (data?.mnemonic) {
        // Save to in-memory cache (imported via mnemonicCache module)
        const { saveMnemonicToCache } = await import("./mnemonicCache");
        await saveMnemonicToCache(cacheKey, data.mnemonic);
        pendingPreGen.delete(cacheKey);
        continue;
      }
    } catch {
      // Not in DB, generate it
    }
    try {
      const isWord = cacheKey.startsWith('word_');
      const text = isWord ? cacheKey.slice(5) : cacheKey;
      await getOrGenerateMnemonic(text, '', '');
      debugLogger.info("Cache", `Pre-generated mnemonic for "${cacheKey}"`);
    } catch (err) {
      debugLogger.warn("Cache", `Failed to pre-generate "${cacheKey}"`, err);
    }
    pendingPreGen.delete(cacheKey);
    await new Promise(r => setTimeout(r, 400));
  }

  preGenInProgress = false;
  debugLogger.info("Cache", "Background pre-generation complete.");
}

/** Check how many items are pending pre-generation (for UI indicators). */
export function getPreGenPendingCount(): number {
  return pendingPreGen.size;
}