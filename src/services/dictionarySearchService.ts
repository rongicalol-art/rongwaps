import { stripPinyinTones } from '../utils/pinyin/pinyinNormalize';
import { escapeRegExp } from '../utils/escapeRegExp';
import { debugLogger } from '../utils/debug/debugLogger';
import { fetchStaticJson } from './staticContentService';
import { fetchDictionaryRowsFromPacks } from './contentPacks';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';

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

const HANZI_REGEX = /\p{Script=Han}/u;

// ponytail: one typo in a single word only; broaden only with real failed queries.
function isOneTypo(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1)
      || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

export function searchInIndex(
  index: CompactSearchEntry[] | null,
  searchQuery: string,
  resultLimit = 30,
): SearchResult[] {
  const query = searchQuery.trim();
  if (!query || !index || resultLimit <= 0) return [];

  const queryLower = query.toLowerCase().replace(/\s+/g, ' ');
  const isHanzi = HANZI_REGEX.test(query);
  const queryFlat = stripPinyinTones(query);
  const englishWord = new RegExp(`(?:^|[^a-z])${escapeRegExp(queryLower)}(?=$|[^a-z])`);
  const allowTypo = !isHanzi && /^[a-z]{5,}$/.test(queryLower);
  const matches: SearchResult[] = [];

  for (const [id, s, t, py, flat, defs, freq] of index) {
    const trad = t || s;
    let matchType: SearchResult['match_type'] = 'partial';
    let tier = 0;

    if (isHanzi) {
      if (s === query || trad === query) {
        matchType = 'exact';
        tier = 5;
      } else if (s.startsWith(query) || trad.startsWith(query)) {
        matchType = 'prefix';
        tier = 3;
      } else if (s.includes(query) || trad.includes(query)) {
        tier = 2;
      }
    } else {
      if (queryFlat && flat === queryFlat) {
        matchType = 'exact';
        tier = 5;
      } else if (queryFlat && flat.startsWith(queryFlat)) {
        matchType = 'prefix';
        tier = 3;
      }

      for (const definition of defs) {
        // Search meanings, not CEDICT pronunciation references or usage notes.
        if (/^(?:old |archaic )?variant of\b/i.test(definition)) continue;
        const glosses = definition.toLowerCase()
          .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
          .split(/[;,]/)
          .map((gloss) => gloss.replace(/^(?:to |an? |the )/, '').replace(/[^a-z0-9' -]/g, ' ').trim().replace(/\s+/g, ' '));
        const englishTier = glosses.some((gloss) => gloss === queryLower) ? 5
          : glosses.some((gloss) => englishWord.test(gloss)) ? 4
          : queryLower.length >= 3 && glosses.some((gloss) => gloss.split(' ').some((word) => word.startsWith(queryLower))) ? 3
          : 0;
        if (englishTier > tier) {
          tier = englishTier;
          matchType = tier === 5 ? 'exact' : tier === 3 ? 'prefix' : 'partial';
        }
        if (!tier && allowTypo && glosses.some((gloss) => gloss.split(' ').some((word) => isOneTypo(queryLower, word)))) tier = 1;
      }
      if (!tier && allowTypo && isOneTypo(queryFlat, flat)) tier = 1;
    }

    if (tier) {
      const sanitized = sanitizeDictionaryDefinitions(defs);
      matches.push({
        id, simplified: s, traditional: trad, pinyin_accented: py,
        definitions: sanitized.definitions, measure_words: sanitized.measure_words,
        match_type: matchType,
        // Frequency is a tie-breaker, never a substitute for relevance.
        total_score: tier * 1000 + Math.max(0, Math.min(100, freq)),
      });
    }
  }

  matches.sort((a, b) => b.total_score - a.total_score || a.simplified.length - b.simplified.length);
  const hasStrongMatches = matches.some((match) => match.total_score >= 2000);
  const seenWords = new Set<string>();
  return matches.filter((match) => {
    if ((hasStrongMatches && match.total_score < 2000) || seenWords.has(match.simplified) || seenWords.has(match.traditional)) return false;
    seenWords.add(match.simplified);
    seenWords.add(match.traditional);
    return true;
  }).slice(0, resultLimit);
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
