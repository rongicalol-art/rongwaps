import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getDictionaryEntriesBatch, prefetchLocalDictionary, isValidChineseWordLocal } from '../../services/dictionaryService';

interface SmartSentenceProps {
  text: string;
  className?: string;
  bookAccent?: string;
}

interface SegmentData {
  segment: string;
  index: number;
  input: string;
  isWordLike?: boolean;
}

export function SmartSentence({ text, className = '', bookAccent = 'text-[#1CB0F6]' }: SmartSentenceProps) {
  const { setDictionaryWord } = useAppStore();
  const [finalSegments, setFinalSegments] = useState<SegmentData[]>([]);

  // Trigger prefetch of local dict trie early
  useEffect(() => {
    prefetchLocalDictionary();
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    async function validateAndSetSegments() {
      try {
        // Wait for the local dictionary map to load before trying to validate, 
        // to avoid huge concurrent network fetches for every sentence word on first load.
        await prefetchLocalDictionary();
        if (!isMounted) return;

        const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
        const initialSegments = Array.from(segmenter.segment(text));
        
        let processed: SegmentData[] = [];
        let wordsRequiringNetworkValidation: string[] = [];
        
        // Pass 1: Local synchronous validation
        for (const seg of initialSegments) {
          const isChineseWord = seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment);
          if (isChineseWord && seg.segment.length > 1) {
            const isLocalValid = isValidChineseWordLocal(seg.segment);
            if (isLocalValid === false) {
               // Definitely not in dictionary, branch it early
               const chars = Array.from(seg.segment);
               chars.forEach((char, i) => {
                 processed.push({ segment: char, index: seg.index + i, input: text, isWordLike: true });
               });
            } else if (isLocalValid === true) {
               // Definitely in dictionary
               processed.push(seg);
            } else {
               // Local Dictionary hasn't loaded yet! Defer for network resolution
               wordsRequiringNetworkValidation.push(seg.segment);
               processed.push(seg); // Temporarily keep it intact until network responds
            }
          } else {
            processed.push(seg);
          }
        }
        
        // Pass 2: Handle any words that required network block (only happens if local isn't loaded)
        if (wordsRequiringNetworkValidation.length > 0) {
           const validMap = await getDictionaryEntriesBatch(wordsRequiringNetworkValidation);
           if (!isMounted) return;
           
           // We re-loop over processed to split the unresolved ones
           processed = processed.flatMap((seg) => {
              if (wordsRequiringNetworkValidation.includes(seg.segment)) {
                 if (!validMap.has(seg.segment)) {
                   const chars = Array.from(seg.segment);
                   return chars.map((char, i) => ({ segment: char, index: seg.index + i, input: text, isWordLike: true }));
                 }
              }
              return [seg];
           });
        }

        if (!isMounted) return;
        setFinalSegments(processed);
      } catch (e) {
        if (!isMounted) return;
        setFinalSegments([{ segment: text, isWordLike: true, index: 0, input: text }]);
      }
    }
    
    validateAndSetSegments();
    
    return () => {
      isMounted = false;
    };
  }, [text]);

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

  return (
    <span className={`inline-block ${className}`}>
      {displaySegments.map((seg, idx) => {
        // Only Chinese characters that are word-like should be clickable
        const isClickable = seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment);
        
        if (isClickable) {
          return (
            <button
              key={`${idx}-${seg.segment}`}
              onClick={(e) => {
                e.stopPropagation();
                setDictionaryWord(seg.segment);
              }}
              className={`hover:bg-[#F2F2F2] active:bg-[#E5E5E5] transition-colors rounded-[8px] cursor-pointer outline-none align-baseline -mx-[2px] px-[2px] text-black hover:opacity-80 active:translate-y-[1px]`}
            >
              {seg.segment}
            </button>
          );
        }
        return <span key={`${idx}-${seg.segment}`} className="align-baseline text-black">{seg.segment}</span>;
      })}
    </span>
  );
}
