import { useEffect, useLayoutEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { useSentenceSegments, useSentenceWordHover, sentenceLookupHandlers, type HoveredWordState } from './useSentenceLookup';
import type { SentenceWordContext, SentenceWordLookupResult } from '../../types/sentenceLookup';
export { registerSentenceLookupHandlers } from './useSentenceLookup';
export type { HoveredWordState } from './useSentenceLookup';
export type { SentenceWordPart, SentenceWordLookupResult } from '../../types/sentenceLookup';
import { calculateTooltipPlacement, type TooltipPlacement } from '../../utils/browser/tooltipPosition';
import { AppIcon } from './AppIcon';
import type { WordSyllable } from '../../utils/pinyin/pinyinTones';
import { splitDialogueTurns } from '../../utils/lesson/dialogueTurns';

export interface SmartSentenceProps {
  text: string;
  className?: string;
  bookAccent?: string;
  highlightTerms?: string[];
  highlightClassName?: (term: string) => string;
  onWordClick?: (word: string) => void;
  validateWords?: (words: string[]) => Promise<Map<string, unknown> | Set<string>>;
  lookupWord?: (word: string, context?: SentenceWordContext) => Promise<SentenceWordLookupResult | null>;
  tokens?: Array<{ traditional: string; simplified?: string; pinyin?: string; meaning?: string }>;
  characterPreference?: 'traditional' | 'simplified';
  wordClassName?: string;
  onPlayAudio?: (word: string, pinyin?: string) => void;
  /** Whether to show definition tooltips on hover (desktop). Defaults to true. */
  enableHoverTooltip?: boolean;
  /** One syllable per character of `text` (see alignWordSyllables): each hanzi shows its pinyin above it. */
  syllables?: (WordSyllable | null)[] | null;
  /** Course examples: each "A："/"B：" turn on its own line with a hanging label, and long lines wrap at the commas. */
  exampleLayout?: boolean;
}

interface HighlightRange {
  start: number;
  end: number;
  className?: string;
}

function findHighlightRanges(text: string, highlightTerms: string[], highlightClassName?: (term: string) => string): HighlightRange[] {
  const terms = Array.from(new Set(highlightTerms.filter(Boolean)))
    .sort((a, b) => b.length - a.length);
  const ranges: HighlightRange[] = [];

  terms.forEach((term) => {
    let start = text.indexOf(term);
    while (start >= 0) {
      ranges.push({ start, end: start + term.length, className: highlightClassName?.(term) });
      start = text.indexOf(term, start + term.length);
    }
  });

  return ranges;
}

function renderHighlightedText(text: string, startIndex: number, ranges: HighlightRange[], syllables?: (WordSyllable | null)[] | null): ReactNode {
  if (syllables) {
    // One reading per word (xiànzài over 現在): characters keep their natural spacing.
    const reading = Array.from(text).map((_, offset) => syllables[startIndex + offset]?.text ?? '').join('');
    const glyphs = renderHighlightedText(text, startIndex, ranges);
    return reading ? (
      <ruby className="[ruby-align:center]">
        {glyphs}
        <rt className="px-0.5 pb-0.5 font-sans text-[11px] font-semibold leading-none tracking-normal text-ui-muted-strong">{reading}</rt>
      </ruby>
    ) : glyphs;
  }
  if (ranges.length === 0) return text;

  const parts: Array<{ text: string; className?: string }> = [];
  let index = 0;

  while (index < text.length) {
    const highlighted = ranges.find((range) => (
      startIndex + index >= range.start && startIndex + index < range.end
    ));
    const previous = parts.at(-1);
    if (previous && previous.className === (highlighted ? highlighted.className || 'font-black text-brand-primary' : undefined)) {
      previous.text += text[index];
    } else {
      parts.push({ text: text[index], className: highlighted ? highlighted.className || 'font-black text-brand-primary' : undefined });
    }
    index += 1;
  }

  return parts.map((part, partIndex) => part.className ? (
    <span key={partIndex} className={part.className}>
      {part.text}
    </span>
  ) : part.text);
}

const NO_HIGHLIGHTS: string[] = [];
const NO_TOKENS: NonNullable<SmartSentenceProps['tokens']> = [];

export function SmartSentence({
  text,
  className = '',
  highlightTerms = NO_HIGHLIGHTS,
  highlightClassName,
  validateWords,
  onWordClick,
  lookupWord,
  tokens = NO_TOKENS,
  characterPreference = 'traditional',
  wordClassName,
  onPlayAudio,
  enableHoverTooltip = true,
  syllables,
  exampleLayout = false,
}: SmartSentenceProps) {
  const authoredWords = useMemo(() => tokens.map(token =>
    characterPreference === 'simplified' && token.simplified ? token.simplified : token.traditional,
  ), [tokens, characterPreference]);
  const displaySegments = useSentenceSegments(text, authoredWords, validateWords);
  const { hoveredWord, activeWordKey, enter, leave, keepOpen, closeTooltip } = useSentenceWordHover(lookupWord);
  const activePlayAudio = onPlayAudio || sentenceLookupHandlers.playAudio;
  const reduceMotion = useReducedMotion();
  const turns = useMemo(() => (exampleLayout ? splitDialogueTurns(text) : null), [exampleLayout, text]);
  const highlightRanges = useMemo(() => findHighlightRanges(text, highlightTerms, highlightClassName), [highlightTerms, text, highlightClassName]);
  useEffect(() => { closeTooltip(); }, [text, characterPreference, closeTooltip]);
  const contextFor = (word: string) => tokens.find(token => (
    characterPreference === 'simplified' && token.simplified ? token.simplified : token.traditional
  ) === word);

  const renderSegment = (seg: (typeof displaySegments)[number], idx: number) => {
    const isClickable = seg.isWordLike && /\p{Script=Han}/u.test(seg.segment);
    const wordKey = `${idx}-${seg.segment}`;
    const isCurrentWordActive = activeWordKey === wordKey || hoveredWord?.word === seg.segment;

    if (isClickable) {
      return (
        <button
          key={wordKey}
          type="button"
          aria-label={`Open ${seg.segment} in the dictionary`}
          onPointerEnter={(e) => { if (e.pointerType !== 'touch' && enableHoverTooltip) enter(e.currentTarget, seg.segment, wordKey, contextFor(seg.segment)); }}
          onPointerLeave={leave}
          onFocus={(e) => { if (enableHoverTooltip) enter(e.currentTarget, seg.segment, wordKey, contextFor(seg.segment)); }}
          onBlur={leave}
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
            wordClassName,
            '-mx-0.5 cursor-pointer rounded-xs px-0.5 align-baseline transition-colors focus-ring-inline',
            isCurrentWordActive
              ? 'bg-brand-primary/10 text-brand-primary'
              : 'hover:bg-brand-primary/10 hover:text-brand-primary focus-visible:bg-brand-primary/10 focus-visible:text-brand-primary active:bg-brand-primary/20',
          )}
        >
          {renderHighlightedText(seg.segment, seg.index, highlightRanges, syllables)}
        </button>
      );
    }
    return (
      <span key={wordKey} className="align-baseline">
        {renderHighlightedText(seg.segment, seg.index, highlightRanges, syllables)}
      </span>
    );
  };

  // Wrap at clause punctuation: a clause moves to the next line whole (comma attached), so punctuation never starts a line.
  const renderRange = (start: number, end: number) => {
    const clauses: (typeof displaySegments)[] = [[]];
    displaySegments.forEach((seg) => {
      if (seg.index < start || seg.index >= end) return;
      clauses.at(-1)!.push(seg);
      if (/[，、；：,;]/.test(seg.segment.at(-1) ?? '')) clauses.push([]);
    });
    return clauses.filter((c) => c.length > 0).map((clause, i) => (
      <span key={i} className="inline-block max-w-full">
        {clause.map((seg) => renderSegment(seg, displaySegments.indexOf(seg)))}
      </span>
    ));
  };

  return (
    <span className={cn(exampleLayout ? 'block' : 'inline', className)}>
      {exampleLayout
        ? (turns ?? [{ speaker: null, start: 0, end: text.length }]).map((turn) => {
            const wideLabel = (turn.speaker?.length ?? 0) > 1;
            return (
              // Each speaker or numbered example on its own line with a hanging label. Plain blocks (not a grid) so lines below a floated play button get the full width back.
              <span
                key={turn.start}
                className={cn(
                  'block',
                  turn.speaker && (wideLabel ? 'pl-[2.2em]' : 'pl-[1.2em]'),
                )}
              >
                {turn.speaker && (
                  <span
                    className={cn(
                      'inline-block font-sans',
                      wideLabel ? '-ml-[2.2em] min-w-[2.2em] pr-1' : '-ml-[1.2em] min-w-[1.2em]',
                    )}
                  >
                    <span className="text-[0.6em] font-black text-ui-muted">{turn.speaker}</span>
                  </span>
                )}
                {renderRange(turn.start, turn.end)}
              </span>
            );
          })
        : displaySegments.map(renderSegment)}

      {hoveredWord && typeof document !== 'undefined' && (
        <SentenceWordTooltipPortal
          data={hoveredWord}
          reduceMotion={Boolean(reduceMotion)}
          onMouseEnter={keepOpen}
          onMouseLeave={leave}
          onPlayAudio={activePlayAudio ? () => activePlayAudio(hoveredWord.word, hoveredWord.info?.pinyin) : undefined}
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
  actions,
}: {
  data: HoveredWordState;
  reduceMotion: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPlayAudio?: () => void;
  actions?: ReactNode;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>(() =>
    calculateTooltipPlacement(data.anchor, { width: 260, height: 90 }),
  );

  useLayoutEffect(() => {
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
      className="pointer-events-auto fixed z-popover"
      style={{
        left: placement.left,
        top: placement.top,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Invisible bridge over the anchor gap to prevent mouse leaving during transit */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute left-0 w-full pointer-events-auto',
          placement.above ? '-bottom-3 h-3' : '-top-3 h-3',
        )}
      />
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
              <span className="font-sans text-xs font-black tracking-wide text-white/70">
                {pinyin}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
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
            {actions ?? sentenceLookupHandlers.renderActions?.(data)}
          </div>
        </div>

        <div className="max-h-[38vh] overflow-y-auto overscroll-contain">
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
                    <span className="font-sans font-bold text-white/55">{part.pinyin}</span>
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
            No local definition found
          </p>
        )}

        </div>

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
    document.querySelector('[data-sentence-tooltip-host]') || document.body,
  );
}
