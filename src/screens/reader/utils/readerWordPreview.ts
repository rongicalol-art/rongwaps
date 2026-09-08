import type { DBDictionaryEntry } from '../../../types/database';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';

export interface ReaderWordPreview {
  word: string;
  /** Canonical headword for favorites/saving: the entry's traditional form when
   * available, otherwise the rendered word itself. */
  headword?: string;
  pinyin: string;
  definitions: string[];
  totalDefinitions: number;
}

const CHINESE_CHARACTER_REGEX = /[\u3400-\u9FFF]/;

import { getWordChunks } from '../../../utils/rubyPinyin';

/**
 * Extracts unique Chinese words/tokens from reading paragraphs to enable
 * single-request batch prefetching from the local dictionary cache.
 */
export function extractUniqueChineseWords(
  paragraphs: Array<{ traditional: string; simplified?: string; pinyin?: string }>,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
): string[] {
  const uniqueWords = new Set<string>();

  for (const p of paragraphs) {
    const text = characterPreference === 'simplified' && p.simplified ? p.simplified : p.traditional;
    if (!text) continue;

    if (p.pinyin) {
      const chunks = getWordChunks(text, p.pinyin);
      for (const chunk of chunks) {
        if (!chunk.isPunctuation && chunk.text.trim()) {
          uniqueWords.add(chunk.text.trim());
        }
      }
      continue;
    }

    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      for (const segment of segmenter.segment(text)) {
        const segText = segment.segment.trim();
        if (segText && CHINESE_CHARACTER_REGEX.test(segText)) {
          uniqueWords.add(segText);
        }
      }
    } else {
      const matches = text.match(/[\u3400-\u9FFF]+/g);
      if (matches) {
        for (const m of matches) {
          if (m.trim()) uniqueWords.add(m.trim());
        }
      }
    }
  }

  return Array.from(uniqueWords);
}

/**
 * Formats a dictionary entry into a concise preview suitable for the reading hover tooltip.
 * Keeps at most 2 primary definitions, reports total definitions count, and standardizes pinyin.
 */
export function formatWordPreview(
  word: string,
  entry?: DBDictionaryEntry | null,
  fallbackPinyin = '',
  options?: { preferredScript?: 'traditional' | 'simplified' },
): ReaderWordPreview {
  const trimmedWord = word.trim();
  const rawPinyin = entry?.pinyin && entry.pinyin.length > 0 ? entry.pinyin[0] : fallbackPinyin;
  const pinyin = rawPinyin ? rawPinyin.trim() : '';

  if (!entry) {
    return {
      word: trimmedWord,
      headword: trimmedWord,
      pinyin,
      definitions: [],
      totalDefinitions: 0,
    };
  }

  const { definitions: cleanDefs } = sanitizeDictionaryDefinitions(entry.definitions, {
    preferredScript: options?.preferredScript,
  });

  const primaryDefinitions = cleanDefs.slice(0, 2);

  return {
    word: trimmedWord,
    headword: entry.traditional || trimmedWord,
    pinyin,
    definitions: primaryDefinitions,
    totalDefinitions: cleanDefs.length,
  };
}
