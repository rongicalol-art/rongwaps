import { useEffect, useMemo, useState } from 'react';
import { getDictionaryEntriesBatch } from '../services/dictionaryService';

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
        const segments = segmentWithBrowser(text);

        // Multi-character Chinese word-like segments are verified against the
        // dictionary (static shard packs first, then Supabase). Single
        // characters and non-Chinese tokens pass through untouched.
        const wordsToVerify = segments
          .filter((segment) => (
            segment.isWordLike
            && /[\u4E00-\u9FFF]/.test(segment.segment)
            && Array.from(segment.segment).length > 1
          ))
          .map((segment) => segment.segment);

        const validEntries = wordsToVerify.length > 0
          ? await getDictionaryEntriesBatch(wordsToVerify)
          : new Map<string, never>();

        if (!isMounted) return;

        const processed: SmartChineseSegment[] = [];
        for (const segment of segments) {
          const isChineseWord = segment.isWordLike && /[\u4E00-\u9FFF]/.test(segment.segment);
          if (isChineseWord && Array.from(segment.segment).length > 1 && !validEntries.has(segment.segment)) {
            processed.push(...Array.from(segment.segment).map((character, index) => ({
              segment: character,
              index: segment.index + index,
              input: text,
              isWordLike: true,
            })));
          } else {
            processed.push(segment);
          }
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
