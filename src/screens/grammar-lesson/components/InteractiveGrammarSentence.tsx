import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useSmartChineseSegments } from '../../../hooks/useSmartChineseSegments';
import type { GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface InteractiveGrammarSentenceProps {
  words: GrammarWordToken[];
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  align?: 'start' | 'center';
  tone?: 'default' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  focusTerms?: string[];
  activeAlignmentId?: string | null;
  onActiveAlignmentChange?: (alignmentId: string | null) => void;
  onOpenWord: (word: string) => void;
}

const TEACHING_TEXT_SIZE_CLASSES = {
  lg: 'text-xl sm:text-2xl',
  md: 'text-base sm:text-lg',
  sm: 'text-sm sm:text-base',
} as const;

export function InteractiveGrammarSentence({
  words,
  characterPreference,
  showPinyin,
  align = 'start',
  tone = 'default',
  size = 'lg',
  className,
  focusTerms = [],
  activeAlignmentId = null,
  onActiveAlignmentChange,
  onOpenWord,
}: InteractiveGrammarSentenceProps) {
  const [previewWordId, setPreviewWordId] = useState<string | null>(null);
  const teachingTextSizeClass = TEACHING_TEXT_SIZE_CLASSES[size];
  const segmentationInput = useMemo(() => words.map((word) => (
    characterPreference === 'simplified' && word.simplified ? word.simplified : word.traditional
  )).join(' '), [characterPreference, words]);
  const smartSegments = useSmartChineseSegments(segmentationInput);
  const displayWords = useMemo(() => {
    const remainingWords = [...words];
    const orderedWords = smartSegments
      .filter((segment) => /[\u4E00-\u9FFF]/.test(segment.segment))
      .map((segment) => {
        const matchIndex = remainingWords.findIndex((word) => {
          const text = characterPreference === 'simplified' && word.simplified
            ? word.simplified
            : word.traditional;
          return text === segment.segment;
        });
        if (matchIndex === -1) return null;
        return remainingWords.splice(matchIndex, 1)[0];
      });

    return orderedWords.every(Boolean) && orderedWords.length === words.length
      ? orderedWords as GrammarWordToken[]
      : words;
  }, [characterPreference, smartSegments, words]);

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-x-0 gap-y-3',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {displayWords.map((word) => {
        const text = characterPreference === 'simplified' && word.simplified
          ? word.simplified
          : word.traditional;
        const isOpen = previewWordId === word.id;
        const isFocus = focusTerms.includes(text);
        const isAligned = Boolean(word.alignmentId && word.alignmentId === activeAlignmentId);
        const tooltipId = `grammar-word-${word.id}`;

        return (
          <span key={word.id} className="relative inline-flex flex-col items-center">
            <span className="inline-flex items-baseline whitespace-nowrap">
              {word.prefix && (
                <span className={cn('font-sans font-black leading-tight text-ui-muted-strong', teachingTextSizeClass)}>
                  {word.prefix}
                </span>
              )}
              <button
                type="button"
                onMouseEnter={() => {
                  setPreviewWordId(word.id);
                  onActiveAlignmentChange?.(word.alignmentId ?? null);
                }}
                onMouseLeave={() => {
                  setPreviewWordId(null);
                  onActiveAlignmentChange?.(null);
                }}
                onFocus={() => {
                  setPreviewWordId(word.id);
                  onActiveAlignmentChange?.(word.alignmentId ?? null);
                }}
                onBlur={() => {
                  setPreviewWordId(null);
                  onActiveAlignmentChange?.(null);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onActiveAlignmentChange?.(word.alignmentId ?? null);
                  onOpenWord(text);
                }}
                data-grammar-word-id={word.id}
                aria-describedby={isOpen ? tooltipId : undefined}
                aria-label={`${text}: ${word.pinyin}, ${word.meaning}`}
                className={cn(
                  '-mx-0.5 rounded-[8px] px-0.5 font-chinese font-black leading-tight outline-none transition-colors hover:bg-brand-primary-soft focus-visible:bg-brand-primary-soft focus-visible:ring-2 focus-visible:ring-brand-primary/35 active:bg-brand-primary-soft',
                  teachingTextSizeClass,
                  isFocus
                    ? 'bg-transparent text-brand-primary'
                    : tone === 'accent' ? 'text-brand-primary' : 'text-ui-ink-strong',
                  isOpen && 'bg-brand-primary-soft',
                  isAligned && 'bg-brand-primary text-ui-surface hover:bg-brand-primary focus-visible:bg-brand-primary',
                )}
              >
                {text}
              </button>
              {word.suffix && (
                <span className={cn('font-chinese font-black leading-tight text-ui-ink-strong', teachingTextSizeClass)}>
                  {word.suffix}
                </span>
              )}
            </span>

            {showPinyin && (
              <span className="mx-0.5 mt-1 whitespace-nowrap text-[11px] font-extrabold leading-none text-brand-primary sm:text-xs">
                {word.pinyin}
              </span>
            )}

            <AnimatePresence>
              {isOpen && (
                <motion.span
                  id={tooltipId}
                  role="tooltip"
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-40 w-max min-w-[112px] max-w-[180px] -translate-x-1/2 rounded-[12px] border-b-2 border-ui-border bg-ui-ink-strong px-3 py-2 text-center shadow-lg"
                >
                  <span className="block text-xs font-black text-brand-primary/70">{word.pinyin}</span>
                  <span className="mt-0.5 block text-xs font-bold leading-snug text-white">{word.meaning}</span>
                  <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-ui-ink-strong" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        );
      })}
    </div>
  );
}
