import { useEffect, useMemo, useState } from 'react';
import {
  getDictionaryEntriesBatch,
  isValidChineseWordLocal,
  prefetchLocalDictionary,
} from '../services/dictionaryService';

export interface SmartChineseSegment {
  segment: string;
  index: number;
  input: string;
  isWordLike?: boolean;
}

function segmentWithBrowser(text: string): SmartChineseSegment[] {
  try {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    return Array.from(segmenter.segment(text)) as SmartChineseSegment[];
  } catch {
    return [{ segment: text, isWordLike: true, index: 0, input: text }];
  }
}

export function useSmartChineseSegments(text: string) {
  const fallbackSegments = useMemo(() => segmentWithBrowser(text), [text]);
  const [validatedSegments, setValidatedSegments] = useState<SmartChineseSegment[]>([]);

  useEffect(() => {
    let isMounted = true;
    setValidatedSegments([]);

    const validateSegments = async () => {
      try {
        await prefetchLocalDictionary();
        if (!isMounted) return;

        let processed: SmartChineseSegment[] = [];
        const unresolvedWords: string[] = [];

        for (const segment of segmentWithBrowser(text)) {
          const isChineseWord = segment.isWordLike && /[\u4E00-\u9FFF]/.test(segment.segment);
          if (!isChineseWord || segment.segment.length === 1) {
            processed.push(segment);
            continue;
          }

          const isValidWord = isValidChineseWordLocal(segment.segment);
          if (isValidWord === false) {
            processed.push(...Array.from(segment.segment).map((character, index) => ({
              segment: character,
              index: segment.index + index,
              input: text,
              isWordLike: true,
            })));
          } else {
            if (isValidWord === null) unresolvedWords.push(segment.segment);
            processed.push(segment);
          }
        }

        if (unresolvedWords.length > 0) {
          const validEntries = await getDictionaryEntriesBatch(unresolvedWords);
          if (!isMounted) return;
          processed = processed.flatMap((segment) => {
            if (!unresolvedWords.includes(segment.segment) || validEntries.has(segment.segment)) {
              return [segment];
            }
            return Array.from(segment.segment).map((character, index) => ({
              segment: character,
              index: segment.index + index,
              input: text,
              isWordLike: true,
            }));
          });
        }

        if (isMounted) setValidatedSegments(processed);
      } catch {
        if (isMounted) setValidatedSegments(fallbackSegments);
      }
    };

    validateSegments();
    return () => {
      isMounted = false;
    };
  }, [fallbackSegments, text]);

  return validatedSegments.length > 0 ? validatedSegments : fallbackSegments;
}
