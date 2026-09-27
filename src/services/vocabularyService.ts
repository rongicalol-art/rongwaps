import { debugLogger } from '../utils/debugLogger';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Flashcard, FLASHCARDS_DATA } from '../data/flashcards';
import { vocabularyCache } from '../utils/cache';
import { extractSearchVariants, sentenceMatchesForms } from '../utils/courseExamples';
import { stripPinyinTones } from '../utils/pinyinNormalize';
import { timeDataRequest } from '../utils/requestTiming';
import { fetchVocabularyPack, fetchAllVocabularyPacks } from './vocabularyPackService';
import type { DBVocabularyRow } from '../types/database';
import type { WordExample } from '../types/models';
import { fetchCourseExampleCards } from './courseExamplePackService';
import { withPackFirstLookup } from './packFirstLookup';
import { getSmartScore } from '../utils/vocabularySearchScoring';
import { mapVocabularyRows, prepareVocabulary } from '../utils/vocabularyMapping';

export { prepareVocabulary };

const VOCABULARY_COLUMNS = 'id,traditional,simplified,meaning,pinyin,pos,audio,examples';

function getFallbackFlashcards(bookId?: number, lessonId?: number): Flashcard[] {
  let filtered = FLASHCARDS_DATA;
  if (bookId) filtered = filtered.filter((c) => c.bookId === bookId);
  if (lessonId) filtered = filtered.filter((c) => c.lessonId === lessonId);
  return [...filtered].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
}

async function fetchVocabularyFromSupabase(bookId?: number, lessonId?: number): Promise<Flashcard[]> {
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
      const { data, error } = await timeDataRequest(`vocabulary page ${pageNumber}`, () => query);

      if (error) {
        debugLogger.error('Supabase', 'Error fetching vocabulary:', error);
        if (allData.length === 0) return getFallbackFlashcards(bookId, lessonId);
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < step) break;
      from += step;
    }

    if (allData.length === 0) return getFallbackFlashcards(bookId, lessonId);
    return prepareVocabulary(allData, lessonId);
  } catch (err) {
    debugLogger.error('Supabase', 'Exception fetching vocabulary:', err);
    return getFallbackFlashcards(bookId, lessonId);
  }
}

export async function fetchVocabulary(bookId?: number, lessonId?: number): Promise<Flashcard[]> {
  const cacheKey = `vocab-${bookId || 'all'}-${lessonId || 'all'}`;

  return withPackFirstLookup<Flashcard[]>({
    dedupeKey: cacheKey,
    cache: {
      get: (k) => vocabularyCache.get<Flashcard[]>(k),
      set: (k, v) => vocabularyCache.set(k, v),
    },
    fromPack: async () => {
      if (bookId) {
        const packedRows = await fetchVocabularyPack(bookId);
        if (packedRows) return prepareVocabulary(packedRows, lessonId);
      } else {
        const allPackedRows = await fetchAllVocabularyPacks();
        if (allPackedRows) return prepareVocabulary(allPackedRows, lessonId);
      }
      return null;
    },
    fromDb: async () => {
      if (!isSupabaseConfigured()) {
        return getFallbackFlashcards(bookId, lessonId);
      }
      return fetchVocabularyFromSupabase(bookId, lessonId);
    },
  });
}

export async function fetchVocabularyByIds(ids: string[]): Promise<Flashcard[] | null> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return [];
  const dedupeKey = `vocab-ids-${[...uniqueIds].sort().join(',')}`;

  return withPackFirstLookup<Flashcard[] | null>({
    dedupeKey,
    fromPack: async () => null,
    fromDb: async () => {
      try {
        const rows: DBVocabularyRow[] = [];
        const chunkSize = 100;
        for (let i = 0; i < uniqueIds.length; i += chunkSize) {
          const chunk = uniqueIds.slice(i, i + chunkSize);
          const { data, error } = await timeDataRequest(
            `vocabulary by ids chunk ${Math.floor(i / chunkSize) + 1}`,
            () => supabase.from('book_vocabulary').select(VOCABULARY_COLUMNS).in('id', chunk),
          );
          if (error) {
            debugLogger.error('Supabase', 'Error fetching vocabulary by ids:', error);
            return null;
          }
          if (data) rows.push(...data);
        }
        return prepareVocabulary(rows);
      } catch (err) {
        debugLogger.error('Supabase', 'Exception fetching vocabulary by ids:', err);
        return null;
      }
    },
  });
}

export async function searchVocabulary(queryStr: string): Promise<Flashcard[]> {
  if (!queryStr || queryStr.trim() === '') return [];
  const queryTrimmed = queryStr.trim();
  const cacheKey = `search-${queryTrimmed}`;

  return withPackFirstLookup<Flashcard[]>({
    dedupeKey: cacheKey,
    cache: {
      get: (k) => vocabularyCache.get<Flashcard[]>(k),
      set: (k, v) => vocabularyCache.set(k, v),
    },
    fromPack: async () => {
      const queryLower = queryTrimmed.toLowerCase();
      const normalizedQuery = stripPinyinTones(queryTrimmed);

      const isSingleChar = queryTrimmed.length === 1 && /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u.test(queryTrimmed);
      if (isSingleChar) {
        const results: Flashcard[] = [];
        const seen = new Set<string>();
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
        if (results.length > 0) {
          results.sort((a, b) => {
            if (a.front === queryTrimmed && b.front !== queryTrimmed) return -1;
            if (a.front !== queryTrimmed && b.front === queryTrimmed) return 1;
            if (a.front.length !== b.front.length) return a.front.length - b.front.length;
            if (a.bookId !== b.bookId) return a.bookId - b.bookId;
            return a.lessonId - b.lessonId;
          });
          return results;
        }
      }

      const allCards = await fetchVocabulary();
      const scoredResults = allCards
        .map((card) => ({ card, score: getSmartScore(card, queryTrimmed, queryLower, normalizedQuery) }))
        .filter((item) => item.score > 0);
      scoredResults.sort((a, b) => b.score - a.score);
      return scoredResults.slice(0, 100).map((s) => s.card);
    },
    fromDb: async () => [],
  });
}

export async function fetchExamplesForWord(searchWords: string | string[], pos?: string): Promise<Flashcard[]> {
  const words = Array.isArray(searchWords) ? searchWords : [searchWords];
  const cleanWords = words.map((w) => w?.trim()).filter(Boolean);
  if (cleanWords.length === 0) return [];
  const cacheKey = `examples-${[...new Set(cleanWords)].sort().join('|')}`;

  return withPackFirstLookup<Flashcard[]>({
    dedupeKey: cacheKey,
    cache: {
      get: (k) => vocabularyCache.get<Flashcard[]>(k),
      set: (k, v) => vocabularyCache.set(k, v),
    },
    fromPack: async () => {
      let resolvedPos = pos?.trim() || undefined;
      if (!resolvedPos) {
        try {
          const allVocab = await fetchVocabulary();
          resolvedPos = allVocab.find((c) => (
            cleanWords.includes(c.front)
            || (c.traditional ? cleanWords.includes(c.traditional) : false)
            || (c.simplified ? cleanWords.includes(c.simplified) : false)
          ))?.pos?.trim() || undefined;
        } catch {
          resolvedPos = undefined;
        }
      }

      const variants = new Set<string>();
      for (const word of cleanWords) {
        for (const variant of extractSearchVariants(word)) variants.add(variant);
      }
      const variantList = Array.from(variants).sort((a, b) => b.length - a.length);
      const searchTerms = variantList.length > 0 ? variantList : cleanWords;
      const richExampleCards = await fetchCourseExampleCards(searchTerms, resolvedPos);

      const mergeExampleCards = (fallbackCards: Flashcard[]) => {
        const merged = new Map<string, Flashcard>();
        fallbackCards.forEach((c) => merged.set(c.id, c));
        richExampleCards.forEach((c) => {
          const fallback = merged.get(c.id);
          merged.set(c.id, fallback ? { ...fallback, ...c, examples: c.examples } : c);
        });
        return [...merged.values()];
      };

      if (richExampleCards.length > 0) return mergeExampleCards([]);

      const allVocab = await fetchVocabulary();
      const localMatching = allVocab.filter((c) => c.examples?.some((e) => sentenceMatchesForms(e.chinese, searchTerms, resolvedPos)));
      if (localMatching.length > 0 || !isSupabaseConfigured()) {
        return mergeExampleCards(localMatching);
      }

      let query = supabase.from('book_vocabulary').select(VOCABULARY_COLUMNS);
      if (variantList.length > 0) {
        query = query.or(variantList.map((v) => `examples.ilike.%${v}%`).join(','));
      } else {
        query = query.ilike('examples', `%${cleanWords[0]}%`);
      }

      const { data, error } = await timeDataRequest('vocabulary examples', () => query.limit(100));
      if (error || !data || data.length === 0) {
        if (error) debugLogger.error('Supabase', 'Error fetching examples:', error);
        return mergeExampleCards(localMatching);
      }
      return mergeExampleCards(mapVocabularyRows(data));
    },
    fromDb: async () => [],
  });
}

export async function fetchExamples(word: string, limit = 3): Promise<WordExample[]> {
  const cards = await fetchExamplesForWord(word);
  const seen = new Set<string>();
  const examples: WordExample[] = [];

  for (const card of cards) {
    for (const ex of card.examples ?? []) {
      const chinese = ex.chinese?.trim();
      const pinyin = ex.pinyin?.trim();
      const english = ex.english?.trim();
      if (!chinese || !chinese.includes(word)) continue;
      if (!pinyin || !english) continue;
      if (seen.has(chinese)) continue;
      seen.add(chinese);
      examples.push({
        chinese,
        pinyin,
        english,
        sourceCardId: card.id,
        sourceFront: card.front,
        sourceBookId: card.bookId,
        sourceLessonId: card.lessonId,
      });
      if (examples.length >= limit) return examples;
    }
  }

  return examples;
}

export { getCourseVocabLookupMap, findMatchingCourseVocab } from './courseVocabLookup';
