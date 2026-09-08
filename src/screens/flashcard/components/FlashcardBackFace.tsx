import React, { useMemo } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { MemoryHookCharacter } from '../../../features/character-memory-hooks';
import type { RankedExample } from '../../../utils/courseExamples';
import { extractWordVariants } from '../../../utils/courseExamples';
import { isHanziChar } from '../../../utils/hanzi';
import { PosBadge } from '../../../lib/widgets';
import { formatPosLabel } from '../../../utils/posLabels';
import { FlashcardExamples } from './FlashcardExamples';
import { numberToToneMarks } from '../../../utils/pinyin';

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
}

export const FlashcardBackFace = ({
  card,
  setActiveBreakdown,
  showPinyin = true,
  showTranslation = true,
  examples = [],
  isExamplesLoading = false,
  isDragging = false,
  onScroll,
  scrollRef,
}: FlashcardBackFaceProps) => {
  const frontLength = card?.front?.length || 1;
  const hasExampleContent = isExamplesLoading || examples.length > 0;
  const hasDefinition = Boolean(card.back?.trim());

  const searchTerms = useMemo(
    () => extractWordVariants(card.front, card.traditional, card.simplified),
    [card.front, card.traditional, card.simplified],
  );

  const getBackFrontFontSize = (len: number) => {
    if (len === 1) return 'text-[68px] sm:text-[88px] md:text-[96px]';
    if (len === 2) return 'text-[56px] sm:text-[72px] md:text-[80px]';
    if (len === 3) return 'text-[44px] sm:text-[56px] md:text-[64px]';
    if (len === 4) return 'text-[36px] sm:text-[46px] md:text-[52px]';
    if (len <= 6) return 'text-[28px] sm:text-[34px] md:text-[40px]';
    return 'text-[22px] sm:text-[26px] md:text-[30px]';
  };

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      aria-label="Flashcard answer and example sentences"
      onScroll={onScroll}
      className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain pt-2 focus-ring sm:pt-3"
    >
      <div className="flex min-h-full w-full shrink-0 flex-col items-center justify-center rounded-feature bg-transparent px-8 py-3">
        {/* Pinyin and POS tag row on top of the characters */}
        {(showPinyin || formatPosLabel(card.pos)) && (
          <div className="mb-2 flex flex-row items-center justify-center gap-2 flex-wrap">
            {showPinyin && (
              <span className="text-[17px] sm:text-[19px] font-bold tracking-wide text-ui-ink">
                {numberToToneMarks(card.pinyin ?? '')}
              </span>
            )}
            {formatPosLabel(card.pos) && (
              <PosBadge pos={card.pos} />
            )}
          </div>
        )}

        <div className="flex flex-row items-center justify-center flex-wrap mb-2">
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
            className={`${
              card.back?.length > 40
                ? 'text-[16px] sm:text-[18px] md:text-[20px]'
                : card.back?.length > 20
                ? 'text-[18px] sm:text-[22px] md:text-[24px]'
                : 'text-[22px] sm:text-[26px] md:text-[30px]'
            } mt-2 w-full shrink-0 break-words px-2 text-center font-extrabold leading-tight text-ui-ink`}
          >
            {card.back}
          </h2>
        )}
      </div>
      {hasExampleContent && (
        <FlashcardExamples
          searchTerms={searchTerms}
          examples={examples}
          isLoading={isExamplesLoading}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
        />
      )}
    </div>
  );
};
