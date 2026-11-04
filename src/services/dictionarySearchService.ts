import { searchDictionaryApi } from './dictionaryApi';
import { searchCommonWords } from './dictionaryCommonSearch';
import { getLoadedStudyCards, fetchDictionaryRowsFromPacks } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import type { SearchResult } from '../utils/vocabulary/dictionarySearch';

export { searchInIndex, searchByCharacterComponents, segmentPinyinQuery } from '../utils/vocabulary/dictionarySearch';
export type { SearchResult, CompactSearchEntry } from '../utils/vocabulary/dictionarySearch';

/**
 * Lesson words publish first, then common words searched on the device; the server's
 * full result page is the final answer.
 */
export async function searchDictionary(searchQuery: string, resultLimit = 30, onResults?: (results: SearchResult[]) => void): Promise<SearchResult[]> {
  const query = searchQuery.trim();
  if (!query || resultLimit <= 0) return [];
  const remote = searchDictionaryApi(query, Math.min(resultLimit, 50));
  let settled = false;
  remote.then(() => { settled = true; }, () => { settled = true; });
  const local = onResults ? searchCommonWords(query, resultLimit) : Promise.resolve([]);
  const warm = getLoadedStudyCards().some(card => [card.front, card.traditional, card.simplified].includes(query));
  const exact: SearchResult[] = warm ? ((await fetchDictionaryRowsFromPacks([query]).catch(() => undefined))?.get(query) ?? []).map(row => ({
    id: row.id, traditional: row.traditional, simplified: row.simplified, pinyin_accented: row.pinyin_accented ?? '',
    ...sanitizeDictionaryDefinitions(row.definitions), match_type: 'exact', total_score: 6200 + (row.frequency_score ?? 0),
  })) : [];
  if (exact.length && !settled) onResults?.(exact.slice(0, resultLimit));
  void local.then(rows => {
    if (settled || !rows.length) return;
    const seen = new Set(exact.flatMap(row => [row.simplified, row.traditional]));
    onResults?.([...exact, ...rows.filter(row => !seen.has(row.simplified) && !seen.has(row.traditional))].slice(0, resultLimit));
  });
  return remote;
}
