import { supabase } from './supabaseClient';
import { DBCharacterBreakdown } from '../types/database';
import { breakdownCache, AppCache } from '../utils/cache';

const pendingRequests = new Map<string, Promise<DBCharacterBreakdown | null>>();

/**
 * Fetches a character breakdown from Supabase, utilizing an in-memory cache
 * to prevent duplicate network calls.
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

  let resolvePromise: (value: DBCharacterBreakdown | null) => void;
  const fetchPromise = new Promise<DBCharacterBreakdown | null>((resolve) => {
    resolvePromise = resolve;
  });

  pendingRequests.set(character, fetchPromise);

  (async () => {
    try {
      // 3. Query Supabase
      const { data, error } = await supabase
        .from('character_breakdowns_v2')
        .select('*')
        .eq('character', character)
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 = No rows found (which is fine, not a critical error)
          console.error(`Supabase error fetching breakdown for ${character}:`, error);
        }
        resolvePromise(null);
        return;
      }

      // 4. Cache and return
      if (data) {
        breakdownCache.set(character, data);
        resolvePromise(data as DBCharacterBreakdown);
        return;
      }

      resolvePromise(null);
    } catch (err) {
      console.error(`Unexpected error fetching breakdown for ${character}:`, err);
      resolvePromise(null);
    } finally {
      pendingRequests.delete(character);
    }
  })();

  return fetchPromise;
}

export const usedAsCache = new AppCache(500);

/**
 * Fetches multiple character breakdowns simultaneously.
 * Ideal for preparing a whole word or sentence at once.
 */
export async function getCharactersUsingComponent(component: string): Promise<string[]> {
  if (usedAsCache.has(component)) {
    return usedAsCache.get<string[]>(component) || [];
  }

  try {
    const results = new Set<string>();
    const visited = new Set<string>([component]);
    let currentLevel = [component];

    // Limit search depth to 1 to prevent excessive queries and slow load times.
    for (let depth = 0; depth < 1; depth++) {
      if (currentLevel.length === 0) break;

      // Group into batches of 30 items to keep OR queries within standard limits
      const batches: string[][] = [];
      for (let i = 0; i < currentLevel.length; i += 30) {
        batches.push(currentLevel.slice(i, i + 30));
      }

      const nextLevel: string[] = [];

      for (const batch of batches) {
        const orFilter = batch.map(c => `decomposition.like.%${c}%`).join(',');
        
        const { data, error } = await supabase
          .from('character_breakdowns_v2')
          .select('character')
          .or(orFilter)
          .limit(2000);

        if (error) {
          console.error("Error in getCharactersUsingComponent batch:", error);
          continue;
        }

        if (data) {
          for (const row of data) {
            const char = row.character;
            if (!visited.has(char)) {
              visited.add(char);
              results.add(char);
              nextLevel.push(char);
            }
          }
        }
      }

      currentLevel = nextLevel;
    }

    const finalResults = Array.from(results);
    usedAsCache.set(component, finalResults);
    return finalResults;
  } catch (err) {
    console.error("Error in getCharactersUsingComponent recursive lookup:", err);
    return [];
  }
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

  // Fetch only the missing characters in concurrent chunks
  try {
    const chunkSize = 100;
    const fetchPromises = [];
    
    for (let i = 0; i < missingCharacters.length; i += chunkSize) {
      const chunk = missingCharacters.slice(i, i + chunkSize);
      fetchPromises.push(
        supabase
          .from('character_breakdowns_v2')
          .select('*')
          .in('character', chunk)
      );
    }
    
    const resultsArray = await Promise.all(fetchPromises);
    
    for (const res of resultsArray) {
      if (res.error) {
        console.error('Error fetching multiple breakdowns chunk:', res.error);
        continue;
      }
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach(item => {
          const charData = item as DBCharacterBreakdown;
          results[charData.character] = charData;
          breakdownCache.set(charData.character, charData);
        });
      }
    }
  } catch (err) {
    console.error('Unexpected error fetching multiple breakdowns:', err);
  }

  return results;
}
