import { cleanVocabText } from '../utils/vocabulary/vocabCleaner';
import { buildCourseVocabLookupMap } from '../utils/vocabulary/courseLookup';
import { getLoadedStudyCards } from './contentPacks';
import { lookupCourseCardsApi } from './dictionaryApi';
/**
 * Fast in-memory dictionary lookup map for course vocabulary words.
 */

import type { Flashcard } from '../data/flashcards';
import { fetchVocabulary } from './vocabularyService';
import { characterReadings } from '../utils/pinyin/characterReadings';
import { getReviewedWordAudio } from './pronunciationAudio';
import { recordingLookupKey, findReadingMatch, pronunciationKey } from '../utils/pinyin/pronunciationMatching';

let courseVocabByWordMap: Map<string, Flashcard> | null = null;
const characterContextCache = new Map<string, Flashcard | undefined>();
let courseVocabMapPromise: Promise<Map<string, Flashcard>> | null = null;

export async function getCourseVocabLookupMap(): Promise<Map<string, Flashcard>> {
  if (courseVocabByWordMap) return courseVocabByWordMap;
  if (courseVocabMapPromise) return courseVocabMapPromise;

  courseVocabMapPromise = (async () => {
    try {
      const allCards = await fetchVocabulary();
      const map = buildCourseVocabLookupMap(allCards);

      courseVocabByWordMap = map;
      return map;
    } finally {
      courseVocabMapPromise = null;
    }
  })();

  return courseVocabMapPromise;
}


const NO_CARDS: Flashcard[] = [];
const remoteCourse = new Map<string, Flashcard[]>();
export async function getCourseVocabForWords(words: string[]): Promise<Map<string, Flashcard>> {
  if (courseVocabByWordMap) return courseVocabByWordMap;
  const warm = buildCourseVocabLookupMap(getLoadedStudyCards());
  const missing = [...new Set(words.map(word => word.trim()).filter(word => word && !warm.has(word) && !remoteCourse.has(word)))];
  if (missing.length) {
    const cards = await lookupCourseCardsApi(missing);
    for (const word of missing) {
      const matched = cards.filter(card => [card.front, card.traditional, card.simplified].includes(word));
      remoteCourse.set(word, matched.length ? matched : NO_CARDS);
    }
    while (remoteCourse.size > 2048) remoteCourse.delete(remoteCourse.keys().next().value!);
  }
  return buildCourseVocabLookupMap([...remoteCourse.values()].flat().concat(getLoadedStudyCards()));
}

/** Audio reuse requires the intended reading, not just a spelling match. */
export async function findMatchingCourseRecording(word: string, pinyin?: string): Promise<Flashcard | undefined> {
  const map = await getCourseVocabForWords([word]);
  const original = findReadingMatch(map, [word], pinyin);
  if (original?.audio) return original;
  const base = map.get(word);
  const audio = base && await getReviewedWordAudio(word, pinyin);
  return audio ? { ...base!, front: word, traditional: word, simplified: word, pinyin, audio } : original;
}

export async function findMatchingCourseVocab(word: string): Promise<Flashcard | undefined> {
  if (!word || !word.trim()) return undefined;
  const trimmed = word.trim();
  const cleaned = cleanVocabText(trimmed);
  const map = await getCourseVocabForWords([trimmed, cleaned]);
  return map.get(trimmed) ?? map.get(cleaned);
}

/** A complete book recording demonstrating this exact reading; never an extracted character clip. */
export async function findCharacterCourseContext(word: string, pinyin?: string): Promise<Flashcard | undefined> {
  const key = recordingLookupKey(word, pinyin);
  if (key && characterContextCache.has(key)) return characterContextCache.get(key);
  const reading = pronunciationKey(pinyin);
  if (!reading || !/^[\u3400-\u9fff]$/u.test(word)) return undefined;
  const cards = [...new Set((await getCourseVocabLookupMap()).values())];
  let best: Flashcard | undefined;
  for (const card of cards) {
    const form = card.front.includes(word) ? card.front : cleanVocabText(card.simplified || '');
    if (!form.includes(word)) continue;
    const candidates = [card];
    if (card.pinyin?.includes('/')) for (const alternative of card.pinyin.split('/')) {
      const audio = await getReviewedWordAudio(card.front, alternative);
      if (audio) candidates.push({ ...card, pinyin: alternative, audio });
    }
    for (const candidate of candidates) {
      if (!candidate.audio) continue;
      const aligned = characterReadings(form, candidate.pinyin, form === card.front ? card.traditional : card.simplified);
      if (!aligned || aligned.readings.some((values) => values.length !== 1)) continue;
      if (!aligned.characters.some((char, i) => char === word && aligned.readings[i][0] === reading)) continue;
      if (!best || Array.from(card.front).length < Array.from(best.front).length) best = candidate;
    }
  }
  if (key) {
    characterContextCache.set(key, best);
    if (characterContextCache.size > 128) characterContextCache.delete(characterContextCache.keys().next().value!);
  }
  return best;
}
