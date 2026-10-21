import { debugLogger } from '../utils/debug/debugLogger';
import { fetchDictionaryRowsFromPacks, fetchPartsIndex } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import { searchDictionaryIndex } from './dictionarySearchWorker';
import type { SearchResult } from '../utils/vocabulary/dictionarySearch';
import type { DBDictionaryRow } from '../types/database';

// Preserve the pure search API for callers and ranking/segmentation tests.
export { searchInIndex, searchByCharacterComponents, segmentPinyinQuery } from '../utils/vocabulary/dictionarySearch';
export type { SearchResult, CompactSearchEntry } from '../utils/vocabulary/dictionarySearch';

/** Exact shards and the worker run in parallel; the UI never parses or scans the full search index. */
export async function searchDictionaryOffline(searchQuery: string, resultLimit = 30): Promise<SearchResult[]> {
  const query = searchQuery.trim();
  if (!query || resultLimit <= 0) return [];
  const componentQuery = /^[\p{Script=Han}](?:[\s+＋]+[\p{Script=Han}])+$/u.test(query);
  const exactQuery = !componentQuery && /\p{Script=Han}/u.test(query) && !/[*?＊？a-zA-Z]/.test(query);
  const [packed, indexed] = await Promise.all([
    exactQuery ? fetchDictionaryRowsFromPacks([query]).catch(() => new Map<string, DBDictionaryRow[]>()) : Promise.resolve(new Map<string, DBDictionaryRow[]>()),
    (componentQuery ? fetchPartsIndex().catch(() => null) : Promise.resolve(null))
      .then((parts) => searchDictionaryIndex(query, resultLimit, parts))
      .catch((error) => { debugLogger.warn('Cache', 'Dictionary index search failed', error); return []; }),
  ]);
  const matches: SearchResult[] = (packed.get(query) ?? []).map((row) => {
    const sanitized = sanitizeDictionaryDefinitions(row.definitions);
    return {
      id: row.id, simplified: row.simplified, traditional: row.traditional || row.simplified,
      pinyin_accented: row.pinyin_accented || row.pinyin_flat || '',
      definitions: sanitized.definitions, measure_words: sanitized.measure_words,
      match_type: 'exact', total_score: 6200 + (row.frequency_score ?? 0),
    };
  });
  const seen = new Set(matches.flatMap((match) => [match.simplified, match.traditional]));
  for (const match of indexed) {
    if (seen.has(match.simplified) || seen.has(match.traditional)) continue;
    matches.push(match);
    seen.add(match.simplified);
    seen.add(match.traditional);
  }
  return matches.slice(0, resultLimit);
}
