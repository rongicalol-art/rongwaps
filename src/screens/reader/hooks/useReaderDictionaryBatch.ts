import { useEffect, useState, useCallback, useMemo } from 'react';
import type { DBDictionaryEntry } from '../../../types/database';
import type { ReadingRecord } from '../../../types/models';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import {
  extractUniqueChineseWords,
  formatWordPreview,
  type ReaderWordPreview,
} from '../utils/readerWordPreview';

interface UseReaderDictionaryBatchOptions {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
}

export function useReaderDictionaryBatch({
  reading,
  characterPreference,
}: UseReaderDictionaryBatchOptions) {
  const [dictionaryMap, setDictionaryMap] = useState<Map<string, DBDictionaryEntry>>(
    () => new Map(),
  );

  const words = useMemo(() => {
    if (!reading?.paragraphs) return [];
    return extractUniqueChineseWords(reading.paragraphs, characterPreference);
  }, [reading?.paragraphs, characterPreference]);

  useEffect(() => {
    let isMounted = true;
    if (words.length === 0) return;

    getDictionaryEntriesBatch(words)
      .then((entries) => {
        if (isMounted) {
          setDictionaryMap(entries);
        }
      })
      .catch((err) => {
        console.warn('Reader dictionary prefetch failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [words]);

  const getPreview = useCallback(
    (word: string, fallbackPinyin = ''): ReaderWordPreview => {
      const entry = dictionaryMap.get(word.trim());
      return formatWordPreview(word, entry, fallbackPinyin, {
        preferredScript: characterPreference,
      });
    },
    [dictionaryMap, characterPreference],
  );

  return {
    getPreview,
  };
}
