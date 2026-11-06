import { searchDictionaryApi } from './dictionaryApi';
import { searchCommonWords } from './dictionaryCommonSearch';
import { getLoadedStudyCards, fetchDictionaryRowsFromPacks } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import { courseFields, rankExactRows, searchEntryKey, type SearchResult } from '../utils/vocabulary/dictionarySearch';
import { courseWordOf, linkCourseReadings, orderReadingKeys, readingKey } from '../utils/vocabulary/wordEntry';

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
  const courseCards = getLoadedStudyCards().filter(card => courseWordOf(card) === query);
  const exactRows = courseCards.length ? (await fetchDictionaryRowsFromPacks([query]).catch(() => undefined))?.get(query) ?? [] : [];
  // Same reading order and lesson links as the server (wordEntry rules).
  const ownRows = exactRows.filter(row => row.traditional === query);
  const links = linkCourseReadings(ownRows, courseCards);
  const order = orderReadingKeys(ownRows, links);
  const exact: SearchResult[] = rankExactRows(exactRows, query, row => -order.indexOf(readingKey(row.pinyin_accented))).map(row => {
    const card = row.traditional === query ? links.get(readingKey(row.pinyin_accented))?.[0] : undefined;
    const result: SearchResult = {
      id: row.id, traditional: row.traditional, simplified: row.simplified, pinyin_accented: row.pinyin_accented ?? '',
      ...sanitizeDictionaryDefinitions(row.definitions), match_type: 'exact', total_score: 6200 + (row.frequency_score ?? 0),
    };
    return card ? { ...result, ...courseFields(result, card) } : result;
  });
  if (exact.length && !settled) onResults?.(exact.slice(0, resultLimit));
  void local.then(rows => {
    if (settled || !rows.length) return;
    const seen = new Set(exact.map(row => searchEntryKey(row.traditional, row.pinyin_accented)));
    onResults?.([...exact, ...rows.filter(row => !seen.has(searchEntryKey(row.traditional, row.pinyin_accented)))].slice(0, resultLimit));
  });
  return remote;
}
