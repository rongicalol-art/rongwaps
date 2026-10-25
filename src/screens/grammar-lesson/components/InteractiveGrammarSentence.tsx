import { useMemo, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { useSentenceWordHover } from '../../../lib/widgets';
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
} from '../../../lib/widgets';
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
  const lookup = useCallback((word: string) => lookupSentenceWord(word, characterPreference), [characterPreference]);
  const { hoveredWord, activeWordKey: activeWordId, enter, leave, keepOpen, closeTooltip } = useSentenceWordHover(lookup);
  const reduceMotion = Boolean(useReducedMotion());
  const teachingTextSizeClass = TEACHING_TEXT_SIZE_CLASSES[size];
  const displayWords = words;
  const sentenceKey = JSON.stringify(words);
  useEffect(() => { closeTooltip(); }, [sentenceKey, characterPreference, closeTooltip]);

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
                onPointerEnter={(e) => { if (e.pointerType !== 'touch') enter(e.currentTarget, text, word.id); }}
                onPointerLeave={leave}
                onFocus={(e) => enter(e.currentTarget, text, word.id)}
                onBlur={leave}
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
          onMouseEnter={keepOpen}
          onMouseLeave={leave}
          onPlayAudio={() => {
            void playSentenceWordAudio(hoveredWord.word, characterPreference, undefined, hoveredWord.info?.pinyin);
          }}
        />
      )}
    </div>
  );
}
