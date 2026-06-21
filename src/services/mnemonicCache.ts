import { supabase } from "./supabaseClient";
import { debugLogger } from "../utils/debugLogger";

/**
 * In-memory LRU cache for mnemonics.
 * Key format: "word_<text>" for words, "<char>" for characters.
 */
const mnemonicCache = new Map<string, string>();

export async function clearAllMnemonics(): Promise<void> {
  try {
    debugLogger.info("Supabase", "Clearing all mnemonics from Supabase and Local Cache...");
    mnemonicCache.clear();
    const { error } = await supabase.from('mnemonics').delete().neq('id', '');
    if (error) throw error;
    debugLogger.info("Supabase", "Successfully cleared all mnemonics in Supabase cache!");
  } catch (error) {
    debugLogger.error("Supabase", "Failed to clear mnemonics cache", error);
    console.error("Failed to clear mnemonics cache:", error);
    throw error;
  }
}

export async function fetchAllMnemonicsDebug() {
  try {
    debugLogger.info("Supabase", "Fetching global mnemonics from Supabase for debug window...");
    const { data, error } = await supabase
      .from('mnemonics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const mnemonics = data || [];
    debugLogger.info("Supabase", `Loaded ${mnemonics.length} mnemonics from global cache.`);
    return mnemonics;
  } catch (error) {
    debugLogger.error("Supabase", "Could not fetch debug mnemonics from Supabase", error);
    console.warn("Could not fetch debug mnemonics:", error);
    return [];
  }
}

export async function getCachedMnemonic(cacheKey: string): Promise<string | null> {
  if (mnemonicCache.has(cacheKey)) {
    const memory = mnemonicCache.get(cacheKey)!;
    debugLogger.info("Cache", `In-Memory hit for "${cacheKey}"`, { mnemonic: memory });
    return memory;
  }
  try {
    debugLogger.info("Cache", `In-Memory miss for "${cacheKey}". Checking Supabase...`);
    const lookupText = cacheKey.startsWith('word_') ? cacheKey.slice(5) : cacheKey;
    const { data, error } = await supabase
      .from('mnemonics')
      .select('mnemonic')
      .eq('character', lookupText)
      .in('content_type', ['character', 'word', 'story'])
      .limit(1)
      .single();
    if (!error && data && data.mnemonic) {
      mnemonicCache.set(cacheKey, data.mnemonic);
      debugLogger.info("Supabase", `Supabase hit for "${cacheKey}"`, { mnemonic: data.mnemonic });
      return data.mnemonic;
    }
    debugLogger.info("Cache", `Supabase miss for "${cacheKey}". Ready to generate...`);
  } catch (error) {
    debugLogger.warn("Cache", `Failed checking cache/Supabase for "${cacheKey}"`, error);
    console.warn("Could not fetch from global cache:", error);
  }
  return null;
}

export async function saveMnemonicToCache(cacheKey: string, mnemonic: string): Promise<void> {
  mnemonicCache.set(cacheKey, mnemonic);
  try {
    debugLogger.info("Supabase", `Saving mnemonic for "${cacheKey}" to Supabase...`);
    const isWord = cacheKey.startsWith('word_');
    const content = isWord ? cacheKey.slice(5) : cacheKey;
    const { error } = await supabase.from('mnemonics').upsert({
      id: cacheKey,
      character: content,
      mnemonic,
      content_type: isWord ? 'word' : 'character',
    });
    if (error) throw error;
    debugLogger.info("Supabase", `Saved "${cacheKey}" mnemonic to global Supabase Cache.`);
  } catch (error) {
    debugLogger.error("Supabase", `Could not save mnemonic for "${cacheKey}" to Supabase`, error);
    console.warn("Could not save mnemonic to Supabase:", error);
  }
}

/** Check whether a key exists in the in-memory cache. */
export function hasCachedMnemonic(cacheKey: string): boolean {
  return mnemonicCache.has(cacheKey);
}