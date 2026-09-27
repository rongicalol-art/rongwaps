/**
 * Fast in-memory dictionary lookup map for course vocabulary words.
 */

import type { Flashcard } from '../data/flashcards';
import { cleanVocabText } from '../utils/vocabCleaner';
import { fetchVocabulary } from './vocabularyService';

let courseVocabByWordMap: Map<string, Flashcard> | null = null;
let courseVocabMapPromise: Promise<Map<string, Flashcard>> | null = null;

export async function getCourseVocabLookupMap(): Promise<Map<string, Flashcard>> {
  if (courseVocabByWordMap) return courseVocabByWordMap;
  if (courseVocabMapPromise) return courseVocabMapPromise;

  courseVocabMapPromise = (async () => {
    try {
      const allCards = await fetchVocabulary();
      const map = new Map<string, Flashcard>();

      const register = (key: string | undefined, card: Flashcard) => {
        if (!key) return;
        const trimmed = key.trim();
        if (!trimmed) return;
        if (!map.has(trimmed)) map.set(trimmed, card);
        const cleaned = cleanVocabText(trimmed);
        if (cleaned && !map.has(cleaned)) map.set(cleaned, card);
      };

      for (const card of allCards) {
        register(card.front, card);
        register(card.traditional, card);
        register(card.simplified, card);
      }

      courseVocabByWordMap = map;
      return map;
    } finally {
      courseVocabMapPromise = null;
    }
  })();

  return courseVocabMapPromise;
}

export async function findMatchingCourseVocab(word: string): Promise<Flashcard | undefined> {
  if (!word || !word.trim()) return undefined;
  const map = await getCourseVocabLookupMap();
  const trimmed = word.trim();
  return map.get(trimmed) || map.get(cleanVocabText(trimmed));
}
