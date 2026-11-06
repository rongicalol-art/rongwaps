import type { Flashcard } from '../data/flashcards';
import { allReadings } from '../utils/pinyin/pronunciation';
import { buildWordEntry, courseWordOf, type WordEntry } from '../utils/vocabulary/wordEntry';
import { fetchDictionaryRowsFromPacks, fetchPronunciationIndex, fetchSenseExamples, fetchWordTypeTags, fetchWordUsage, getLoadedStudyCards } from './contentPacks';
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
    const [rows, cards, readings, wordTypes, examples, usage] = await Promise.all([
      fetchDictionaryRowsFromPacks([key]).then((map) => map.get(key) ?? []),
      courseCardsForWord(key),
      Array.from(key).length === 1 ? fetchPronunciationIndex().catch(() => null) : Promise.resolve(null),
      fetchWordTypeTags(key),
      fetchSenseExamples(key),
      fetchWordUsage(key),
    ]);
    const build = (wordUsage: typeof usage) => buildWordEntry(key, rows, cards, allReadings(key, readings).map((reading) => reading.pinyin), {
      posTags: (tagKey) => wordTypes.get(tagKey),
      senseExamples: (tagKey) => examples.get(tagKey),
      usage: wordUsage,
    });
    const entry = build(usage);
    // Usage is keyed by the traditional word: a simplified spelling (学习) looks it up again as 學習.
    return entry && entry.word !== key ? build(await fetchWordUsage(entry.word)) : entry;
  })();
  pending.catch(() => entries.delete(key));
  entries.set(key, pending);
  if (entries.size > ENTRY_CACHE_LIMIT) entries.delete(entries.keys().next().value!);
  return pending;
}
