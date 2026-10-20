import { debugLogger } from '../utils/debug/debugLogger';
import { Flashcard } from '../data/flashcards';
import { vocabularyCache } from '../utils/cache';
import { extractSearchVariants, sentenceMatchesForms } from '../utils/vocabulary/wordForms';
import { includeVocabularyAudioExamples } from '../utils/vocabulary/courseExamples';
import { stripPinyinTones } from '../utils/pinyin/pinyinNormalize';
import {
  fetchVocabularyPack,
  fetchAllVocabularyPacks,
  fetchCourseExampleCards,
} from './contentPacks';
import type { WordExample } from '../types/models';
import { getSmartScore } from '../utils/vocabulary/vocabularySearchScoring';
import { prepareVocabulary } from '../utils/vocabulary/vocabularyMapping';

export { prepareVocabulary };

const pendingLookups = new Map<string, Promise<Flashcard[]>>();

function cachedLookup(key: string, load: () => Promise<Flashcard[]>): Promise<Flashcard[]> {
  const cached = vocabularyCache.get<Flashcard[]>(key);
  if (cached !== undefined) return Promise.resolve(cached);
  const pending = pendingLookups.get(key);
  if (pending) return pending;
  const request = load().then((cards) => {
    vocabularyCache.set(key, cards);
    return cards;
  }).finally(() => pendingLookups.delete(key));
  pendingLookups.set(key, request);
  return request;
}

export function fetchVocabulary(bookId?: number, lessonId?: number): Promise<Flashcard[]> {
  return cachedLookup(`vocab-${bookId || 'all'}-${lessonId || 'all'}`, async () => {
    const rows = await (bookId ? fetchVocabularyPack(bookId) : fetchAllVocabularyPacks());
    return rows ? prepareVocabulary(rows, lessonId) : [];
  });
}

export async function searchVocabulary(queryStr: string): Promise<Flashcard[]> {
  if (!queryStr || queryStr.trim() === '') return [];
  const queryTrimmed = queryStr.trim();
  const cacheKey = `search-${queryTrimmed}`;

  return cachedLookup(cacheKey, async () => {
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
  });
}

export async function fetchExamplesForWord(searchWords: string | string[], pos?: string): Promise<Flashcard[]> {
  const words = Array.isArray(searchWords) ? searchWords : [searchWords];
  const cleanWords = words.map((w) => w?.trim()).filter(Boolean);
  if (cleanWords.length === 0) return [];
  const cacheKey = `examples-${[...new Set(cleanWords)].sort().join('|')}`;

  return cachedLookup(cacheKey, async () => {
    let resolvedPos = pos?.trim() || undefined;
    if (!resolvedPos && cleanWords.some((word) => Array.from(word).length > 1)) {
      try {
        const allVocab = await fetchVocabulary();
        resolvedPos = allVocab.find((c) => (
          cleanWords.includes(c.front)
          || (c.traditional ? cleanWords.includes(c.traditional) : false)
          || (c.simplified ? cleanWords.includes(c.simplified) : false)
        ))?.pos?.trim() || undefined;
      } catch (error) {
        // Graceful degradation: vocabulary fetch for part-of-speech lookup failed, proceed without POS filter
        debugLogger.warn('Supabase', 'Failed to resolve part-of-speech for example lookup', error);
      }
    }

    const variants = new Set<string>();
    for (const word of cleanWords) {
      for (const variant of extractSearchVariants(word)) variants.add(variant);
    }
    const variantList = Array.from(variants).sort((a, b) => b.length - a.length);
    const searchTerms = variantList.length > 0 ? variantList : cleanWords;
    const richExampleCards = await fetchCourseExampleCards(searchTerms, resolvedPos);

    const isCharacterLookup = cleanWords.every((word) => Array.from(word).length === 1);
    if (richExampleCards.length > 0 && isCharacterLookup) {
      const bookThreeMatches = (await fetchVocabulary(3))
        .filter((card) => card.examples?.some((example) => sentenceMatchesForms(example.chinese, searchTerms, resolvedPos)));
      return includeVocabularyAudioExamples(richExampleCards, bookThreeMatches);
    }

    const vocabularyMatches = (await fetchVocabulary())
      .filter((card) => card.examples?.some((example) => sentenceMatchesForms(example.chinese, searchTerms, resolvedPos)));
    const matches = richExampleCards.length > 0
      ? includeVocabularyAudioExamples(richExampleCards, vocabularyMatches)
      : vocabularyMatches;
    return [...new Map(matches.map((card) => [card.id, card])).values()];
  });
}

export async function fetchExamples(word: string, limit = 3): Promise<WordExample[]> {
  const cards = await fetchExamplesForWord(word);
  const seen = new Set<string>();
  const examples: WordExample[] = [];

  const cardExamples = cards.flatMap((card) => (card.examples ?? []).map((example) => ({ card, example })));
  const orderedExamples = [
    ...cardExamples.filter(({ example }) => example.audio),
    ...cardExamples.filter(({ example }) => !example.audio),
  ];
  for (const { card, example: ex } of orderedExamples) {
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
        ...(ex.audio ? { audio: ex.audio } : {}),
        sourceCardId: card.id,
        sourceFront: card.front,
        sourceBookId: card.bookId,
        sourceLessonId: card.lessonId,
      });
    if (examples.length >= limit) return examples;
  }

  return examples;
}

