import type { Flashcard } from '../data/flashcards';
import { allReadings } from '../utils/pinyin/pronunciation';
import { buildWordEntry, courseWordOf, type WordEntry } from '../utils/vocabulary/wordEntry';
import { fetchDictionaryRowsFromPacks, fetchPronunciationIndex, getLoadedStudyCards } from './contentPacks';
import { lookupCourseCardsApi } from './dictionaryApi';
import { debugLogger } from '../utils/debug/debugLogger';

const ENTRY_CACHE_LIMIT = 64;
const entries = new Map<string, Promise<WordEntry | null>>();

/** Every lesson's card for a word: loaded study packs plus the server's full course list. */
async function courseCardsForWord(word: string): Promise<Flashcard[]> {
  const remote = await lookupCourseCardsApi([word]).catch((error) => {
    debugLogger.warn('Cache', `Course cards for ${word} unavailable`, error);
    return [] as Flashcard[];
  });
  const byId = new Map<string, Flashcard>();
  for (const card of [...getLoadedStudyCards(), ...remote]) {
    if (courseWordOf(card) === word || card.front === word) byId.set(card.id, card);
  }
  return [...byId.values()];
}

/**
 * The word page's entry for `word` (every reading, course senses first). The
 * search row it was opened from and this page share the wordEntry rules, so
 * both show the same reading and meaning. Null when the dictionary has no row.
 */
export function getWordEntry(word: string): Promise<WordEntry | null> {
  const key = word.trim();
  const cached = entries.get(key);
  if (cached) return cached;
  const pending = (async () => {
    const [rows, cards, readings] = await Promise.all([
      fetchDictionaryRowsFromPacks([key]).then((map) => map.get(key) ?? []),
      courseCardsForWord(key),
      Array.from(key).length === 1 ? fetchPronunciationIndex().catch(() => null) : Promise.resolve(null),
    ]);
    return buildWordEntry(key, rows, cards, allReadings(key, readings).map((reading) => reading.pinyin));
  })();
  pending.catch(() => entries.delete(key));
  entries.set(key, pending);
  if (entries.size > ENTRY_CACHE_LIMIT) entries.delete(entries.keys().next().value!);
  return pending;
}
