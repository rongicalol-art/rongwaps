import React, { useMemo } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { MemoryHookCharacter, renderHookText } from '../../../features/character-memory-hooks';
import type { RankedExample } from '../../../utils/courseExamples';
import { extractWordVariants } from '../../../utils/courseExamples';
import { isHanziChar } from '../../../utils/hanzi';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import { formatPosLabel } from '../../../utils/posLabels';
import { FlashcardExamples } from './FlashcardExamples';
import { numberToToneMarks } from '../../../utils/pinyin';
import { cn } from '../../../utils/cn';
import { useCurriculumExamples } from '../hooks/useCurriculumExamples';

export interface FlashcardBackFaceProps {
  card: Flashcard;
  setActiveBreakdown: (char: string, index?: number) => void;
  showPinyin?: boolean;
  showTranslation?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
  isDragging?: boolean;
  onScroll?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  showHook?: boolean;
  hook?: string | null;
  hookLoaded?: boolean;
}

export const FlashcardBackFace = ({
  card,
  setActiveBreakdown,
  showPinyin = true,
  showTranslation = true,
  examples,
  isExamplesLoading,
  isDragging = false,
  onScroll,
  scrollRef,
  showHook = false,
  hook,
  hookLoaded = false,
}: FlashcardBackFaceProps) => {
  const fetched = useCurriculumExamples(card, !examples);
  const resolvedExamples = examples ?? fetched.examples;
  const resolvedLoading = isExamplesLoading ?? fetched.isLoading;

  const frontLength = card?.front?.length || 1;
  const hasExampleContent = resolvedLoading || resolvedExamples.length > 0;
  const hasDefinition = Boolean(card.back?.trim());

  const searchTerms = useMemo(
    () => extractWordVariants(card.front, card.traditional, card.simplified),
    [card.front, card.traditional, card.simplified],
  );

  const getBackFrontFontSize = (len: number) => {
    if (showHook) {
      if (len === 1) return 'text-[36px] sm:text-[44px] md:text-[50px]';
      if (len === 2) return 'text-[30px] sm:text-[36px] md:text-[42px]';
      if (len === 3) return 'text-[24px] sm:text-[30px] md:text-[34px]';
      if (len === 4) return 'text-[20px] sm:text-[24px] md:text-[28px]';
      return 'text-[18px] sm:text-[22px] md:text-[26px]';
    }
    if (len === 1) return 'text-[68px] sm:text-[88px] md:text-[96px] lg:text-[110px]';
    if (len === 2) return 'text-[56px] sm:text-[72px] md:text-[80px] lg:text-[90px]';
    if (len === 3) return 'text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px]';
    if (len === 4) return 'text-[36px] sm:text-[46px] md:text-[52px] lg:text-[58px]';
    if (len <= 6) return 'text-[28px] sm:text-[34px] md:text-[40px] lg:text-[46px]';
    return 'text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px]';
  };

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      aria-label="Flashcard answer and example sentences"
      onScroll={onScroll}
      className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain pt-2 focus-ring sm:pt-3"
    >
      <div
        className={cn(
          'flex w-full shrink-0 min-h-full flex-col items-center rounded-feature bg-transparent',
          showHook ? 'px-2 sm:px-4 py-1 sm:py-2' : 'px-4 sm:px-8 py-3',
        )}
      >
        <div className="my-auto flex w-full flex-col items-center">
          {/* Pinyin and POS tag row on top of the characters */}
          {(showPinyin || formatPosLabel(card.pos)) && (
            <div className={cn('flex flex-row items-center justify-center gap-2 flex-wrap', showHook ? 'mb-1' : 'mb-2')}>
              {showPinyin && (
                <span
                  className={cn(
                    'font-bold tracking-wide text-ui-ink',
                    showHook ? 'text-[13px] sm:text-[15px]' : 'text-[17px] sm:text-[19px] lg:text-[21px]',
                  )}
                >
                  {numberToToneMarks(card.pinyin ?? '')}
                </span>
              )}
              {formatPosLabel(card.pos) && (
                <PosBadge pos={card.pos} className={showHook ? 'text-[10px] px-1 py-0.5' : undefined} />
              )}
            </div>
          )}

          <div className={cn('flex flex-row items-center justify-center flex-wrap', showHook ? 'mb-1' : 'mb-2')}>
            {Array.from(card.front).map((char, i) => {
              const isHanzi = isHanziChar(char);
              const hanziIndex = Array.from(card.front).slice(0, i).filter(isHanziChar).length;

              if (!isHanzi) {
                return (
                  <span
                    key={i}
                    className={`${getBackFrontFontSize(frontLength)} px-1 text-ui-muted leading-none font-chinese text-center mt-2`}
                  >
                    {char}
                  </span>
                );
              }

              return (
                <MemoryHookCharacter
                  key={i}
                  char={char}
                  label={`Open character breakdown for ${char}`}
                  tooltipDisabled={isDragging}
                  onOpen={() => setActiveBreakdown(card.front, hanziIndex)}
                  glyphClassName={`${getBackFrontFontSize(frontLength)} block leading-none text-ui-ink tracking-normal text-center`}
                  className="rounded-control px-1 py-1"
                />
              );
            })}
          </div>
          {hasDefinition && (
            <h2
              className={cn(
                'w-full shrink-0 break-words px-2 text-center text-ui-ink',
                showHook
                  ? 'mt-0.5 text-[15px] sm:text-[17px] font-bold leading-snug'
                  : cn(
                      card.back?.length > 40
                        ? 'text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px]'
                        : card.back?.length > 20
                        ? 'text-[18px] sm:text-[22px] md:text-[24px] lg:text-[26px]'
                        : 'text-[22px] sm:text-[26px] md:text-[30px] lg:text-[34px]',
                      'mt-2 font-extrabold leading-tight',
                    ),
              )}
            >
              {card.back}
            </h2>
          )}

          {showHook && hookLoaded && hook && (
            <div className="w-full max-w-md sm:max-w-lg pt-2 sm:pt-2.5 pb-0.5 flex flex-col items-center">
              <div className="relative w-full rounded-feature border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] bg-feedback-warning-surface px-3.5 py-3 sm:px-4.5 sm:py-3.5 text-left shadow-ambient-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AppIcon name="sparkles" size={12} className="text-feedback-warning-edge" />
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-feedback-warning-edge">
                    Memory hook
                  </span>
                </div>
                <p className="text-[13px] sm:text-[14px] md:text-[15px] font-bold leading-snug sm:leading-relaxed text-ui-ink">
                  {renderHookText(hook)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasExampleContent && (
        <FlashcardExamples
          searchTerms={searchTerms}
          examples={resolvedExamples}
          isLoading={resolvedLoading}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
        />
      )}
    </div>
  );
};
