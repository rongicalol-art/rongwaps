import { useMemo } from 'react';
import { SmartSentence } from '../../../lib/widgets';
import type { GrammarWordToken } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getFocusTokenIds } from '../utils/grammarFocusTokens';
import {
  getGrammarSemanticRole,
  getSemanticRoleClasses,
  getSemanticRoleSoftBgClasses,
} from '../../../utils/grammar/grammarSemanticRoles';

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
  const teachingTextSizeClass = TEACHING_TEXT_SIZE_CLASSES[size];
  const displayWords = words;

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
        const isFocus = focusTokenIds.has(word.id) || word.mark === 'say';
        const skipped = word.mark === 'skip';
        const role = isFocus ? (word.mark ? 'number' : getGrammarSemanticRole(text)) : undefined;
        const roleColorClass = role ? getSemanticRoleClasses(role) : undefined;
        const roleSoftBgClass = role ? getSemanticRoleSoftBgClasses(role) : 'hover:bg-brand-primary-soft focus-visible:bg-brand-primary-soft active:bg-brand-primary-soft';
        const isAligned = Boolean(word.alignmentId && word.alignmentId === activeAlignmentId);

        return (
          <span key={word.id} data-grammar-word-id={word.id} className="relative inline-flex flex-col items-center">
            <span className="inline-flex items-baseline whitespace-nowrap">
              {word.prefix && (
                <span className={cn('font-sans font-black leading-tight text-ui-muted-strong', teachingTextSizeClass)}>
                  {word.prefix}
                </span>
              )}
              <SmartSentence
                text={text}
                characterPreference={characterPreference}
                onWordClick={(selectedWord) => {
                  onActiveAlignmentChange?.(word.alignmentId ?? null);
                  onOpenWord(selectedWord);
                }}
                className={cn(
                  'font-chinese font-black leading-tight',
                  teachingTextSizeClass,
                  isFocus
                    ? cn(roleColorClass, 'font-black')
                    : skipped ? 'text-ui-muted/50'
                    : tone === 'accent' ? 'text-brand-primary' : 'text-ui-ink-strong',
                )}
                wordClassName={cn(
                  roleSoftBgClass,
                  isAligned && 'bg-brand-primary text-brand-on-primary hover:bg-brand-primary focus-visible:bg-brand-primary',
                )}
              />
              {word.suffix && (
                <span className={cn('-ml-0.5 font-chinese font-black leading-tight text-ui-ink-strong', teachingTextSizeClass)}>
                  {word.suffix}
                </span>
              )}
            </span>

            {showPinyin && !skipped && (
              <span className={cn('mx-0.5 mt-1 whitespace-nowrap text-[11px] font-extrabold leading-none sm:text-xs', isFocus && roleColorClass ? roleColorClass : 'text-brand-primary-text')}>
                {word.pinyin}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
