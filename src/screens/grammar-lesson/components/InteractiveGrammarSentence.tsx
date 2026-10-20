import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { useSmartChineseSegments } from '../hooks/useSmartChineseSegments';
import type { GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getFocusTokenIds } from '../utils/grammarFocusTokens';
import {
  getGrammarSemanticRole,
  getSemanticRoleClasses,
  getSemanticRoleSoftBgClasses,
} from '../../../utils/grammar/grammarSemanticRoles';
import {
  SentenceWordTooltipPortal,
  type HoveredWordState,
  type SentenceWordLookupResult,
} from '../../../lib/widgets';
import type { AnchorPosition } from '../../../utils/browser/tooltipPosition';
import { lookupSentenceWord, playSentenceWordAudio } from '../../../services/sentenceLookupService';

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

const NO_FOCUS_TERMS: string[] = [];
const CLOSING_PUNCTUATION = /^[。？！，」]+$/;

const TEACHING_TEXT_SIZE_CLASSES = {
  lg: 'text-2xl',
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
  focusTerms = NO_FOCUS_TERMS,
  activeAlignmentId = null,
  onActiveAlignmentChange,
  onOpenWord,
}: InteractiveGrammarSentenceProps) {
  const [hoveredWord, setHoveredWord] = useState<HoveredWordState | null>(null);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTooltipOpenRef = useRef(false);
  const reduceMotion = Boolean(useReducedMotion());

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

  const focusTokenIds = useMemo(
    () => getFocusTokenIds(displayWords, focusTerms, characterPreference),
    [characterPreference, displayWords, focusTerms],
  );

  // A closing mark that is its own token rides as the previous word's suffix, so it never wraps alone.
  const shownWords = useMemo(() => displayWords.reduce<GrammarWordToken[]>((shown, word) => {
    const previous = shown[shown.length - 1];
    if (previous && CLOSING_PUNCTUATION.test(word.traditional)) {
      shown[shown.length - 1] = { ...previous, suffix: `${previous.suffix ?? ''}${word.traditional}` };
    } else shown.push(word);
    return shown;
  }, []), [displayWords]);

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
    setActiveWordId(null);
    isTooltipOpenRef.current = false;
  }, [clearTimers]);

  useEffect(() => {
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
  }, [closeTooltip, clearTimers]);

  const openWordTooltip = useCallback(
    (word: GrammarWordToken, element: HTMLElement) => {
      const text = characterPreference === 'simplified' && word.simplified
        ? word.simplified
        : word.traditional;

      const rect = element.getBoundingClientRect();
      const anchor: AnchorPosition = {
        x: rect.left + rect.width / 2,
        top: rect.top,
        bottom: rect.bottom,
      };

      const tokenMeaning = word.meaning || (word as unknown as { english?: string }).english || '';
      const baseDefs = tokenMeaning ? [tokenMeaning] : [];
      const initialInfo: SentenceWordLookupResult = {
        word: text,
        pinyin: word.pinyin || undefined,
        definitions: baseDefs,
        hasAudio: true,
      };

      setHoveredWord({
        word: text,
        anchor,
        info: initialInfo,
        loading: !tokenMeaning && !word.pinyin,
      });
      isTooltipOpenRef.current = true;

      void lookupSentenceWord(text, characterPreference)
        .then((result) => {
          if (!result) return;
          setHoveredWord((prev) => {
            if (!prev || prev.word !== text) return prev;
            const allDefs = [...baseDefs];
            for (const d of result.definitions) {
              if (!allDefs.some((existing) => existing.toLowerCase() === d.toLowerCase())) {
                allDefs.push(d);
              }
            }
            return {
              ...prev,
              info: {
                word: text,
                pinyin: word.pinyin || result.pinyin,
                definitions: allDefs,
                fallbackParts: result.fallbackParts,
                hasAudio: true,
              },
              loading: false,
            };
          });
        })
        .catch(() => {
          setHoveredWord((prev) => (prev && prev.word === text ? { ...prev, loading: false } : prev));
        });
    },
    [characterPreference],
  );

  const handlePointerEnterWord = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, word: GrammarWordToken) => {
      if (e.pointerType === 'touch') return;

      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      setActiveWordId(word.id);
      onActiveAlignmentChange?.(word.alignmentId ?? null);
      const element = e.currentTarget;

      if (isTooltipOpenRef.current) {
        openWordTooltip(word, element);
        return;
      }

      hoverTimerRef.current = setTimeout(() => {
        openWordTooltip(word, element);
      }, 100);
    },
    [onActiveAlignmentChange, openWordTooltip],
  );

  const handlePointerLeaveWord = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setActiveWordId(null);
    onActiveAlignmentChange?.(null);
    leaveTimerRef.current = setTimeout(() => {
      setHoveredWord(null);
      isTooltipOpenRef.current = false;
    }, 120);
  }, [onActiveAlignmentChange]);

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
    <div
      className={cn(
        'flex flex-wrap items-start gap-x-0 gap-y-3',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {shownWords.map((word) => {
        const text = characterPreference === 'simplified' && word.simplified
          ? word.simplified
          : word.traditional;
        const isHovered = activeWordId === word.id || hoveredWord?.word === text;
        const isFocus = focusTokenIds.has(word.id) || word.mark === 'say';
        const skipped = word.mark === 'skip';
        const role = isFocus ? (word.mark ? 'number' : getGrammarSemanticRole(text)) : undefined;
        const roleColorClass = role ? getSemanticRoleClasses(role) : undefined;
        const roleSoftBgClass = role ? getSemanticRoleSoftBgClasses(role) : 'hover:bg-brand-primary-soft focus-visible:bg-brand-primary-soft active:bg-brand-primary-soft';
        const isAligned = Boolean(word.alignmentId && word.alignmentId === activeAlignmentId);

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
                onPointerEnter={(e) => handlePointerEnterWord(e, word)}
                onPointerLeave={handlePointerLeaveWord}
                onFocus={(e) => handlePointerEnterWord(e as unknown as React.PointerEvent<HTMLButtonElement>, word)}
                onBlur={handlePointerLeaveWord}
                onClick={(event) => {
                  event.stopPropagation();
                  closeTooltip();
                  onActiveAlignmentChange?.(word.alignmentId ?? null);
                  onOpenWord(text);
                }}
                data-grammar-word-id={word.id}
                aria-label={`${text}: ${word.pinyin || ''}${word.meaning || (word as unknown as { english?: string }).english ? `, ${word.meaning || (word as unknown as { english?: string }).english}` : ''}`}
                className={cn(
                  '-mx-0.5 cursor-pointer rounded-xs px-0.5 font-chinese font-black leading-tight transition-colors focus-ring-inline',
                  teachingTextSizeClass,
                  roleSoftBgClass,
                  isFocus
                    ? cn(roleColorClass, 'font-black')
                    : skipped ? 'text-ui-muted/50'
                    : tone === 'accent' ? 'text-brand-primary' : 'text-ui-ink-strong',
                  isHovered && 'bg-brand-primary/10 text-brand-primary',
                  isAligned && 'bg-brand-primary text-ui-surface hover:bg-brand-primary focus-visible:bg-brand-primary',
                )}
              >
                {text}
              </button>
              {word.suffix && (
                <span className={cn('-ml-0.5 font-chinese font-black leading-tight text-ui-ink-strong', teachingTextSizeClass)}>
                  {word.suffix}
                </span>
              )}
            </span>

            {showPinyin && !skipped && (
              <span className={cn('mx-0.5 mt-1 whitespace-nowrap text-[11px] font-extrabold leading-none sm:text-xs', isFocus && roleColorClass ? roleColorClass : 'text-brand-primary')}>
                {word.pinyin}
              </span>
            )}
          </span>
        );
      })}

      {hoveredWord && (
        <SentenceWordTooltipPortal
          data={hoveredWord}
          reduceMotion={reduceMotion}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          onPlayAudio={() => {
            void playSentenceWordAudio(hoveredWord.word, characterPreference);
          }}
        />
      )}
    </div>
  );
}
