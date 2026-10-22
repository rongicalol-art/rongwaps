import { getDictionaryEntries, getDictionaryEntriesBatch } from './dictionaryService';
import { findMatchingCourseVocab, getCourseVocabLookupMap } from './courseVocabLookup';
import { beginnerDefinitions, sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
import { numberToToneMarks } from '../utils/pinyin/pinyin';
import { splitCourseMeasureWords } from '../utils/vocabulary/measureWords';
import { audioService } from './audioService';

export interface SentenceWordPart {
  word: string;
  pinyin?: string;
  definition?: string;
}

export interface SentenceWordLookupResult {
  word: string;
  pinyin?: string;
  definitions: string[];
  fallbackParts?: SentenceWordPart[];
  hasAudio?: boolean;
}

/**
 * Validates which multi-character words exist as cohesive lexical units,
 * checking static dictionary packs and course vocabulary.
 */
export async function validateSentenceWords(words: string[]): Promise<Set<string>> {
  if (!words || words.length === 0) return new Set();

  const [dictEntries, courseVocabMap] = await Promise.all([
    getDictionaryEntriesBatch(words),
    getCourseVocabLookupMap().catch(() => new Map()),
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
export async function lookupSentenceWord(
  word: string,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
): Promise<SentenceWordLookupResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  // 1. Book (course) vocabulary first: the meaning the learner was taught
  try {
    const courseCard = await findMatchingCourseVocab(trimmed);
    if (courseCard) {
      const pinyin = courseCard.pinyin ? numberToToneMarks(courseCard.pinyin) : '';
      const defs = courseCard.back
        ? splitCourseMeasureWords(courseCard.back)
            .meaning.split(/\s*•\s*/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 2)
        : [];

      return {
        word: trimmed,
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
      const cleaned = entries.map((entry) => ({
        entry,
        defs: beginnerDefinitions(sanitizeDictionaryDefinitions(entry.definitions, {
          preferredScript: characterPreference,
        }).definitions),
      }));
      const best = cleaned.find((c) => c.defs.length > 0) ?? cleaned[0];
      const primary = best.entry;
      const rawPinyin = primary.pinyin?.[0] ? numberToToneMarks(primary.pinyin[0]) : '';
      const cleanDefs = best.defs.slice(0, 2);

      if (cleanDefs.length > 0 || rawPinyin) {
        return {
          word: trimmed,
          pinyin: rawPinyin,
          definitions: cleanDefs,
          hasAudio: true,
        };
      }
    }
  } catch {
    // Continue to character decomposition
  }

  // 3. Multi-character phrase decomposition (e.g. unknown compound, idiom, or A-not-A form)
  const chars = Array.from(trimmed);
  if (chars.length > 1) {
    try {
      const resolvedParts: SentenceWordPart[] = [];
      for (const char of chars) {
        const charEntries = await getDictionaryEntries(char);
        if (charEntries && charEntries.length > 0) {
          const entry = charEntries[0];
          const pinyin = entry.pinyin?.[0] ? numberToToneMarks(entry.pinyin[0]) : '';
          const defs = sanitizeDictionaryDefinitions(entry.definitions, {
            preferredScript: characterPreference,
          }).definitions;
          resolvedParts.push({
            word: char,
            pinyin,
            definition: defs[0] || '',
          });
        } else {
          resolvedParts.push({ word: char });
        }
      }

      if (resolvedParts.some((part) => part.definition || part.pinyin)) {
        return {
          word: trimmed,
          definitions: [],
          fallbackParts: resolvedParts,
          hasAudio: true,
        };
      }
    } catch {
      // Fallback
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
): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) return;

  const effectiveRate = rate ?? audioService.getDefaultRate();
  const language = characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN';

  try {
    const courseMatch = await findMatchingCourseVocab(trimmed);
    if (courseMatch?.audio && audioService.isAudioFileName(courseMatch.audio)) {
      await audioService.play(courseMatch.audio, effectiveRate, trimmed, language);
      return;
    }
  } catch {
    // Fall back to TTS
  }

  void audioService.speakText(trimmed, language, effectiveRate * 0.9).catch(() => {});
}
