import { supabase } from './supabaseClient';
import { DBDictionaryEntry } from '../types/database';
import { dictionaryCache, dictionarySearchCache } from '../utils/cache';

// Local Dictionary Trie Cache for O(1) synchronous word validation
let localDictionaryData: any[] | null = null;
let validWordsSet: Set<string> | null = null;
let loadingDictionaryPromise: Promise<void> | null = null;

export async function prefetchLocalDictionary(): Promise<void> {
  if (localDictionaryData) return;
  if (loadingDictionaryPromise) return loadingDictionaryPromise;

  loadingDictionaryPromise = fetch('/dictionary_trie.json')
    .then(async (res) => {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error('Fallback returning HTML instead of JSON trie');
      }
      if (!res.ok) throw new Error('File not found');
      return res.json();
    })
    .then((data) => {
      localDictionaryData = data;
      validWordsSet = new Set();
      // data format: [id, trad, simp, pinyin_flat, pinyin_acc, defs]
      for (const row of data) {
        if (row[1]) validWordsSet.add(row[1]);
        if (row[2]) validWordsSet.add(row[2]);
      }
    })
    .catch((err) => {
      console.warn("Could not prefetch local dictionary:", err);
    });

  return loadingDictionaryPromise;
}

export function getLocalDictionaryData(): any[] | null {
  return localDictionaryData;
}

/**
 * Returns true if word exists in local JSON, false if definitely not, and null if data boundary hasn't loaded yet.
 */
export function isValidChineseWordLocal(word: string): boolean | null {
  if (!validWordsSet) return null;
  return validWordsSet.has(word);
}

/**
 * Execute a remote dictionary search via the `search_dictionary` RPC.
 * Results are cached in the dictionary search cache.
 *
 * @param queryNormalized - The normalized (lowercased, trimmed) query
 * @returns Array of dictionary entries from the RPC
 */
export async function executeRemoteSearch(queryNormalized: string): Promise<any[]> {
  if (dictionarySearchCache.has(queryNormalized)) {
    return dictionarySearchCache.get<any[]>(queryNormalized) || [];
  }
  
  try {
    const { data, error } = await supabase.rpc('search_dictionary', {
      search_query: queryNormalized,
      result_limit: 30
    });
    if (error) throw error;
    
    if (data) {
       dictionarySearchCache.set(queryNormalized, data);
    }
    
    return data || [];
  } catch (err) {
    console.error('SuperSearch RPC Failed:', err);
    throw err;
  }
}

export async function getDictionaryEntries(word: string): Promise<DBDictionaryEntry[]> {

  if (!word || word.trim() === '') return [];

  const trimmedWord = word.trim();

  // 1. Check local cache
  if (dictionaryCache.has(trimmedWord)) {
    return dictionaryCache.get<DBDictionaryEntry[]>(trimmedWord) || [];
  }

  try {
    // 2. Query Supabase (search both simplified AND traditional columns)
    const { data, error } = await supabase
      .from('dictionary')
      .select('*')
      .or(`simplified.eq.${trimmedWord},traditional.eq.${trimmedWord}`);

    if (error) {
      console.error(`Supabase error fetching dictionary entry for ${trimmedWord}:`, error);
      return [];
    }

    // 3. Cache and return mapping to new schema
    const results = (data || []).map((row: any) => ({
      traditional: row.traditional,
      simplified: row.simplified,
      pinyin: [(row.pinyin_accented || row.pinyin_flat || '')],
      definitions: row.definitions
    })) as DBDictionaryEntry[];
    dictionaryCache.set(trimmedWord, results);
    return results;
  } catch (err) {
    console.error(`Unexpected error fetching dictionary entry for ${trimmedWord}:`, err);
    return [];
  }
}

export async function getDictionaryEntriesBatch(words: string[]): Promise<Map<string, DBDictionaryEntry>> {
  const result = new Map<string, DBDictionaryEntry>();
  if (!words || words.length === 0) return result;

  const toFetch: string[] = [];
  const uniqueWords = Array.from(new Set(words));
  
  // 1. Check cache first
  for (const word of uniqueWords) {
    const trimmed = word.trim();
    if (dictionaryCache.has(trimmed)) {
      const entries = dictionaryCache.get<DBDictionaryEntry[]>(trimmed) || [];
      if (entries.length > 0) {
        result.set(trimmed, entries[0]);
      }
    } else {
      toFetch.push(trimmed);
    }
  }

  if (toFetch.length === 0) return result;

  try {
    // 2. Fetch missing words in batches of up to 50, concurrently
    const chunkSize = 50;
    const fetchPromises = [];
    
    for (let i = 0; i < toFetch.length; i += chunkSize) {
      const chunk = toFetch.slice(i, i + chunkSize);
      const formattedChunk = chunk.map(w => `"${w.replace(/"/g, '\\"')}"`).join(',');
      fetchPromises.push(
        supabase
          .from('dictionary')
          .select('*')
          .or(`traditional.in.(${formattedChunk}),simplified.in.(${formattedChunk})`)
          .then(({ data, error }) => {
             if (error) {
               console.error(`Supabase error fetching dictionary entries:`, error);
               return null;
             }
             return { chunk, data };
          })
      );
    }
    
    const resultsArray = await Promise.all(fetchPromises);
    
    for (const res of resultsArray) {
      if (!res || !res.data) continue;
      const { chunk, data } = res;
      
      if (data) {
        // Cache them and map them
        for (const word of chunk) {
          const row = data.find(d => d.traditional === word || d.simplified === word);
          if (row) {
             const mappedEntry = {
                traditional: row.traditional,
                simplified: row.simplified,
                pinyin: [(row.pinyin_accented || row.pinyin_flat || '')],
                definitions: row.definitions
             };
            dictionaryCache.set(word, [mappedEntry as DBDictionaryEntry]);
            result.set(word, mappedEntry as DBDictionaryEntry);
          }
        }
      }
    }
    return result;
  } catch (err) {
    console.error(`Unexpected error fetching dictionary entries in batch:`, err);
    return result;
  }
}
