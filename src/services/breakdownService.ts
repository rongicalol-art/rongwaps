import { debugLogger } from '../utils/debugLogger';
import { DBCharacterBreakdown } from '../types/database';
import { breakdownCache } from '../utils/cache';
import { fetchBreakdownsFromPacks, fetchPartsIndex } from './contentPacks';
import { builtWith } from '../utils/parts';
import { getDictionaryEntries, getDictionaryEntriesBatch } from './dictionaryService';

const pendingRequests = new Map<string, Promise<DBCharacterBreakdown | null>>();

/**
 * Fetches a character breakdown pack-first, utilizing an in-memory cache
 * to prevent duplicate network calls. Falls back to dictionary entries.
 * 
 * @param character - A single Chinese character (e.g., '好')
 * @returns The breakdown data, or null if not found/error.
 */
export async function getCharacterBreakdown(character: string): Promise<DBCharacterBreakdown | null> {
  if (!character) return null;

  // 1. Check local memory cache first
  if (breakdownCache.has(character)) {
    return breakdownCache.get<DBCharacterBreakdown>(character) || null;
  }

  // 2. Check if there's already a request in flight for this character
  if (pendingRequests.has(character)) {
    return pendingRequests.get(character)!;
  }

  const fetchPromise = (async (): Promise<DBCharacterBreakdown | null> => {
    try {
      // 3. Static breakdown pack (IndexedDB-cached, zero network)
      const packedResults = await fetchBreakdownsFromPacks([character]);
      const packedData = packedResults[character];
      if (packedData) {
        breakdownCache.set(character, packedData);
        return packedData;
      }

      // 4. Fall back to dictionary if character is missing from breakdown dataset
      const dictEntries = await getDictionaryEntries(character);
      if (dictEntries && dictEntries.length > 0) {
        const dict = dictEntries[0];
        const pinyin = dict.pinyin?.[0]?.trim();
        const firstDef = Array.isArray(dict.definitions)
          ? dict.definitions[0]
          : typeof dict.definitions === 'string'
            ? dict.definitions
            : null;
        if (pinyin || firstDef) {
          const fallbackData: DBCharacterBreakdown = {
            character,
            radical: null,
            pinyin: pinyin ? [pinyin] : null,
            definition: firstDef || null,
            decomposition: null,
            components_historical: null,
          };
          breakdownCache.set(character, fallbackData);
          return fallbackData;
        }
      }

      return null;
    } catch (err) {
      debugLogger.warn('Cache', `Unexpected error fetching breakdown for ${character}:`, err);
      return null;
    } finally {
      pendingRequests.delete(character);
    }
  })();

  pendingRequests.set(character, fetchPromise);

  return fetchPromise;
}

/**
 * Characters built from a component ("used in" lists), from the static parts
 * index (instant, offline, IndexedDB-cached). Sound-alikes come first; empty
 * when the index is unavailable.
 */
export async function getCharactersUsingComponent(component: string): Promise<string[]> {
  const index = await fetchPartsIndex();
  return index ? builtWith(component, index).map((member) => member.character) : [];
}

export async function getMultipleBreakdowns(characters: string[]): Promise<Record<string, DBCharacterBreakdown>> {
  const results: Record<string, DBCharacterBreakdown> = {};
  const missingSet = new Set<string>();

  // Check cache first
  for (const char of characters) {
    if (breakdownCache.has(char)) {
      const cached = breakdownCache.get<DBCharacterBreakdown>(char);
      if (cached) results[char] = cached;
    } else {
      missingSet.add(char);
    }
  }

  const missingCharacters = Array.from(missingSet);

  if (missingCharacters.length === 0) {
    return results; // Everything was cached
  }

  // Fetch only the missing characters from static packs
  try {
    const packedResults = await fetchBreakdownsFromPacks(missingCharacters);
    for (const [character, breakdown] of Object.entries(packedResults)) {
      results[character] = breakdown;
      breakdownCache.set(character, breakdown);
    }

    // Fall back to dictionary for any characters missing from breakdown dataset
    const stillMissing = missingCharacters.filter((character) => !results[character]);
    if (stillMissing.length > 0) {
      try {
        const dictEntries = await getDictionaryEntriesBatch(stillMissing);
        for (const [char, dict] of dictEntries) {
          const pinyin = dict.pinyin?.[0]?.trim();
          const firstDef = Array.isArray(dict.definitions)
            ? dict.definitions[0]
            : typeof dict.definitions === 'string'
              ? dict.definitions
              : null;
          if (pinyin || firstDef) {
            const fallbackData: DBCharacterBreakdown = {
              character: char,
              radical: null,
              pinyin: pinyin ? [pinyin] : null,
              definition: firstDef || null,
              decomposition: null,
              components_historical: null,
            };
            results[char] = fallbackData;
            breakdownCache.set(char, fallbackData);
          }
        }
      } catch (err) {
        debugLogger.warn('Cache', 'Dictionary fallback failed in getMultipleBreakdowns:', err);
      }
    }
  } catch (err) {
    debugLogger.warn('Cache', 'Unexpected error fetching multiple breakdowns:', err);
  }

  return results;
}
