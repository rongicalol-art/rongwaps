import { getDictionaryEntries, getDictionaryEntriesBatch } from './dictionaryService';
import { findMatchingCourseVocab, findMatchingCourseRecording, getCourseVocabForWords } from './courseVocabLookup';
import { beginnerDefinitions, sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import { numberToToneMarks } from '../utils/pinyin/pinyin';
import { splitCourseMeasureWords } from '../utils/vocabulary/measureWords';
import { audioService } from './audioService';

import type { SentenceWordContext, SentenceWordLookupResult } from '../types/sentenceLookup';
import { AppCache } from '../utils/cache';
import { pronunciationKey } from '../utils/pinyin/pronunciationMatching';
import { sentenceSegments, sentenceCandidates, validatedSentenceSegments } from '../utils/vocabulary/sentenceSegments';
export type { SentenceWordLookupResult } from '../types/sentenceLookup';

const wordCache = new AppCache(256);
const pendingWords = new Map<string, Promise<SentenceWordLookupResult | null>>();

/** Cache only resolved entries; a failed request must be retryable. Context never leaks between sentences. */
export async function lookupSentenceWord(
  word: string,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
  context?: SentenceWordContext,
): Promise<SentenceWordLookupResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;
  const authoredMeaning = context?.meaning || context?.english;
  if (authoredMeaning) {
    return { word: trimmed, pinyin: context?.pinyin ? numberToToneMarks(context.pinyin) : undefined,
      definitions: beginnerDefinitions([authoredMeaning]), hasAudio: true };
  }
  const key = JSON.stringify([trimmed, characterPreference, context?.pinyin || '']);
  const cached = wordCache.get<SentenceWordLookupResult>(key);
  if (cached) return cached;
  const pending = pendingWords.get(key);
  if (pending) return pending;
  const task = resolveSentenceWord(trimmed, characterPreference, context?.pinyin).then(result => {
    const resolved = result && context?.pinyin ? { ...result, pinyin: numberToToneMarks(context.pinyin) } : result;
    if (resolved?.definitions.length) wordCache.set(key, resolved);
    return resolved;
  }).finally(() => { pendingWords.delete(key); });
  pendingWords.set(key, task);
  return task;
}

export async function segmentSentenceText(text: string, authoredWords: string[] = []) {
  const segments = sentenceSegments(text, authoredWords);
  const candidates = sentenceCandidates(segments.filter(part => !authoredWords.includes(part.segment)));
  const valid = await validateSentenceWords(candidates);
  for (const word of authoredWords) valid.add(word);
  return validatedSentenceSegments(segments, valid);
}

/**
 * Validates which multi-character words exist as cohesive lexical units,
 * checking static dictionary packs and course vocabulary.
 */
export async function validateSentenceWords(words: string[]): Promise<Set<string>> {
  if (!words || words.length === 0) return new Set();

  const [dictEntries, courseVocabMap] = await Promise.all([
    getDictionaryEntriesBatch(words),
    getCourseVocabForWords(words).catch(() => new Map()),
  ]);

  const validSet = new Set<string>();

  for (const word of words) {
    const trimmed = word.trim();
    if (dictEntries.has(trimmed) || courseVocabMap.has(trimmed)) {
      validSet.add(word);
    }
  }

  return validSet;
}

/**
 * Multi-layer word lookup with graceful fallbacks:
 * 1. Course flashcard vocabulary (the book's meaning; names, lessons, grammar particles)
 * 2. Dictionary (CEDICT) entries with sanitized definitions
 * 3. Multi-character phrase decomposition (character-by-character readings & definitions)
 */
async function resolveSentenceWord(
  word: string,
  characterPreference: 'traditional' | 'simplified',
  expectedPinyin?: string,
): Promise<SentenceWordLookupResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  // 1. Book (course) vocabulary first: the meaning the learner was taught
  try {
    const courseCard = await findMatchingCourseVocab(trimmed);
    const readingMatches = !expectedPinyin || pronunciationKey(courseCard?.pinyin) === pronunciationKey(expectedPinyin);
    if (courseCard && readingMatches && [courseCard.front, courseCard.traditional, courseCard.simplified].includes(trimmed) && courseCard.back) {
      const pinyin = courseCard.pinyin ? numberToToneMarks(courseCard.pinyin) : '';
      const defs = courseCard.back
        ? splitCourseMeasureWords(courseCard.back)
            .meaning.split(/\s*•\s*/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 2)
        : [];

      if (defs.length) return {
        word: trimmed,
        headword: courseCard.traditional || trimmed,
        pinyin,
        definitions: defs,
        hasAudio: true,
      };
    }
  } catch {
    // Continue to dictionary lookup
  }

  // 2. CEDICT dictionary lookup
  try {
    const entries = await getDictionaryEntries(trimmed);
    if (entries && entries.length > 0) {
      // Beginner hover: skip proper-noun / abbreviation entries (新 Xīn "abbr. for Xinjiang")
      // when a common-word entry exists, and drop those senses from the gloss.
      const matching = expectedPinyin
        ? entries.filter(entry => entry.pinyin?.some(reading => pronunciationKey(reading) === pronunciationKey(expectedPinyin)))
        : entries;
      const cleaned = matching.map((entry) => ({
        entry,
        defs: beginnerDefinitions(sanitizeDictionaryDefinitions(entry.definitions, {
          preferredScript: characterPreference,
        }).definitions),
      }));
      const best = cleaned.find((c) => c.defs.length > 0) ?? cleaned[0];
      if (!best) return { word: trimmed, pinyin: expectedPinyin, definitions: [], hasAudio: true };
      const primary = best.entry;
      const rawPinyin = primary.pinyin?.[0] ? numberToToneMarks(primary.pinyin[0]) : '';
      const cleanDefs = best.defs.slice(0, 2);

      if (cleanDefs.length > 0 || rawPinyin) {
        return {
          word: trimmed,
          headword: primary.traditional || trimmed,
          pinyin: rawPinyin,
          definitions: cleanDefs,
          hasAudio: true,
        };
      }
    }
  } catch {
    // Continue to character decomposition
  }

  // Unknown phrases are read as validated words, never presented as a made-up compound.
  if (Array.from(trimmed).length > 1) {
    try {
      const segments = await segmentSentenceText(trimmed);
      const parts = await Promise.all(segments.filter(part => part.isWordLike).map(async part => {
        // A lexical entry without usable gloss must not recurse into itself.
        if (part.segment === trimmed) return { word: part.segment };
        const resolved = await lookupSentenceWord(part.segment, characterPreference);
        return { word: part.segment, pinyin: resolved?.pinyin, definition: resolved?.definitions[0] };
      }));
      if (parts.some(part => part.pinyin || part.definition)) {
        return { word: trimmed, definitions: [], fallbackParts: parts, hasAudio: true };
      }
    } catch {
      // Keep unknown and unavailable results retryable.
    }
  }

  // 4. Truly unknown word/character
  return {
    word: trimmed,
    definitions: [],
    hasAudio: true,
  };
}

/**
 * Pronounces a sentence word aloud:
 * Prefers natural course recording when available, otherwise browser speech.
 */
export async function playSentenceWordAudio(
  word: string,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
  rate?: number,
  pinyin?: string,
): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) return;

  const effectiveRate = rate ?? audioService.getDefaultRate();
  const language = characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN';

  try {
    const courseMatch = await findMatchingCourseRecording(trimmed, pinyin);
    if (courseMatch?.audio && audioService.isAudioFileName(courseMatch.audio)) {
      await audioService.play(courseMatch.audio, effectiveRate, trimmed, language);
      return;
    }
  } catch {
    // Fall back to TTS
  }

  void audioService.speakText(trimmed, language, effectiveRate * 0.9).catch(() => {});
}
