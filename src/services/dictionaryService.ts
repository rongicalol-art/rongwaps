import { supabase } from './supabaseClient';
import { DBDictionaryEntry, DBDictionaryRow } from '../types/database';
import { dictionaryCache, dictionarySearchCache } from '../utils/cache';
import { timeDataRequest } from '../utils/requestTiming';
import { sanitizeDictionaryDefinitions } from '../utils/dictionaryDefinitions';
import { fetchDictionaryRowsFromPacks } from './dictionaryPackService';

const DICTIONARY_COLUMNS = 'traditional,simplified,pinyin_accented,pinyin_flat,definitions,frequency_score,curriculum_level';

const remoteSearchPromises = new Map<string, Promise<unknown[]>>();

export interface DictionaryContainingWord {
  word: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definition: string;
}

/**
 * Execute a remote dictionary search via the `search_dictionary` RPC.
 * Results are cached in the dictionary search cache.
 *
 * @param queryNormalized - The normalized (lowercased, trimmed) query
 * @returns Array of dictionary entries from the RPC
 */
export async function executeRemoteSearch(queryNormalized: string): Promise<unknown[]> {
  if (dictionarySearchCache.has(queryNormalized)) {
    return dictionarySearchCache.get<unknown[]>(queryNormalized) || [];
  }

  if (remoteSearchPromises.has(queryNormalized)) {
    return remoteSearchPromises.get(queryNormalized)!;
  }

  const request = (async () => {
    try {
      const { data, error } = await timeDataRequest(
        'dictionary search',
        () => supabase.rpc('search_dictionary', {
          search_query: queryNormalized,
          result_limit: 30
        }),
      );
      if (error) throw error;

      if (data) dictionarySearchCache.set(queryNormalized, data);
      return data || [];
    } catch (err) {
      console.error('SuperSearch RPC Failed:', err);
      throw err;
    } finally {
      remoteSearchPromises.delete(queryNormalized);
    }
  })();

  remoteSearchPromises.set(queryNormalized, request);
  return request;
}

function mapContainingWord(row: unknown, character: string): DictionaryContainingWord | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const traditional = typeof record.traditional === 'string' ? record.traditional : '';
  const simplified = typeof record.simplified === 'string' ? record.simplified : traditional;
  const word = traditional.includes(character) ? traditional : simplified.includes(character) ? simplified : '';
  if (!word || word === character || Array.from(word).length < 2) return null;

  const pinyin = typeof record.pinyin_accented === 'string'
    ? record.pinyin_accented
    : typeof record.pinyin_flat === 'string'
      ? record.pinyin_flat
      : '';
  const definition = sanitizeDictionaryDefinitions(record.definitions).definitions[0] || '';
  return { word, traditional, simplified, pinyin, definition };
}

/**
 * Returns a bounded set of dictionary words containing a character, using the
 * server-side search (cached per query). The character breakdown view no longer
 * keeps a full local dictionary copy in memory.
 */
export async function searchDictionaryWordsContaining(
  character: string,
  limit = 30,
): Promise<DictionaryContainingWord[]> {
  const query = character.trim();
  if (Array.from(query).length !== 1) return [];

  let rows: unknown[];
  try {
    rows = await executeRemoteSearch(query.toLowerCase());
  } catch {
    return [];
  }

  const matches = new Map<string, DictionaryContainingWord>();
  for (const row of rows) {
    const match = mapContainingWord(row, query);
    if (match && !matches.has(match.word)) matches.set(match.word, match);
  }

  return [...matches.values()]
    .sort((a, b) => Array.from(a.word).length - Array.from(b.word).length || a.word.localeCompare(b.word))
    .slice(0, Math.max(0, limit));
}

function mapRowToEntry(row: DBDictionaryRow): DBDictionaryEntry {
  return {
    traditional: row.traditional,
    simplified: row.simplified,
    pinyin: [(row.pinyin_accented || row.pinyin_flat || '')],
    definitions: row.definitions,
    frequency_score: row.frequency_score,
    curriculum_level: row.curriculum_level,
  };
}

export async function getDictionaryEntries(word: string): Promise<DBDictionaryEntry[]> {

  if (!word || word.trim() === '') return [];

  const trimmedWord = word.trim();

  // 1. Check local cache
  if (dictionaryCache.has(trimmedWord)) {
    return dictionaryCache.get<DBDictionaryEntry[]>(trimmedWord) || [];
  }

  try {
    // 2. Prefer the static shard packs (IndexedDB-cached, zero network)
    const packed = await fetchDictionaryRowsFromPacks([trimmedWord]);
    const packedRows = packed.get(trimmedWord);
    if (packedRows && packedRows.length > 0) {
      const results = packedRows.map(mapRowToEntry);
      dictionaryCache.set(trimmedWord, results);
      return results;
    }

    // 3. Fall back to Supabase (search both simplified AND traditional columns)
    const { data, error } = await timeDataRequest(
      'dictionary exact lookup',
      () => supabase
        .from('dictionary')
        .select(DICTIONARY_COLUMNS)
        .or(`simplified.eq.${trimmedWord},traditional.eq.${trimmedWord}`),
    );

    if (error) {
      console.error(`Supabase error fetching dictionary entry for ${trimmedWord}:`, error);
      return [];
    }

    // 4. Cache and return
    const rows = (data || []) as DBDictionaryRow[];
    const results = rows.map(mapRowToEntry);
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

  // 2. Prefer the static shard packs for the missing words (bounded batch)
  const packedRows = await fetchDictionaryRowsFromPacks(toFetch);
  const dbWords: string[] = [];
  for (const word of toFetch) {
    const rows = packedRows.get(word);
    if (rows && rows.length > 0) {
      const entry = mapRowToEntry(rows[0]);
      dictionaryCache.set(word, [entry]);
      result.set(word, entry);
    } else {
      dbWords.push(word);
    }
  }

  // 3. Fetch remaining words from Supabase in batches of up to 50, concurrently
  const chunkSize = 50;
  const fetchPromises = [];
  
  for (let i = 0; i < dbWords.length; i += chunkSize) {
    const chunk = dbWords.slice(i, i + chunkSize);
    const formattedChunk = chunk.map(w => `"${w.replace(/"/g, '\\"')}"`).join(',');
    fetchPromises.push(
      timeDataRequest(
        `dictionary batch (${chunk.length} words)`,
        () => supabase
          .from('dictionary')
          .select(DICTIONARY_COLUMNS)
          .or(`traditional.in.(${formattedChunk}),simplified.in.(${formattedChunk})`),
      )
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
          const mappedEntry = mapRowToEntry(row);
          dictionaryCache.set(word, [mappedEntry]);
          result.set(word, mappedEntry);
        }
      }
    }
  }
  return result;
}
