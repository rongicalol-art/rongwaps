import { searchDictionaryApi } from './dictionaryApi';
import { getLoadedStudyCards, fetchDictionaryRowsFromPacks } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import type { SearchResult } from '../utils/vocabulary/dictionarySearch';

export { searchInIndex, searchByCharacterComponents, segmentPinyinQuery } from '../utils/vocabulary/dictionarySearch';
export type { SearchResult, CompactSearchEntry } from '../utils/vocabulary/dictionarySearch';

/** Lesson words publish immediately; global search transfers only the result page. */
export async function searchDictionary(searchQuery: string, resultLimit = 30, onResults?: (results: SearchResult[]) => void): Promise<SearchResult[]> {
  const query = searchQuery.trim();
  if (!query || resultLimit <= 0) return [];
  const warm = getLoadedStudyCards().some(card => [card.front, card.traditional, card.simplified].includes(query));
  const exact: SearchResult[] = warm ? ((await fetchDictionaryRowsFromPacks([query]).catch(() => undefined))?.get(query) ?? []).map(row => ({
    id: row.id, traditional: row.traditional, simplified: row.simplified, pinyin_accented: row.pinyin_accented ?? '',
    ...sanitizeDictionaryDefinitions(row.definitions), match_type: 'exact', total_score: 6200 + (row.frequency_score ?? 0),
  })) : [];
  if (exact.length) onResults?.(exact.slice(0, resultLimit));
  return searchDictionaryApi(query, Math.min(resultLimit, 50));
}
