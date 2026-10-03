import { debugLogger } from "../utils/debugLogger";
import { lookupPackMnemonic, fetchMemoryHooksMap } from './contentPacks';

/**
 * In-memory cache for mnemonics.
 * Key format: "word_<text>" for words, "<char>" for characters.
 * Mnemonics are pack-first (loaded from static packs) with in-memory caching.
 */
const mnemonicCache = new Map<string, string>();

export async function getCachedMnemonic(cacheKey: string): Promise<string | null> {
  if (mnemonicCache.has(cacheKey)) {
    const memory = mnemonicCache.get(cacheKey)!;
    debugLogger.info('Cache', `In-Memory hit for "${cacheKey}"`, { mnemonic: memory });
    return memory;
  }

  const fromPack = await lookupPackMnemonic(cacheKey);
  if (fromPack) {
    mnemonicCache.set(cacheKey, fromPack);
    debugLogger.info('Cache', `Static pack hit for "${cacheKey}"`, { mnemonic: fromPack });
    return fromPack;
  }

  return null;
}

export async function clearAllMnemonics(): Promise<void> {
  mnemonicCache.clear();
}

export async function fetchAllMnemonicsDebug(): Promise<{
  id: string;
  character: string;
  mnemonic: string;
  content_type: string;
  created_at: string;
}[]> {
  try {
    const map = await fetchMemoryHooksMap();
    if (!map) return [];
    return Array.from(map.entries()).map(([id, mnemonic]) => ({
      id,
      character: id.startsWith('word_') ? id.slice(5) : id,
      mnemonic: String(mnemonic),
      content_type: id.startsWith('word_') ? 'word' : 'character',
      created_at: new Date().toISOString(),
    }));
  } catch (error) {
    debugLogger.warn('Cache', "Could not fetch debug mnemonics from pack:", error);
    return [];
  }
}

export async function saveMnemonicToCache(cacheKey: string, mnemonic: string): Promise<void> {
  mnemonicCache.set(cacheKey, mnemonic);
}

/** Check whether a key exists in the in-memory cache. */
export function hasCachedMnemonic(cacheKey: string): boolean {
  return mnemonicCache.has(cacheKey);
}

export { getCachedMnemonic as getMnemonic, saveMnemonicToCache as saveMnemonic };
