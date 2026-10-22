import type { Flashcard } from '../../data/flashcards';
import { cleanVocabText } from './vocabCleaner';
import { recordingLookupKey } from '../pinyin/pronunciationMatching';

/** One registration policy for deployed course metadata and the in-browser lookup. */
export function buildCourseVocabLookupMap(cards: readonly Flashcard[]): Map<string, Flashcard> {
  const map = new Map<string, Flashcard>();

  const register = (key: string | undefined, card: Flashcard) => {
    if (!key) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    if (!map.has(trimmed)) map.set(trimmed, card);
    const readingKey = recordingLookupKey(trimmed, card.pinyin);
    if (readingKey && (!map.has(readingKey) || (!map.get(readingKey)?.audio && card.audio))) map.set(readingKey, card);
    const cleaned = cleanVocabText(trimmed);
    if (cleaned && !map.has(cleaned)) map.set(cleaned, card);
  };

  for (const card of cards) {
    register(card.front, card);
    register(card.traditional, card);
    register(card.simplified, card);
  }

  return map;
}
