import { debugLogger } from '../utils/debugLogger';
import { DBDictionaryEntry, DBDictionaryEntryRow } from '../types/database';
import { dictionaryCache, dictionarySearchCache } from '../utils/cache';
import { sanitizeDictionaryDefinitions, extractCedictReference } from '../utils/dictionaryDefinitions';
import { fetchDictionaryRowsFromPacks } from './contentPacks';
import { searchDictionaryOffline } from './dictionarySearchService';

const remoteSearchPromises = new Map<string, Promise<unknown[]>>();

export interface DictionaryContainingWord {
  word: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definition: string;
}

/**
 * Resolves the underlying definition for a target word referenced by a CEDICT pointer.
 * Bounded by recursion depth (max 2 hops, e.g. 嫒 -> 令嫒 -> 令爱) and checks packs first.
 */
export async function resolveTargetMeaning(
  targetWord: string,
  visited: Set<string> = new Set(),
): Promise<string | null> {
  const trimmed = targetWord.trim();
  if (!trimmed || visited.has(trimmed) || visited.size >= 3) return null;
  visited.add(trimmed);

  let targetDefs: unknown;

  // 1. Check local cache
  if (dictionaryCache.has(trimmed)) {
    const cached = dictionaryCache.get<DBDictionaryEntry[]>(trimmed);
    if (cached && cached.length > 0 && cached[0].definitions) {
      targetDefs = cached[0].definitions;
    }
  }

  // 2. Static shard packs (offline, instant, pack-first)
  if (!targetDefs) {
    try {
      const packed = await fetchDictionaryRowsFromPacks([trimmed]);
      const rows = packed.get(trimmed);
      if (rows && rows.length > 0) {
        targetDefs = rows[0].definitions;
      }
    } catch {
      // pack miss or unavailable
    }
  }



  if (!targetDefs) return null;

  const sanitized = sanitizeDictionaryDefinitions(targetDefs).definitions;
  if (sanitized.length === 0) return null;

  const firstDef = sanitized[0];
  const ref = extractCedictReference(firstDef);
  if (ref) {
    const nextTarget = ref.simplified || ref.traditional;
    const resolvedNext = await resolveTargetMeaning(nextTarget, visited);
    if (resolvedNext) return resolvedNext;
  }

  return firstDef;
}

/**
 * Dereferences pure variant or bound-morpheme entries into learner-friendly definitions:
 * - "variant of 令愛|令爱[ling4 ai4]" → "(courteous) your daughter (variant of 令爱)"
 * - "used in 令嬡|令嫒[ling4 ai4]" → "used in 令嫒 (your daughter)"
 */
export async function dereferenceEntries(entries: DBDictionaryEntry[]): Promise<DBDictionaryEntry[]> {
  if (!entries || entries.length === 0) return entries;

  return Promise.all(
    entries.map(async (entry) => {
      const defs = Array.isArray(entry.definitions)
        ? entry.definitions
        : typeof entry.definitions === 'string'
          ? [entry.definitions]
          : [];

      if (defs.length === 0) return entry;

      const firstDef = defs[0];
      const ref = extractCedictReference(firstDef);
      if (!ref) return entry;

      const targetWord = ref.simplified || ref.traditional;
      const targetMeaning = await resolveTargetMeaning(targetWord);
      if (!targetMeaning) return entry;

      const relLower = ref.relation.toLowerCase();
      let combined: string;
      if (relLower.includes('variant of')) {
        const cleanTarget = targetMeaning.replace(/\s*\((?:old |archaic |popular )?variant of [^)]+\)/gi, '').trim();
        combined = `${cleanTarget} (${ref.relation} ${targetWord})`;
      } else if (relLower.includes('used in')) {
        const shortTarget = targetMeaning.replace(/^\([^)]+\)\s*/, '').replace(/\s*\([^)]+\)$/, '').trim();
        combined = `${ref.relation} ${targetWord} (${shortTarget})`;
      } else {
        combined = `${targetMeaning} (${ref.relation} ${targetWord})`;
      }

      return {
        ...entry,
        definitions: [combined, ...defs.slice(1)],
      };
    }),
  );
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
      // 1. Instant offline static search (zero network, works offline)
      const offlineResults = await searchDictionaryOffline(queryNormalized, 30);
      if (offlineResults && offlineResults.length > 0) {
        dictionarySearchCache.set(queryNormalized, offlineResults);
        return offlineResults;
      }

      return [];
    } catch (err) {
      debugLogger.warn('Cache', 'Dictionary search failed:', err);
      return [];
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
  } catch (error) {
    // Graceful degradation: remote dictionary search failed, return empty containing words
    debugLogger.warn('Supabase', `Failed to fetch words containing "${query}"`, error);
    return [];
  }

  const matches = new Map<string, DictionaryContainingWord>();
  for (const row of rows) {
    const match = mapContainingWord(row, query);
    if (match && !matches.has(match.word)) matches.set(match.word, match);
  }

  const results = [...matches.values()]
    .sort((a, b) => Array.from(a.word).length - Array.from(b.word).length || a.word.localeCompare(b.word))
    .slice(0, Math.max(0, limit));

  await Promise.all(
    results.map(async (item) => {
      const ref = extractCedictReference(item.definition);
      if (!ref) return;
      const targetWord = ref.simplified || ref.traditional;
      const targetMeaning = await resolveTargetMeaning(targetWord);
      if (!targetMeaning) return;

      const relLower = ref.relation.toLowerCase();
      if (relLower.includes('variant of')) {
        const cleanTarget = targetMeaning.replace(/\s*\((?:old |archaic |popular )?variant of [^)]+\)/gi, '').trim();
        item.definition = `${cleanTarget} (${ref.relation} ${targetWord})`;
      } else if (relLower.includes('used in')) {
        const shortTarget = targetMeaning.replace(/^\([^)]+\)\s*/, '').replace(/\s*\([^)]+\)$/, '').trim();
        item.definition = `${ref.relation} ${targetWord} (${shortTarget})`;
      } else {
        item.definition = `${targetMeaning} (${ref.relation} ${targetWord})`;
      }
    }),
  );

  return results;
}

function mapRowToEntry(row: DBDictionaryEntryRow): DBDictionaryEntry {
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
      const results = await dereferenceEntries(packedRows.map(mapRowToEntry));
      dictionaryCache.set(trimmedWord, results);
      return results;
    }

    return [];
  } catch (err) {
    debugLogger.warn('Cache', `Unexpected error fetching dictionary entry for ${trimmedWord}:`, err);
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

  // 2. Fetch from static shard packs for the missing words
  const packedRows = await fetchDictionaryRowsFromPacks(toFetch);
  for (const word of toFetch) {
    const rows = packedRows.get(word);
    if (rows && rows.length > 0) {
      const mapped = mapRowToEntry(rows[0]);
      const dereferenced = await dereferenceEntries([mapped]);
      const entry = dereferenced[0];
      dictionaryCache.set(word, [entry]);
      result.set(word, entry);
    }
  }

  return result;
}
