import { getDictionaryEntries, getDictionaryEntriesBatch } from './dictionaryService';
import { findMatchingCourseVocab, getCourseVocabLookupMap } from './courseVocabLookup';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';
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
 * 1. Dictionary (CEDICT) entries with sanitized definitions
 * 2. Course flashcard vocabulary (names, lessons, grammar particles)
 * 3. Multi-character phrase decomposition (character-by-character readings & definitions)
 */
export async function lookupSentenceWord(
  word: string,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
): Promise<SentenceWordLookupResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  // 1. CEDICT Dictionary lookup
  try {
    const entries = await getDictionaryEntries(trimmed);
    if (entries && entries.length > 0) {
      const primary = entries[0];
      const rawPinyin = primary.pinyin?.[0] ? numberToToneMarks(primary.pinyin[0]) : '';
      const cleanDefs = sanitizeDictionaryDefinitions(primary.definitions, {
        preferredScript: characterPreference,
      }).definitions.slice(0, 2);

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
    // Continue to course vocabulary fallback
  }

  // 2. Course vocabulary fallback (names like 李友, 王朋, lesson terms)
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
    // Continue to sub-character decomposition
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
): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) return;

  const language = characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN';

  try {
    const courseMatch = await findMatchingCourseVocab(trimmed);
    if (courseMatch?.audio && audioService.isAudioFileName(courseMatch.audio)) {
      await audioService.play(courseMatch.audio, 1.0, trimmed, language);
      return;
    }
  } catch {
    // Fall back to TTS
  }

  void audioService.speakText(trimmed, language, 0.9).catch(() => {});
}
