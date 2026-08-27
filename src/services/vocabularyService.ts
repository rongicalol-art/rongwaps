import { supabase } from './supabaseClient';
import { Flashcard, FLASHCARDS_DATA } from '../data/flashcards';
import { vocabularyCache } from '../utils/cache';
import { extractSearchVariants } from '../utils/courseExamples';
import { cleanVocabText } from '../utils/vocabCleaner';
import { escapeRegExp } from '../utils/escapeRegExp';
import { timeDataRequest } from '../utils/requestTiming';
import { fetchVocabularyPack, fetchAllVocabularyPacks } from './vocabularyPackService';
import { parseVocabularyId } from '../utils/vocabularyId';
import type { DBVocabularyRow } from '../types/database';
import { fetchCourseExampleCards } from './courseExamplePackService';

const VOCABULARY_COLUMNS = 'id,traditional,simplified,meaning,pinyin,pos,audio,examples';

// Maps a cache key to its currently ongoing fetch promise (if any)
const fetchPromises = new Map<string, Promise<Flashcard[]>>();
const searchPromises = new Map<string, Promise<Flashcard[]>>();

interface VocabularySourceRow extends Partial<Omit<DBVocabularyRow, 'examples'>> {
  examples?: unknown;
  book_id?: number;
  book?: number;
  lesson_id?: number;
  lesson?: number;
  part_id?: number;
  partId?: number;
  character?: string;
  hanzi?: string;
  word?: string;
  english?: string;
  definition?: string;
  pronunciation?: string;
  audio_url?: string;
  notes?: string;
  note?: string;
  pos?: string;
}

function parseExamples(value: unknown): Flashcard['examples'] {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parseExamples(parsed)
        : [{ chinese: value, pinyin: '', english: '' }];
    } catch {
      return value.trim() ? [{ chinese: value, pinyin: '', english: '' }] : [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((example) => {
    if (typeof example !== 'object' || example === null) return [];
    const record = example as Record<string, unknown>;
    const chinese = typeof record.chinese === 'string' ? record.chinese : '';
    if (!chinese) return [];
    return [{
      chinese,
      pinyin: typeof record.pinyin === 'string' ? record.pinyin : '',
      english: typeof record.english === 'string' ? record.english : '',
    }];
  });
}

function mapVocabularyRows(items: readonly unknown[]): Flashcard[] {
  return items.map((rawItem) => {
    const item = rawItem as VocabularySourceRow;
    const rawId = item.id?.toString() || '';
    const location = parseVocabularyId(rawId);

    return {
      id: rawId || Math.random().toString(),
      bookId: location?.bookId || item.book_id || item.book || 0,
      lessonId: location?.lessonId ?? item.lesson_id ?? item.lesson ?? 0,
      partId: location?.partId || item.part_id || item.partId || 1,
      front: cleanVocabText(item.traditional || item.simplified || item.character || item.hanzi || item.word || ''),
      back: (item.meaning || item.english || item.definition || '').trim(),
      // Keep the raw authored forms: matching and highlighting need both
      // scripts plus their / alternatives and （） optionals intact.
      traditional: item.traditional?.trim() || undefined,
      simplified: item.simplified?.trim() || undefined,
      pinyin: (item.pinyin || item.pronunciation || '').trim(),
      pos: (item.pos || '').trim(),
      audio: item.audio || item.audio_url || '',
      notes: item.notes || item.note || '',
      examples: parseExamples(item.examples),
    };
  });
}

function prepareVocabulary(items: readonly unknown[], lessonId?: number): Flashcard[] {
  const mapped = mapVocabularyRows(items);
  const filtered = lessonId ? mapped.filter((card) => card.lessonId === lessonId) : mapped;
  return filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function fetchVocabulary(bookId?: number, lessonId?: number): Promise<Flashcard[]> {
  const cacheKey = `vocab-${bookId || 'all'}-${lessonId || 'all'}`;
  
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  if (fetchPromises.has(cacheKey)) {
    return fetchPromises.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    if (bookId) {
      const packedRows = await fetchVocabularyPack(bookId);
      if (packedRows) {
        const packedData = prepareVocabulary(packedRows, lessonId);
        vocabularyCache.set(cacheKey, packedData);
        return packedData;
      }
    }

    // Full-catalog requests (search, review decks) come from the static packs
    // first. Falling through to the paginated Supabase pull below downloads
    // the whole book_vocabulary table per session — the largest avoidable
    // egress/latency cost at scale — so it stays a fallback only.
    if (!bookId) {
      const allPackedRows = await fetchAllVocabularyPacks();
      if (allPackedRows) {
        const packedData = prepareVocabulary(allPackedRows, lessonId);
        vocabularyCache.set(cacheKey, packedData);
        return packedData;
      }
    }

    // If Supabase is not configured, fall back to local data
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
    
    if (!supabaseUrl) {
      let filteredData = FLASHCARDS_DATA;
      if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
      if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
      
      const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      vocabularyCache.set(cacheKey, sortedData);
      return sortedData;
    }

    const allData: DBVocabularyRow[] = [];
    let from = 0;
    const step = 1000;

    try {
      while (true) {
        let query = supabase
          .from('book_vocabulary')
          .select(VOCABULARY_COLUMNS)
          .order('id', { ascending: true })
          .range(from, from + step - 1);

        if (bookId) {
          const padBId = bookId < 10 ? `0${bookId}` : bookId;
          query = query.or(`id.ilike.b${bookId}l%,id.ilike.b${bookId}-l%,id.ilike.b${padBId}l%,id.ilike.b${padBId}-l%`);
        } else if (lessonId) {
          const padLId = lessonId < 10 ? `0${lessonId}` : lessonId;
          query = query.or(`id.ilike.%l${lessonId}-%,id.ilike.%l${lessonId}\\%,id.ilike.%l${padLId}-%,id.ilike.%l${padLId}\\%`);
        }

        const pageNumber = Math.floor(from / step) + 1;
        const { data, error } = await timeDataRequest(
          `vocabulary page ${pageNumber}`,
          () => query,
        );

        if (error) {
          console.error('Error fetching vocabulary:', error);
          if (allData.length === 0) {
            let filteredData = FLASHCARDS_DATA;
            if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
            if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
            const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
            vocabularyCache.set(cacheKey, sortedData);
            return sortedData;
          }
          break;
        }

        if (!data || data.length === 0) {
          break;
        }

        allData.push(...(data as DBVocabularyRow[]));
        if (data.length < step) {
          break;
        }
        from += step;
      }

      if (allData.length === 0) {
        let filteredData = FLASHCARDS_DATA;
        if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
        if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
        const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
        vocabularyCache.set(cacheKey, sortedData);
        return sortedData;
      }

      const finalData = prepareVocabulary(allData, lessonId);
      
      vocabularyCache.set(cacheKey, finalData);
      return finalData;
    } catch (err) {
      console.error('Exception fetching vocabulary:', err);
      let filteredData = FLASHCARDS_DATA;
      if (bookId) filteredData = filteredData.filter(c => c.bookId === bookId);
      if (lessonId) filteredData = filteredData.filter(c => c.lessonId === lessonId);
      const sortedData = [...filteredData].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      vocabularyCache.set(cacheKey, sortedData);
      return sortedData;
    } finally {
      fetchPromises.delete(cacheKey);
    }
  })();

  fetchPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches a book's vocabulary tagged with a Browse theme (requires the
 * 'category' column from migration 20260817_vocabulary_categories.sql).
 * Returns null when the column is missing so callers can fall back to the
 * static curated taxonomy.
 */

function normalizePinyin(str: string) {
  if (!str) return '';
  // Remove tone marks, spaces, digits
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[1-5]/g, "").replace(/[-']/g, "").toLowerCase();
}

function getVariations(str: string): string[] {
  if (!str) return [];
  const results = new Set<string>();
  results.add(str);

  // Handle slashes: split by /
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim());
    parts.forEach(p => results.add(p));
  }

  // Handle parentheses (both ASCII and full-width)
  for (const res of Array.from(results)) {
    if ((res.includes('(') && res.includes(')')) || (res.includes('（') && res.includes('）'))) {
      const withoutParens = res.replace(/\([^)]+\)/g, '').replace(/（[^）]+）/g, '');
      const withParensContent = res.replace(/[(（]/g, '').replace(/[)）]/g, '');
      results.add(withoutParens.trim());
      results.add(withParensContent.trim());
    }
  }

  return Array.from(results).filter(s => s.length > 0);
}

function getSmartScore(card: Flashcard, rawQuery: string, lowerQuery: string, normQuery: string) {
  let maxScore = 0;
  
  const frontVariations = getVariations(card.front || '');
  const pinyinVariations = getVariations(card.pinyin || '');
  const definitions = (card.back || '').toLowerCase();

  for (const front of frontVariations) {
    // If no pinyin variations, still run at least once
    const pinyinsToTest = pinyinVariations.length > 0 ? pinyinVariations : [''];
    
    for (const pinyinRaw of pinyinsToTest) {
      let score = 0;
      const joinedPinyin = normalizePinyin(pinyinRaw);

      // 1. Exact Matches (Highest Priority)
      if (front === rawQuery) score += 10000;
      if (joinedPinyin === normQuery && joinedPinyin.length > 0) score += 8000;

      // Exact English meaning word match. The query is escaped so regex
      // metacharacters in the user's input (e.g. "(", "?", "[", "*") never
      // throw a SyntaxError that turns the whole search into an empty result.
      // \b is only meaningful for Latin text; Chinese/English mixed strings
      // still match on literal substring boundaries via includes() below.
      const escapedQuery = escapeRegExp(lowerQuery.trim());
      const wordsRegex = escapedQuery ? new RegExp(`(?:^|[^A-Za-z])${escapedQuery}(?=$|[^A-Za-z])`, 'i') : null;
      if (wordsRegex && wordsRegex.test(definitions)) {
         score += 4000;
         if (definitions.startsWith(lowerQuery)) score += 1000;
      }

      // 2. Starts With (High Priority)
      if (front.startsWith(rawQuery)) score += 500;
      if (joinedPinyin && joinedPinyin.startsWith(normQuery)) score += 400;
      
      // 3. Partial or Substring matches
      if (front.includes(rawQuery)) score += 100;
      if (joinedPinyin && joinedPinyin.includes(normQuery)) score += 50;
      if (definitions.includes(lowerQuery)) score += 10;

      // 4. Penalty for length so shorter, more exact matches float higher
      score -= front.length * 2; 
      if (joinedPinyin) {
         score -= joinedPinyin.length;
      }
      
      if (score > maxScore) {
        maxScore = score;
      }
    }
  }
  
  return maxScore;
}

export async function searchVocabulary(queryStr: string): Promise<Flashcard[]> {
  if (!queryStr || queryStr.trim() === '') return [];
  
  const cacheKey = `search-${queryStr}`;
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  if (searchPromises.has(cacheKey)) {
    return searchPromises.get(cacheKey)!;
  }

  const searchPromise = (async () => {
    try {
      const queryTrimmed = queryStr.trim();
      const queryLower = queryTrimmed.toLowerCase();
      const normalizedQuery = normalizePinyin(queryTrimmed);

      // Fast path: single Chinese character lookup
      // Check all cached vocabulary pages for words containing this character
      const isSingleChar = queryTrimmed.length === 1 && /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(queryTrimmed);
      if (isSingleChar) {
        const results: Flashcard[] = [];
        const seen = new Set<string>();
        // Scan all vocabulary cache keys for matches (including compound words)
        const vocabKeys = ['vocab-all-all', 'vocab-1-all', 'vocab-2-all', 'vocab-3-all', 'vocab-4-all', 'vocab-5-all', 'vocab-6-all'];
        for (const key of vocabKeys) {
          const cached = vocabularyCache.get<Flashcard[]>(key);
          if (cached) {
            for (const card of cached) {
              if (card.front.includes(queryTrimmed) && !seen.has(card.id)) {
                seen.add(card.id);
                results.push(card);
              }
            }
          }
        }
        // If we found matches in cache, return immediately without fetching all vocab
        if (results.length > 0) {
          // Sort: exact matches first, then by length (shorter first), then by book/lesson
          results.sort((a, b) => {
            if (a.front === queryTrimmed && b.front !== queryTrimmed) return -1;
            if (a.front !== queryTrimmed && b.front === queryTrimmed) return 1;
            if (a.front.length !== b.front.length) return a.front.length - b.front.length;
            if (a.bookId !== b.bookId) return a.bookId - b.bookId;
            return a.lessonId - b.lessonId;
          });
          vocabularyCache.set(cacheKey, results);
          return results;
        }
        // If no cache hits, fall through to full search
      }

      const allCards = await fetchVocabulary();
      
      const scoredResults = allCards.map(card => ({
        card,
        score: getSmartScore(card, queryTrimmed, queryLower, normalizedQuery)
      })).filter(item => item.score > 0);
      
      scoredResults.sort((a, b) => b.score - a.score);
      
      const finalData = scoredResults.slice(0, 100).map(s => s.card);
      vocabularyCache.set(cacheKey, finalData);
      
      return finalData;
    } catch (err) {
      console.error('Exception searching vocabulary:', err);
      return [];
    } finally {
      searchPromises.delete(cacheKey);
    }
  })();

  searchPromises.set(cacheKey, searchPromise);
  return searchPromise;
}

export async function fetchExamplesForWord(searchWords: string | string[]): Promise<Flashcard[]> {
  const words = Array.isArray(searchWords) ? searchWords : [searchWords];
  const cleanWords = words.map((word) => word?.trim()).filter(Boolean);
  if (cleanWords.length === 0) return [];

  const cacheKey = `examples-${[...new Set(cleanWords)].sort().join('|')}`;
  if (vocabularyCache.has(cacheKey)) {
    return vocabularyCache.get<Flashcard[]>(cacheKey) || [];
  }

  try {
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
    // Expand every script form (traditional + simplified + front) so a
    // sentence in either script — or any / alternative or （） optional form —
    // is found.
    const variants = new Set<string>();
    for (const word of cleanWords) {
      for (const variant of extractSearchVariants(word)) variants.add(variant);
    }
    const variantList = Array.from(variants).sort((a, b) => b.length - a.length);
    const searchTerms = variantList.length > 0 ? variantList : cleanWords;
    const richExampleCards = await fetchCourseExampleCards(searchTerms);

    const mergeExampleCards = (fallbackCards: Flashcard[]) => {
      const merged = new Map<string, Flashcard>();
      fallbackCards.forEach((card) => merged.set(card.id, card));
      richExampleCards.forEach((card) => {
        const fallback = merged.get(card.id);
        merged.set(card.id, fallback ? { ...fallback, ...card, examples: card.examples } : card);
      });
      const result = [...merged.values()];
      vocabularyCache.set(cacheKey, result);
      return result;
    };
    
    if (!supabaseUrl) {
      // Fallback to local data
      const matching = FLASHCARDS_DATA.filter(c => c.examples?.some(e => e.chinese && searchTerms.some(v => e.chinese.includes(v))));
      return mergeExampleCards(matching);
    }

    let query = supabase.from('book_vocabulary').select(VOCABULARY_COLUMNS);
    if (variantList.length > 0) {
      const orString = variantList.map(v => `examples.ilike.%${v}%`).join(',');
      query = query.or(orString);
    } else {
      query = query.ilike('examples', `%${cleanWords[0]}%`);
    }

    const { data, error } = await timeDataRequest(
      'vocabulary examples',
      () => query.limit(100),
    ); // 100 examples is plenty for sentences

    if (error) {
      console.error('Error fetching examples:', error);
      return mergeExampleCards([]);
    }

    if (!data || data.length === 0) return mergeExampleCards([]);

    const mappedData = mapVocabularyRows(data);

    return mergeExampleCards(mappedData);
  } catch (err) {
    console.error('Exception fetching examples:', err);
    return [];
  }
}
