import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { debugLogger } from '../../utils/debug/debugLogger';
import { calculateTooltipPlacement, type AnchorPosition, type TooltipPlacement } from '../../utils/browser/tooltipPosition';
import { AppIcon } from './AppIcon';

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

export interface SentenceLookupHandlers {
  lookupWord?: (word: string) => Promise<SentenceWordLookupResult | null>;
  validateWords?: (words: string[]) => Promise<Set<string> | Map<string, unknown>>;
  playAudio?: (word: string) => Promise<void> | void;
}

let defaultHandlers: SentenceLookupHandlers = {};

/**
 * Register app-wide default handlers for word lookups and audio playback,
 * allowing SmartSentence to stay decoupled from services and stores.
 */
export function registerSentenceLookupHandlers(handlers: SentenceLookupHandlers) {
  defaultHandlers = { ...defaultHandlers, ...handlers };
}

export interface SmartSentenceProps {
  text: string;
  className?: string;
  bookAccent?: string;
  highlightTerms?: string[];
  onWordClick?: (word: string) => void;
  validateWords?: (words: string[]) => Promise<Map<string, unknown> | Set<string>>;
  lookupWord?: (word: string) => Promise<SentenceWordLookupResult | null>;
  onPlayAudio?: (word: string) => void;
  /** Whether to show definition tooltips on hover (desktop). Defaults to true. */
  enableHoverTooltip?: boolean;
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

export interface HoveredWordState {
  word: string;
  anchor: AnchorPosition;
  info: SentenceWordLookupResult | null;
  loading: boolean;
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

let sharedSegmenter: Intl.Segmenter | null = null;

function getSharedSegmenter(): Intl.Segmenter {
  if (!sharedSegmenter) {
    sharedSegmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  }
  return sharedSegmenter;
}

function segmentChineseText(text: string): SegmentData[] {
  try {
    return Array.from(getSharedSegmenter().segment(text)) as SegmentData[];
  } catch (error) {
    debugLogger.warn('App', 'Intl.Segmenter failure, using raw text fallback', error);
    return [{ segment: text, isWordLike: true, index: 0, input: text }];
  }
}

// Memory cache for looked-up words across sentences to make hover instant
const wordLookupCache = new Map<string, SentenceWordLookupResult>();
const NO_HIGHLIGHTS: string[] = [];

export function SmartSentence({
  text,
  className = '',
  highlightTerms = NO_HIGHLIGHTS,
  onWordClick,
  validateWords,
  lookupWord,
  onPlayAudio,
  enableHoverTooltip = true,
}: SmartSentenceProps) {
  const [finalSegments, setFinalSegments] = useState<{ text: string; segments: SegmentData[] } | null>(null);
  const [hoveredWord, setHoveredWord] = useState<HoveredWordState | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTooltipOpenRef = useRef(false);

  const fallbackSegments = useMemo(() => segmentChineseText(text), [text]);
  const activeValidator = validateWords || defaultHandlers.validateWords;
  const activeLookup = lookupWord || defaultHandlers.lookupWord;
  const activePlayAudio = onPlayAudio || defaultHandlers.playAudio;

  const reduceMotion = useReducedMotion();

  // Validate multi-character segments against dictionary
  useEffect(() => {
    if (!activeValidator) return;
    let isMounted = true;

    async function validateAndSetSegments(fn: (words: string[]) => Promise<Map<string, unknown> | Set<string>>) {
      try {
        const initialSegments = fallbackSegments;

        const wordsRequiringNetworkValidation = initialSegments
          .filter((seg) => seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment) && Array.from(seg.segment).length > 1)
          .map((seg) => seg.segment);

        const validResult = wordsRequiringNetworkValidation.length > 0
          ? await fn(wordsRequiringNetworkValidation)
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
        setFinalSegments({ text, segments: processed });
      } catch (error) {
        if (!isMounted) return;
        debugLogger.warn('App', 'SmartSentence word validation failed, using fallback', error);
        setFinalSegments({ text, segments: fallbackSegments });
      }
    }

    void validateAndSetSegments(activeValidator);

    return () => {
      isMounted = false;
    };
  }, [text, fallbackSegments, activeValidator]);

  const displaySegments = activeValidator && finalSegments?.text === text ? finalSegments.segments : fallbackSegments;
  const highlightRanges = useMemo(
    () => findHighlightRanges(text, highlightTerms),
    [highlightTerms, text],
  );

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const closeTooltip = useCallback(() => {
    clearTimers();
    setHoveredWord(null);
    setActiveWordKey(null);
    isTooltipOpenRef.current = false;
  }, [clearTimers]);

  const tooltipActive = Boolean(hoveredWord || activeWordKey);
  useEffect(() => {
    if (!tooltipActive) return;
    const handleScroll = () => closeTooltip();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTooltip();
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimers();
    };
  }, [closeTooltip, clearTimers, tooltipActive]);
  useEffect(() => clearTimers, [clearTimers]);

  const openWordTooltip = useCallback(
    (word: string, element: HTMLElement) => {
      if (!enableHoverTooltip || !activeLookup) return;

      const rect = element.getBoundingClientRect();
      const anchor: AnchorPosition = {
        x: rect.left + rect.width / 2,
        top: rect.top,
        bottom: rect.bottom,
      };

      const cached = wordLookupCache.get(word);
      if (cached) {
        setHoveredWord({
          word,
          anchor,
          info: cached,
          loading: false,
        });
        isTooltipOpenRef.current = true;
        return;
      }

      setHoveredWord({
        word,
        anchor,
        info: null,
        loading: true,
      });
      isTooltipOpenRef.current = true;

      void activeLookup(word).then((result) => {
        if (result) {
          wordLookupCache.set(word, result);
          if (wordLookupCache.size > 256) wordLookupCache.delete(wordLookupCache.keys().next().value!);
        }
        setHoveredWord((prev) => (prev && prev.word === word ? { ...prev, info: result, loading: false } : prev));
      }).catch(() => {
        setHoveredWord((prev) => (prev && prev.word === word ? { ...prev, loading: false } : prev));
      });
    },
    [activeLookup, enableHoverTooltip],
  );

  const handlePointerEnterWord = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, word: string, wordKey: string) => {
      if (e.pointerType === 'touch' || !enableHoverTooltip || !activeLookup) return;

      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      setActiveWordKey(wordKey);
      const element = e.currentTarget;

      // Swap immediately if a tooltip was already open in this sentence
      if (isTooltipOpenRef.current) {
        openWordTooltip(word, element);
        return;
      }

      hoverTimerRef.current = setTimeout(() => {
        openWordTooltip(word, element);
      }, 100);
    },
    [activeLookup, enableHoverTooltip, openWordTooltip],
  );

  const handlePointerLeaveWord = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setActiveWordKey(null);
    leaveTimerRef.current = setTimeout(() => {
      setHoveredWord(null);
      isTooltipOpenRef.current = false;
    }, 120);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setHoveredWord(null);
      isTooltipOpenRef.current = false;
    }, 120);
  }, []);

  return (
    <span className={cn('inline', className)}>
      {displaySegments.map((seg, idx) => {
        const isClickable = seg.isWordLike && /[\u4E00-\u9FFF]/.test(seg.segment);
        const wordKey = `${idx}-${seg.segment}`;
        const isCurrentWordActive = activeWordKey === wordKey || hoveredWord?.word === seg.segment;

        if (isClickable) {
          return (
            <button
              key={wordKey}
              type="button"
              aria-label={`Open ${seg.segment} in the dictionary`}
              onPointerEnter={(e) => handlePointerEnterWord(e, seg.segment, wordKey)}
              onPointerLeave={handlePointerLeaveWord}
              onFocus={(e) => handlePointerEnterWord(e as unknown as React.PointerEvent<HTMLButtonElement>, seg.segment, wordKey)}
              onBlur={handlePointerLeaveWord}
              onClick={(e) => {
                e.stopPropagation();
                closeTooltip();
                if (onWordClick) {
                  onWordClick(seg.segment);
                } else if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('app:select-dictionary-word', { detail: { word: seg.segment } }),
                  );
                }
              }}
              className={cn(
                '-mx-0.5 cursor-pointer rounded-xs px-0.5 align-baseline transition-colors focus-ring-inline',
                isCurrentWordActive
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-ui-ink hover:bg-brand-primary/10 hover:text-brand-primary focus-visible:bg-brand-primary/10 focus-visible:text-brand-primary active:bg-brand-primary/20',
              )}
            >
              {renderHighlightedText(seg.segment, seg.index, highlightRanges)}
            </button>
          );
        }
        return (
          <span key={wordKey} className="align-baseline text-ui-ink">
            {renderHighlightedText(seg.segment, seg.index, highlightRanges)}
          </span>
        );
      })}

      {hoveredWord && typeof document !== 'undefined' && (
        <SentenceWordTooltipPortal
          data={hoveredWord}
          reduceMotion={Boolean(reduceMotion)}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          onPlayAudio={activePlayAudio ? () => activePlayAudio(hoveredWord.word) : undefined}
        />
      )}
    </span>
  );
}

export function SentenceWordTooltipPortal({
  data,
  reduceMotion,
  onMouseEnter,
  onMouseLeave,
  onPlayAudio,
}: {
  data: HoveredWordState;
  reduceMotion: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPlayAudio?: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>(() =>
    calculateTooltipPlacement(data.anchor, { width: 260, height: 90 }),
  );

  useEffect(() => {
    if (!tooltipRef.current) return;
    const width = tooltipRef.current.offsetWidth || 260;
    const height = tooltipRef.current.offsetHeight || 90;
    setPlacement(calculateTooltipPlacement(data.anchor, { width, height }));
  }, [data.anchor, data.info]);

  const pinyin = data.info?.pinyin;
  const definitions = data.info?.definitions || [];
  const fallbackParts = data.info?.fallbackParts || [];

  return createPortal(
    <div
      data-sentence-word-tooltip="true"
      className="pointer-events-auto fixed z-tooltip"
      style={{
        left: placement.left,
        top: placement.top,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <motion.div
        ref={tooltipRef}
        role="tooltip"
        aria-label={`${data.word} definition`}
        initial={{ opacity: 0, scale: 0.97, y: placement.above ? 4 : -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
        className="relative w-72 max-w-[88vw] select-none rounded-feature bg-ui-ink-strong px-3.5 py-2.5 text-left shadow-ambient-lg"
      >
        <div className="flex items-start justify-between gap-2.5">
          {/* Word + Pinyin */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 pt-0.5">
            <span className="font-chinese text-lg font-black leading-tight text-white">
              {data.word}
            </span>
            {pinyin && (
              <span className="font-sans text-xs font-black tracking-wide text-brand-primary">
                {pinyin}
              </span>
            )}
          </div>

          {/* Quick Pronounce Speaker */}
          {onPlayAudio && (
            <button
              type="button"
              aria-label={`Hear ${data.word}`}
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-ring"
            >
              <AppIcon name="audio" size={15} />
            </button>
          )}
        </div>

        {/* Content */}
        {data.loading ? (
          <div className="mt-2 space-y-1" aria-hidden="true">
            <div className="h-3 w-3/4 animate-pulse rounded-xs bg-white/20" />
            <div className="h-3 w-1/2 animate-pulse rounded-xs bg-white/15" />
          </div>
        ) : definitions.length > 0 ? (
          <div className="mt-1.5 space-y-0.5">
            {definitions.map((def, idx) => (
              <p
                key={idx}
                className="font-sans text-xs leading-snug break-words text-white/85"
              >
                {definitions.length > 1 && (
                  <span className="mr-1 text-white/40">{idx + 1}.</span>
                )}
                {def}
              </p>
            ))}
          </div>
        ) : fallbackParts.length > 0 ? (
          <div className="mt-1.5 space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-white/45">
              Read as words
            </p>
            <div className="space-y-1">
              {fallbackParts.map((part, idx) => (
                <div key={idx} className="flex min-w-0 items-baseline gap-1.5 text-xs">
                  <span className="font-chinese font-black text-white">{part.word}</span>
                  {part.pinyin && (
                    <span className="font-sans font-bold text-brand-primary">{part.pinyin}</span>
                  )}
                  {part.definition && (
                    <span className="truncate text-white/75">{part.definition}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-1 font-sans text-xs font-semibold text-white/50">
            No definition recorded · Tap to search
          </p>
        )}

        {/* Pointer Arrow */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute h-0 w-0 border-x-4 border-x-transparent',
            placement.above
              ? 'top-full border-t-4 border-t-ui-ink-strong'
              : 'bottom-full border-b-4 border-b-ui-ink-strong',
          )}
          style={{ left: placement.arrowLeft }}
        />
      </motion.div>
    </div>,
    document.body,
  );
}
