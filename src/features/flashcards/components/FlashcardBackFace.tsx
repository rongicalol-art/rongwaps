import React, { useEffect, useMemo, useState } from "react";
import type { Flashcard } from "../../../data/flashcards";
import {
  MemoryHookCharacter,
  renderHookText,
} from "../../character-memory-hooks";
import {
  groupRankedExamples,
  type RankedExample,
} from "../../../utils/vocabulary/courseExamples";
import { extractWordVariants } from "../../../utils/vocabulary/wordForms";
import { isHanziChar } from "../../../utils/characters/hanzi";
import { ActionButton, AppIcon, PosBadge } from "../../../lib/widgets";
import { formatPosLabel } from "../../../utils/vocabulary/posLabels";
import { FlashcardExamples } from "./FlashcardExamples";
import { alignWordSyllables } from "../../../utils/pinyin/pinyinTones";
import { splitCourseMeasureWords } from "../../../utils/vocabulary/measureWords";
import { TonePinyin, TONE_TEXT_CLASS } from "./TonePinyin";
import { cn } from "../../../utils/cn";
import { useFlashcardExtras, useMoreExamples } from "../content/flashcardContent";
import { useAppStore } from "../../../store/useAppStore";

const PRIMARY_SENSE_COUNT = 2;

/** Dictionary glosses chain senses with " • "; the first few are the answer, the rest is reference. */
function splitSenses(meaning: string): { primary: string; rest: string[] } {
  const senses = meaning
    .split(/\s+•\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    primary: senses.slice(0, PRIMARY_SENSE_COUNT).join(" • "),
    rest: senses.slice(PRIMARY_SENSE_COUNT),
  };
}

export interface FlashcardBackFaceProps {
  card: Flashcard;
  setActiveBreakdown: (char: string, index?: number) => void;
  showPinyin?: boolean;
  /** Color pinyin syllables and their characters by tone. */
  toneColors?: boolean;
  showTranslation?: boolean;
  /** Use concise 1-line definition without synonym padding. */
  simpleDefinitions?: boolean;
  examples?: RankedExample[];
  isExamplesLoading?: boolean;
  isDragging?: boolean;
  onScroll?: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  showHook?: boolean;
  hook?: string | null;
  hookLoaded?: boolean;
  /** Word in plain ink; flipping it off eases the word into its tone colour. */
  wordInk?: boolean;
}

export const FlashcardBackFace = React.memo(function FlashcardBackFace({
  card,
  setActiveBreakdown,
  showPinyin = true,
  toneColors = false,
  showTranslation = true,
  simpleDefinitions,
  examples,
  isExamplesLoading,
  isDragging = false,
  onScroll,
  scrollRef,
  showHook = false,
  hook,
  hookLoaded = false,
  wordInk = false,
}: FlashcardBackFaceProps) {
  const storeSimpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const isSimpleActive = (simpleDefinitions ?? storeSimpleDefinitions) && Boolean(card.simple);

  const fetched = useFlashcardExtras(card);
  const { moreExamples, loadingMore, moreFailed, loadMore } = useMoreExamples(card);
  const resolvedExamples = examples ?? moreExamples ?? fetched.extras.examples;
  const canShowMore = examples === undefined && !moreExamples && Boolean(fetched.extras.more);
  const resolvedLoading = isExamplesLoading ?? fetched.isLoading;

  const { primaryExamples, restExamples } = useMemo(() => {
    const flat = groupRankedExamples(resolvedExamples).flatMap(
      (group) => group.examples,
    );
    // Hero only for a sentence authored for this word; related ones stay in the scroll list.
    const hasOwn = flat[0]?.rank === 1;
    return {
      primaryExamples: hasOwn ? flat.slice(0, 1) : [],
      restExamples: hasOwn ? flat.slice(1) : flat,
    };
  }, [resolvedExamples]);

  const frontLength = card?.front?.length || 1;
  const rawBack = isSimpleActive ? card.simple! : (card.back?.trim() ?? "");
  const { meaning, measureWords } = useMemo(
    () => splitCourseMeasureWords(rawBack),
    [rawBack],
  );
  const { primary: primaryMeaning, rest: moreSenses } = useMemo(() => {
    if (isSimpleActive) {
      return {
        primary: meaning,
        rest: [],
      };
    }
    return splitSenses(meaning);
  }, [isSimpleActive, meaning]);
  const [showMoreSenses, setShowMoreSenses] = useState(false);
  useEffect(() => setShowMoreSenses(false), [card.front]);
  const hasDefinition = Boolean(meaning);

  const searchTerms = useMemo(
    () => extractWordVariants(card.front, card.traditional, card.simplified),
    [card.front, card.traditional, card.simplified],
  );

  // Each syllable sits over its own character when the pairing is certain;
  // otherwise pinyin stays one line above the word.
  const syllables = useMemo(
    () => alignWordSyllables(card.front, card.pinyin, card.traditional),
    [card.front, card.pinyin, card.traditional],
  );
  const stacked = showPinyin && syllables !== null;
  const pinyinTextClass = cn(
    "font-extrabold tracking-wide text-ui-ink",
    showHook
      ? "text-[13px] sm:text-[15px]"
      : "text-[17px] sm:text-[19px] lg:text-[21px]",
  );

  const withExample = primaryExamples.length > 0 || resolvedLoading;
  const getBackFrontFontSize = (len: number) => {
    // An example shares the card: cap the glyph by viewport height so word + sentence fit without clipping.
    if (withExample && !showHook) {
      if (len === 1) return 'text-[length:clamp(48px,min(16cqw,11svh),104px)]';
      if (len === 2) return 'text-[length:clamp(42px,min(14cqw,10svh),92px)]';
      if (len === 3) return 'text-[length:clamp(34px,min(11cqw,8.5svh),76px)]';
      if (len === 4) return 'text-[length:clamp(30px,min(9cqw,7.5svh),64px)]';
      return 'text-[length:clamp(24px,min(7cqw,6svh),50px)]';
    }
    if (showHook) {
      if (len === 1) return "text-[length:clamp(32px,10cqw,64px)]";
      if (len === 2) return "text-[length:clamp(26px,8.5cqw,54px)]";
      if (len === 3) return "text-[length:clamp(22px,7cqw,44px)]";
      if (len === 4) return "text-[length:clamp(18px,5.6cqw,36px)]";
      return "text-[length:clamp(16px,5cqw,32px)]";
    }
    if (len === 1) return "text-[length:clamp(56px,min(20cqw,16svh),140px)]";
    if (len === 2) return "text-[length:clamp(46px,min(16cqw,14svh),112px)]";
    if (len === 3) return "text-[length:clamp(38px,min(12.5cqw,11svh),88px)]";
    if (len === 4) return "text-[length:clamp(32px,min(10cqw,9svh),72px)]";
    if (len <= 6) return "text-[length:clamp(26px,min(8cqw,7svh),56px)]";
    return "text-[length:clamp(20px,6cqw,46px)]";
  };

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      aria-label="Flashcard answer and example sentences"
      onScroll={onScroll}
      className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain touch-pan-y pt-2 focus-ring sm:pt-3"
    >
      <div
        className={cn(
          "flex w-full shrink-0 min-h-full flex-col items-center rounded-feature bg-transparent",
          showHook
            ? "px-2 sm:px-4 pt-12 pb-1 sm:pb-2"
            : cn(
                "px-4 sm:px-8",
                withExample ? "pt-10" : "pt-12",
                // No example under the word: mirror the top inset so it sits dead centre.
                primaryExamples.length > 0 || resolvedLoading ? "pb-3" : "pb-14 sm:pb-15",
              ),
        )}
      >
        <div className="my-auto flex w-full flex-col items-center">
          {showPinyin && !stacked && (
            <span
              className={cn(
                pinyinTextClass,
                "rw-rise rw-rise-1 text-center",
                showHook ? "mb-1" : "mb-2",
              )}
            >
              <TonePinyin pinyin={card.pinyin ?? ""} colored={toneColors} />
            </span>
          )}

          <div
            data-fc-word
            className={cn(
              "flex flex-row justify-center flex-wrap",
              stacked ? "items-end gap-x-1" : "items-center",
              showHook ? "mb-1" : "mb-3",
            )}
          >
            {Array.from(card.front).map((char, i) => {
              const isHanzi = isHanziChar(char);
              const hanziIndex = Array.from(card.front)
                .slice(0, i)
                .filter(isHanziChar).length;
              const syllable = syllables?.[i];
              const toneClass =
                toneColors && syllable && !wordInk
                  ? TONE_TEXT_CLASS[syllable.tone]
                  : "text-ui-ink";

              const glyph = isHanzi ? (
                <MemoryHookCharacter
                  char={char}
                  label={`Open character breakdown for ${char}`}
                  tooltipDisabled={isDragging}
                  onOpen={() => setActiveBreakdown(card.front, hanziIndex)}
                  glyphClassName={cn(
                    getBackFrontFontSize(frontLength),
                    "block leading-none tracking-normal text-center transition-colors duration-500",
                    toneClass,
                  )}
                  className="rounded-control px-1 py-1"
                />
              ) : (
                <span
                  className={cn(
                    getBackFrontFontSize(frontLength),
                    "px-1 text-ui-muted leading-none font-chinese text-center mt-2",
                  )}
                >
                  {char}
                </span>
              );

              if (!stacked)
                return <React.Fragment key={i}>{glyph}</React.Fragment>;
              return (
                <div key={i} className="flex flex-col items-center">
                  <span
                    className={cn(
                      pinyinTextClass,
                      "rw-rise rw-rise-1 whitespace-nowrap",
                      syllable && toneClass,
                    )}
                    aria-hidden={!syllable}
                  >
                    {syllable?.text ?? "\u00A0"}
                  </span>
                  {glyph}
                </div>
              );
            })}
          </div>
          {hasDefinition && (
            <div
              className={cn(
                "rw-rise rw-rise-2 flex w-full flex-col items-center justify-center px-2",
                showHook ? "mt-0.5 gap-1.5" : "mt-1 gap-2.5",
              )}
            >
              <h2
                className={cn(
                  "min-w-0 break-words text-center text-ui-ink",
                  showHook
                    ? "text-[15px] sm:text-[17px] font-bold leading-snug"
                    : cn(
                        primaryMeaning.length > 40
                          ? "text-[length:clamp(15px,3.4cqw,22px)]"
                          : primaryMeaning.length > 20
                            ? "text-[length:clamp(17px,4cqw,26px)]"
                            : "text-[length:clamp(20px,4.8cqw,32px)]",
                        "font-extrabold leading-tight",
                      ),
                )}
              >
                {primaryMeaning}
              </h2>
              {formatPosLabel(card.pos) && (
                <PosBadge
                  pos={card.pos}
                  size="lg"
                  className="min-h-7 whitespace-nowrap shrink-0 self-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-ui-muted"
                />
              )}
            </div>
          )}
          {hasDefinition && measureWords.length > 0 && (
            <div
              className={cn(
                "rw-rise rw-rise-3 flex flex-wrap items-center justify-center gap-2",
                showHook ? "mt-1.5" : "mt-2",
              )}
            >
              {measureWords.length > 0 && (
                <p
                  className={cn(
                    "inline-flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-control bg-ui-canvas px-3 py-1.5 text-ui-muted-strong",
                    showHook ? "text-[13px]" : "text-sm sm:text-[15px]",
                  )}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted sm:text-xs">
                    Measure word
                  </span>
                  {measureWords.map((mw, i) => (
                    <span
                      key={mw.char}
                      className="inline-flex items-baseline gap-1 font-bold"
                    >
                      {i > 0 && (
                        <span aria-hidden className="mr-1 text-ui-divider">
                          ·
                        </span>
                      )}
                      <span className="font-chinese text-ui-ink">
                        {mw.char}
                      </span>
                      <span>{mw.pinyin}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
          {hasDefinition && moreSenses.length > 0 && !showHook && (
            <div
              className="rw-rise rw-rise-3 mt-3 flex w-full flex-col items-center gap-2"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-expanded={showMoreSenses}
                onClick={(event) => {
                  event.stopPropagation();
                  setShowMoreSenses((prev) => !prev);
                }}
                className="focus-ring min-h-9 rounded-control bg-ui-canvas px-3.5 text-sm font-black text-ui-muted-strong hover:bg-ui-hover"
              >
                {showMoreSenses
                  ? "Fewer meanings"
                  : `+${moreSenses.length} more`}
              </button>
              {showMoreSenses && (
                <ol className="w-full max-w-md list-decimal space-y-1 pl-6 pr-2 text-left text-sm font-bold leading-snug text-ui-muted-strong marker:text-ui-muted">
                  {moreSenses.map((sense, i) => (
                    <li key={i}>{sense}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {showHook && hookLoaded && hook && (
            <div className="rw-rise rw-rise-3 w-full max-w-md sm:max-w-lg pt-2 sm:pt-2.5 pb-0.5 flex flex-col items-center">
              <div className="relative w-full rounded-feature border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] bg-feedback-warning-surface px-3.5 py-3 sm:px-4.5 sm:py-3.5 text-left shadow-ambient-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AppIcon
                    name="sparkles"
                    size={12}
                    className="text-feedback-warning-edge"
                  />
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
          {(resolvedLoading || primaryExamples.length > 0) && (
            // Same text inset as the example list below (24px phone, 32px wider).
            <div className={cn("rw-rise rw-rise-3 w-full shrink-0", showHook ? "px-4" : "px-2 sm:px-0")}>
              <FlashcardExamples
                compact
                searchTerms={searchTerms}
                examples={primaryExamples}
                isLoading={resolvedLoading}
                showPinyin={showPinyin}
                showTranslation={showTranslation}
              />
            </div>
          )}
        </div>
      </div>

      {restExamples.length > 0 && (
        <div className={cn("w-full shrink-0", primaryExamples.length > 0 && "border-t-2 border-ui-divider")}>
          <FlashcardExamples
            searchTerms={searchTerms}
            examples={restExamples}
            isLoading={false}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
          />
        </div>
      )}
      {canShowMore && (
        <div className="flex w-full shrink-0 flex-col items-center gap-1 px-6 pb-8 pt-1">
          <ActionButton variant="quiet" size="sm" loading={loadingMore} loadingLabel="Loading…" onClick={loadMore}>
            Show more examples
          </ActionButton>
          {moreFailed && <p className="text-xs font-bold text-ui-muted-strong">Couldn’t load. Try again.</p>}
        </div>
      )}
    </div>
  );
});
