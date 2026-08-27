import { supabase } from "./supabaseClient";
import { debugLogger } from "../utils/debugLogger";

/**
 * In-memory LRU-ish cache for mnemonics.
 * Key format: "word_<text>" for words, "<char>" for characters.
 *
 * Reads are micro-batched: lookups requested in the same tick (e.g. several
 * characters of one flashcard) flush as a single `IN (...)` query instead of
 * one round trip per character.
 */
const mnemonicCache = new Map<string, string>();
const pendingKeys = new Set<string>();
const pendingResolvers = new Map<string, (value: string | null) => void>();
const inFlight = new Map<string, Promise<string | null>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function cacheKeyToCharacter(cacheKey: string): string {
  return cacheKey.startsWith('word_') ? cacheKey.slice(5) : cacheKey;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingLookups();
  }, 0);
}

async function flushPendingLookups(): Promise<void> {
  const keys = Array.from(pendingKeys);
  pendingKeys.clear();
  if (keys.length === 0) return;

  const lookupCharacters = Array.from(new Set(keys.map(cacheKeyToCharacter)));

  try {
    const { data, error } = await supabase
      .from('mnemonics')
      .select('character, mnemonic')
      .in('character', lookupCharacters)
      .or('content_type.is.null,content_type.in.(character,word,story)')
      .order('created_at', { ascending: false })
      .limit(500);

    const byCharacter = new Map<string, string>();
    if (!error && data) {
      for (const row of data) {
        if (row.mnemonic && !byCharacter.has(row.character)) {
          byCharacter.set(row.character, row.mnemonic);
        }
      }
    }
    if (error) {
      debugLogger.warn('Cache', 'Supabase batch error', { error: error.message, code: error.code });
    }

    for (const key of keys) {
      const text = byCharacter.get(cacheKeyToCharacter(key)) ?? null;
      if (text) mnemonicCache.set(key, text);
      pendingResolvers.get(key)?.(text);
      pendingResolvers.delete(key);
      inFlight.delete(key);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    debugLogger.warn('Cache', 'Supabase batch lookup failed', { error: message });
    console.warn('Could not fetch mnemonics from global cache:', message);
    for (const key of keys) {
      pendingResolvers.get(key)?.(null);
      pendingResolvers.delete(key);
      inFlight.delete(key);
    }
  }
}

export async function getCachedMnemonic(cacheKey: string): Promise<string | null> {
  if (mnemonicCache.has(cacheKey)) {
    const memory = mnemonicCache.get(cacheKey)!;
    debugLogger.info('Cache', `In-Memory hit for "${cacheKey}"`, { mnemonic: memory });
    return memory;
  }

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = new Promise<string | null>((resolve) => {
    pendingResolvers.set(cacheKey, resolve);
  });
  inFlight.set(cacheKey, promise);
  pendingKeys.add(cacheKey);
  scheduleFlush();
  return promise;
}

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
