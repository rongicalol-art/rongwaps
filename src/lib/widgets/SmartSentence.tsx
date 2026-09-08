import { useEffect, useState, useMemo } from 'react';

export interface SmartSentenceProps {
  text: string;
  className?: string;
  bookAccent?: string;
  highlightTerms?: string[];
  onWordClick?: (word: string) => void;
  validateWords?: (words: string[]) => Promise<Map<string, unknown> | Set<string>>;
}

interface SegmentData {
  segment: string;
  index: number;
  input: string;
  isWordLike?: boolean;
}

interface HighlightRange {
  start: number;
  end: number;
}

function findHighlightRanges(text: string, highlightTerms: string[]): HighlightRange[] {
  const terms = Array.from(new Set(highlightTerms.filter(Boolean)))
    .sort((a, b) => b.length - a.length);
  const ranges: HighlightRange[] = [];

  terms.forEach((term) => {
    let start = text.indexOf(term);
    while (start >= 0) {
      ranges.push({ start, end: start + term.length });
      start = text.indexOf(term, start + term.length);
    }
  });

  return ranges;
}

function renderHighlightedText(text: string, startIndex: number, ranges: HighlightRange[]) {
  if (ranges.length === 0) return text;

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let index = 0;

  while (index < text.length) {
    const highlighted = ranges.some((range) => (
      startIndex + index >= range.start && startIndex + index < range.end
    ));
    const previous = parts.at(-1);
    if (previous && previous.highlighted === highlighted) {
      previous.text += text[index];
    } else {
      parts.push({ text: text[index], highlighted });
    }
    index += 1;
  }

  return parts.map((part, partIndex) => part.highlighted ? (
    <span key={partIndex} className="font-black text-brand-primary">
      {part.text}
    </span>
  ) : part.text);
}

export function SmartSentence({
  text,
  className = '',
  highlightTerms = [],
  onWordClick,
  validateWords,
}: SmartSentenceProps) {
  const [finalSegments, setFinalSegments] = useState<SegmentData[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    async function validateAndSetSegments() {
      try {
        const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
        const initialSegments = Array.from(segmenter.segment(text)) as SegmentData[];

        if (!validateWords) {
          if (isMounted) setFinalSegments(initialSegments);
          return;
        }

        const wordsRequiringNetworkValidation = initialSegments
          .filter((seg) => seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment) && Array.from(seg.segment).length > 1)
          .map((seg) => seg.segment);

        const validResult = wordsRequiringNetworkValidation.length > 0
          ? await validateWords(wordsRequiringNetworkValidation)
          : null;
        if (!isMounted) return;

        const validSet = validResult instanceof Set
          ? validResult
          : validResult instanceof Map
            ? new Set(validResult.keys())
            : new Set<string>();

        const processed = initialSegments.flatMap((seg) => {
          const isChineseWord = seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment);
          if (isChineseWord && Array.from(seg.segment).length > 1 && !validSet.has(seg.segment)) {
            const chars = Array.from(seg.segment);
            return chars.map((char, i) => ({ segment: char, index: seg.index + i, input: text, isWordLike: true }));
          }
          return [seg];
        });

        if (!isMounted) return;
        setFinalSegments(processed);
      } catch {
        if (!isMounted) return;
        setFinalSegments([{ segment: text, isWordLike: true, index: 0, input: text }]);
      }
    }
    
    validateAndSetSegments();
    
    return () => {
      isMounted = false;
    };
  }, [text, validateWords]);

  // Provide an immediate fallback while async validation is happening
  const fallbackSegments = useMemo(() => {
    try {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      return Array.from(segmenter.segment(text)) as SegmentData[];
    } catch {
      return [{ segment: text, isWordLike: true, index: 0, input: text }];
    }
  }, [text]);

  const displaySegments = finalSegments.length > 0 ? finalSegments : fallbackSegments;
  const highlightRanges = useMemo(
    () => findHighlightRanges(text, highlightTerms),
    [highlightTerms, text],
  );

  return (
    <span className={`inline-block ${className}`}>
      {displaySegments.map((seg, idx) => {
        // Only Chinese characters that are word-like should be clickable
        const isClickable = seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment);
        
        if (isClickable) {
          return (
            <button
              key={`${idx}-${seg.segment}`}
              type="button"
              aria-label={`Open ${seg.segment} in the dictionary`}
              onClick={(e) => {
                e.stopPropagation();
                if (onWordClick) {
                  onWordClick(seg.segment);
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('app:select-dictionary-word', { detail: { word: seg.segment } }),
                  );
                }
              }}
              className="-mx-0.5 cursor-pointer rounded-[8px] px-0.5 align-baseline text-ui-ink outline-none transition-colors hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover focus-visible:ring-2 focus-visible:ring-brand-primary/35 active:translate-y-px active:bg-ui-divider"
            >
              {renderHighlightedText(seg.segment, seg.index, highlightRanges)}
            </button>
          );
        }
        return (
          <span key={`${idx}-${seg.segment}`} className="align-baseline text-ui-ink">
            {renderHighlightedText(seg.segment, seg.index, highlightRanges)}
          </span>
        );
      })}
    </span>
  );
}
