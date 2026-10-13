/**
 * Fast in-memory dictionary lookup map for course vocabulary words.
 */

import type { Flashcard } from '../data/flashcards';
import { cleanVocabText } from '../utils/vocabulary/vocabCleaner';
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

/** Audio reuse requires the intended reading, not just a spelling match. */
export async function findMatchingCourseRecording(word: string, pinyin?: string): Promise<Flashcard | undefined> {
  const map = await getCourseVocabLookupMap();
  const original = findReadingMatch(map, [word], pinyin);
  if (original?.audio) return original;
  const base = map.get(word);
  const audio = base && await getReviewedWordAudio(word, pinyin);
  return audio ? { ...base!, front: word, traditional: word, simplified: word, pinyin, audio } : original;
}

export async function findMatchingCourseVocab(word: string): Promise<Flashcard | undefined> {
  if (!word || !word.trim()) return undefined;
  const map = await getCourseVocabLookupMap();
  const trimmed = word.trim();
  return map.get(trimmed) || map.get(cleanVocabText(trimmed));
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
