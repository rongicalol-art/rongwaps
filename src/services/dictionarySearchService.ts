import { debugLogger } from '../utils/debugLogger';
import { fetchStaticJson } from './staticContentService';
import { fetchDictionaryRowsFromPacks } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/dictionaryDefinitions';

export interface SearchResult {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: string[] | string;
  measure_words?: string[];
  match_type: 'exact' | 'prefix' | 'partial';
  total_score: number;
}

// Compact tuple: [id, simplified, traditional (if diff else ''), pinyin_accented, pinyin_flat, definitions[], freq]
export type CompactSearchEntry = [number, string, string, string, string, string[], number];

interface SearchIndexPayload {
  schemaVersion: number;
  count: number;
  items: CompactSearchEntry[];
}

let searchIndexPromise: Promise<CompactSearchEntry[] | null> | null = null;

async function getSearchIndex(): Promise<CompactSearchEntry[] | null> {
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = (async () => {
    try {
      const data = await fetchStaticJson<SearchIndexPayload>('/data/search/dictionary-search-index.json', 'dictionary-search-index');
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
      return null;
    } catch (error) {
      debugLogger.warn('Cache', 'Failed to load static dictionary search index', error);
      return null;
    }
  })();

  return searchIndexPromise;
}

const HANZI_REGEX = /[\u4e00-\u9fa5]/;

export function searchInIndex(
  index: CompactSearchEntry[] | null,
  searchQuery: string,
  resultLimit = 30,
): SearchResult[] {
  const query = searchQuery.trim();
  if (!query || !index) return [];

  const queryLower = query.toLowerCase();
  const isHanzi = HANZI_REGEX.test(query);
  const queryFlat = queryLower.replace(/[\s']/g, '');

  const matches: SearchResult[] = [];
  const seenWords = new Set<string>();

  for (let i = 0; i < index.length; i++) {
    const [id, s, t, py, flat, defs, freq] = index[i];
    const trad = t || s;

    if (seenWords.has(s) || (t && seenWords.has(t))) continue;

    let matchType: 'exact' | 'prefix' | 'partial' | null = null;
    let weight = 0;

    if (isHanzi) {
      if (s === query || trad === query) {
        matchType = 'exact';
        weight = 1.0;
      } else if (s.startsWith(query) || trad.startsWith(query)) {
        matchType = 'prefix';
        weight = 0.8;
      } else if (s.includes(query) || trad.includes(query)) {
        matchType = 'partial';
        weight = 0.5;
      }
    } else {
      // ASCII: Pinyin or English
      const pinyinFlat = flat || '';
      if (pinyinFlat === queryFlat) {
        matchType = 'exact';
        weight = 1.0;
      } else if (pinyinFlat.startsWith(queryFlat)) {
        matchType = 'prefix';
        weight = 0.8;
      } else {
        // Check definitions for English keyword
        for (let d = 0; d < defs.length; d++) {
          const defLower = defs[d].toLowerCase();
          if (defLower === queryLower) {
            matchType = 'exact';
            weight = 0.9;
            break;
          }
          if (defLower.includes(queryLower)) {
            matchType = 'partial';
            weight = 0.5;
            break;
          }
        }
      }
    }

    if (matchType !== null) {
      seenWords.add(s);
      if (t) seenWords.add(t);
      const sanitized = sanitizeDictionaryDefinitions(defs);
      const totalScore = (weight * 100) + freq;
      matches.push({
        id,
        simplified: s,
        traditional: trad,
        pinyin_accented: py,
        definitions: sanitized.definitions,
        measure_words: sanitized.measure_words,
        match_type: matchType,
        total_score: totalScore,
      });
    }
  }

  matches.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return a.simplified.length - b.simplified.length;
  });

  return matches.slice(0, resultLimit);
}

export async function searchDictionaryOffline(
  searchQuery: string,
  resultLimit = 30,
): Promise<SearchResult[]> {
  const query = searchQuery.trim();
  if (!query) return [];

  const matches: SearchResult[] = [];
  const seenWords = new Set<string>();

  // If Hanzi, do an exact lookup against dictionary shards to guarantee coverage even for rare words
  if (HANZI_REGEX.test(query)) {
    try {
      const packed = await fetchDictionaryRowsFromPacks([query]);
      const rows = packed.get(query);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const sanitized = sanitizeDictionaryDefinitions(row.definitions);
          seenWords.add(row.simplified);
          if (row.traditional) seenWords.add(row.traditional);
          matches.push({
            id: row.id,
            simplified: row.simplified,
            traditional: row.traditional || row.simplified,
            pinyin_accented: row.pinyin_accented || row.pinyin_flat || '',
            definitions: sanitized.definitions,
            measure_words: sanitized.measure_words,
            match_type: 'exact',
            total_score: 200 + (row.frequency_score ?? 0),
          });
        }
      }
    } catch (err) {
      debugLogger.warn('Cache', 'Exact pack lookup fallback failed', err);
    }
  }

  const index = await getSearchIndex();
  const indexMatches = searchInIndex(index, query, resultLimit);

  for (const m of indexMatches) {
    if (!seenWords.has(m.simplified) && (!m.traditional || !seenWords.has(m.traditional))) {
      matches.push(m);
      seenWords.add(m.simplified);
    }
  }

  return matches.slice(0, resultLimit);
}
