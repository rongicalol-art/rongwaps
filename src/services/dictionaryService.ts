import { debugLogger } from '../utils/debug/debugLogger';
import { DBDictionaryEntry, DBDictionaryEntryRow } from '../types/database';
import { dictionaryCache, dictionarySearchCache } from '../utils/cache';
import { sanitizeDictionaryDefinitions, extractCedictReference } from '../utils/vocabulary/dictionaryDefinitions';
import { fetchDictionaryRowsFromPacks, fetchPronunciationIndex, getLoadedStudyCards } from './contentPacks';
import { rankExactRows } from '../utils/vocabulary/dictionarySearch';
import { courseWordOf, linkCourseReadings, orderReadingKeys, readingKey } from '../utils/vocabulary/wordEntry';
import { allReadings } from '../utils/pinyin/pronunciation';
import type { DBDictionaryRow } from '../types/database';

const remoteSearchPromises = new Map<string, Promise<unknown[]>>();
const searchListeners = new Map<string, Set<(results: unknown[]) => void>>();

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
  pinyin?: string,
): Promise<string | null> {
  const trimmed = targetWord.trim();
  if (!trimmed || visited.has(trimmed) || visited.size >= 3) return null;
  visited.add(trimmed);

  // "variant of 合[he2]" means 合 hé, not 合 gě "100 ml": follow the bracketed reading when there is one.
  const target = readingKey(pinyin);
  let targetDefs: unknown;
  const cached = dictionaryCache.get<DBDictionaryEntry[]>(trimmed);
  if (cached && cached.length > 0) {
    targetDefs = ((target && cached.find((entry) => readingKey(entry.pinyin?.[0]) === target)) || cached[0]).definitions;
  }
  if (!targetDefs) try {
    const packed = await fetchDictionaryRowsFromPacks([trimmed]);
    const rows = await orderWordRows(trimmed, packed.get(trimmed) ?? []);
    const byReading = target ? rows.filter((item) => readingKey(item.pinyin_accented) === target) : [];
    const row = byReading.find((item) => item.traditional === trimmed) ?? byReading[0] ?? rows[0];
    targetDefs = row?.definitions;
  } catch {
    // pack miss or unavailable
  }

  if (!targetDefs) return null;

  const sanitized = sanitizeDictionaryDefinitions(targetDefs).definitions;
  if (sanitized.length === 0) return null;

  const firstDef = sanitized[0];
  const ref = extractCedictReference(firstDef);
  if (ref) {
    const resolvedNext = await resolveTargetMeaning(ref.simplified || ref.traditional, visited, ref.pinyin);
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
      const targetMeaning = await resolveTargetMeaning(targetWord, undefined, ref.pinyin);
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
 * Execute a remote dictionary search through the authenticated dictionary API.
 * Results are cached in the dictionary search cache.
 *
 * @param queryNormalized - The normalized (lowercased, trimmed) query
 * @returns Array of dictionary entries from the API
 */
export async function executeRemoteSearch(queryNormalized: string, onResults?: (results: unknown[]) => void): Promise<unknown[]> {
  if (dictionarySearchCache.has(queryNormalized)) {
    return dictionarySearchCache.get<unknown[]>(queryNormalized) || [];
  }

  if (onResults) {
    if (!searchListeners.has(queryNormalized)) searchListeners.set(queryNormalized, new Set());
    searchListeners.get(queryNormalized)!.add(onResults);
  }
  if (remoteSearchPromises.has(queryNormalized)) return remoteSearchPromises.get(queryNormalized)!;

  const request = (async () => {
    try {
      // Warm lesson entries publish while the authenticated search completes.
      const { searchDictionary } = await import('./dictionarySearchService');
      const offlineResults = await searchDictionary(queryNormalized, 30, (rows) => {
        for (const listener of searchListeners.get(queryNormalized) ?? []) listener(rows);
      });
      if (offlineResults && offlineResults.length > 0) {
        dictionarySearchCache.set(queryNormalized, offlineResults);
        return offlineResults;
      }

      return [];
    } catch (err) {
      debugLogger.warn('Cache', 'Dictionary search failed:', err);
      throw err;
    } finally {
      remoteSearchPromises.delete(queryNormalized);
      searchListeners.delete(queryNormalized);
    }
  })();

  remoteSearchPromises.set(queryNormalized, request);
  return request;
}

function mapContainingWord(row: unknown, text: string): DictionaryContainingWord | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const traditional = typeof record.traditional === 'string' ? record.traditional : '';
  const simplified = typeof record.simplified === 'string' ? record.simplified : traditional;
  const word = traditional.includes(text) ? traditional : simplified.includes(text) ? simplified : '';
  if (!word || word === text || Array.from(word).length < 2) return null;

  const pinyin = typeof record.pinyin_accented === 'string'
    ? record.pinyin_accented
    : typeof record.pinyin_flat === 'string'
      ? record.pinyin_flat
      : '';
  const definition = sanitizeDictionaryDefinitions(record.definitions).definitions[0] || '';
  return { word, traditional, simplified, pinyin, definition };
}

/**
 * Returns a bounded set of dictionary words containing a character, or a whole
 * word (行李 → 行李箱), using the server-side search (cached per query). The
 * character breakdown view no longer keeps a full local dictionary copy in memory.
 */
export async function searchDictionaryWordsContaining(
  text: string,
  limit = 30,
): Promise<DictionaryContainingWord[]> {
  const query = text.trim();
  if (!query) return [];

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
    // Shorter words first; within a length the search's own order (common words first), never code-point order.
    .sort((a, b) => Array.from(a.word).length - Array.from(b.word).length)
    .slice(0, Math.max(0, limit));

  await Promise.all(
    results.map(async (item) => {
      const ref = extractCedictReference(item.definition);
      if (!ref) return;
      const targetWord = ref.simplified || ref.traditional;
      const targetMeaning = await resolveTargetMeaning(targetWord, undefined, ref.pinyin);
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

/**
 * A word's dictionary rows, best first: its own readings in display order
 * (course lessons, then the Taiwan order), then other spellings that share
 * its simplified form (stubs dropped). Callers that read `rows[0]` get the
 * reading a learner expects (嗎 ma, not má; 和, not 咊).
 */
export async function orderWordRows<T extends DBDictionaryRow>(word: string, rows: readonly T[]): Promise<T[]> {
  if (rows.length < 2) return [...rows];
  const own = rows.filter((row) => row.traditional === word);
  const taiwan = Array.from(word).length === 1
    ? allReadings(word, await fetchPronunciationIndex().catch(() => null)).map((reading) => reading.pinyin)
    : [];
  const links = linkCourseReadings(own, getLoadedStudyCards().filter((card) => courseWordOf(card) === word));
  const order = orderReadingKeys(own, links, taiwan);
  return rankExactRows(rows, word, (row) => (row.traditional === word ? -order.indexOf(readingKey(row.pinyin_accented)) : undefined));
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
    const packedRows = await orderWordRows(trimmedWord, packed.get(trimmedWord) ?? []);
    const results = packedRows.length > 0 ? await dereferenceEntries(packedRows.map(mapRowToEntry)) : [];
    dictionaryCache.set(trimmedWord, results);
    return results;
  } catch (err) {
    debugLogger.warn('Cache', `Unexpected error fetching dictionary entry for ${trimmedWord}:`, err);
    return [];
  }
}

export async function getDictionaryEntriesBatch(words: string[], signal?: AbortSignal): Promise<Map<string, DBDictionaryEntry>> {
  signal?.throwIfAborted();
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
  const packedRows = await fetchDictionaryRowsFromPacks(toFetch, signal);
  await Promise.all(toFetch.map(async (word) => {
    signal?.throwIfAborted();
    const rows = await orderWordRows(word, packedRows.get(word) ?? []);
    signal?.throwIfAborted();
    if (rows.length > 0) {
      const dereferenced = await dereferenceEntries(rows.map(mapRowToEntry));
      signal?.throwIfAborted();
      dictionaryCache.set(word, dereferenced);
      result.set(word, dereferenced[0]);
    } else {
      dictionaryCache.set(word, []);
    }
  }));

  return result;
}
