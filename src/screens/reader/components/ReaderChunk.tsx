import { memo } from 'react';
import type { ReaderTextSize } from '../../../types/models';
import type { PhraseChunk } from '../../../utils/rubyPinyin';
import { cn } from '../../../utils/cn';
import { useAppStore } from '../../../store/useAppStore';
import type {
  ReaderPointerHandler,
  ReaderPointerMoveHandler,
  ReaderPointerUpHandler,
} from '../hooks/useReaderWordInteractions';

/** Ruby type scale for one reading surface, per text size and syllable length. */
export interface RubyTypeScale {
  long: Record<ReaderTextSize, string>;
  standard: Record<ReaderTextSize, string>;
}

/**
 * Presentation choices the two reading surfaces were authored with.
 * Held as data so this one leaf can serve both surfaces and stay memoized:
 * the dialogue bubbles and the narrative document were tuned separately, so
 * their ruby type scales and hidden-pinyin markup still differ.
 */
export interface ReaderChunkAppearance {
  rubyTypeScale: RubyTypeScale;
  /** Hidden-pinyin rendering: the dialogue canvas keeps one span per character. */
  plainText: 'per-char' | 'text';
}

export const DIALOGUE_CHUNK_APPEARANCE: ReaderChunkAppearance = {
  rubyTypeScale: {
    long: {
      normal: 'text-[9.5px] sm:text-[10.5px] tracking-tight',
      large: 'text-[10px] sm:text-[11px] tracking-tight',
      'extra-large': 'text-[11.5px] sm:text-[12.5px] tracking-tight',
    },
    standard: {
      normal: 'text-[10px] sm:text-[11px]',
      large: 'text-[10.5px] sm:text-[11.5px]',
      'extra-large': 'text-[12px] sm:text-[13px]',
    },
  },
  plainText: 'per-char',
};

export const NARRATIVE_CHUNK_APPEARANCE: ReaderChunkAppearance = {
  rubyTypeScale: {
    long: {
      normal: 'text-[9.5px] sm:text-[10px] tracking-tight',
      large: 'text-[10px] sm:text-[10.5px] tracking-tight',
      'extra-large': 'text-[11.5px] sm:text-[12.5px] tracking-tight',
    },
    standard: {
      normal: 'text-[10px] sm:text-[11px] tracking-normal',
      large: 'text-[10.5px] sm:text-[11.5px] tracking-normal',
      'extra-large': 'text-[12.5px] sm:text-[13.5px] tracking-normal',
    },
  },
  plainText: 'text',
};

export interface ReaderChunkProps {
  /** Word unit to render. Identity is stable: both views build chunks in a memo. */
  chunk: PhraseChunk;
  /** Hover/hold key prefix; the chunk key is `${keyPrefix}-${chunkIdx}`. */
  keyPrefix: string;
  chunkIdx: number;
  /** Alignment line played when the chunk has no usable word timings. */
  lineIndex: number;
  /** Sentence/clause start, used when the chunk itself is untimed. */
  fallbackStart?: number;
  /** Sentence/clause end, used as the tap-to-play range end. */
  fallbackEnd?: number;
  /** Karaoke highlight: the chunk is held right now or currently spoken. */
  isActive: boolean;
  isHovered: boolean;
  showPinyin: boolean;
  textSize: ReaderTextSize;
  appearance: ReaderChunkAppearance;
  onPlayLine: (index: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  onPointerEnter: ReaderPointerHandler;
  onPointerLeave: () => void;
  onPointerDown: ReaderPointerHandler;
  onPointerMove: ReaderPointerMoveHandler;
  onPointerUp: ReaderPointerUpHandler;
  onPointerCancel: () => void;
}

/**
 * One spoken word in the reader.
 *
 * Memoized because the reader's `currentTime` ticks while audio plays (~20x/s)
 * and the whole reading re-renders on every tick. Without this boundary every
 * word span was rebuilt and re-diffed on each tick — for the longest reading
 * that is ~230 chunks / ~310 ruby items of markup, each running `cn`/twMerge.
 * Every prop here is either primitively stable per chunk or a `useCallback`
 * (the word-interaction handlers and the screen's play actions), so a tick now
 * only re-renders the one or two chunks whose active/hover flag changed.
 */
export const ReaderChunk = memo(function ReaderChunk({
  chunk,
  keyPrefix,
  chunkIdx,
  lineIndex,
  fallbackStart,
  fallbackEnd,
  isActive,
  isHovered,
  showPinyin,
  textSize,
  appearance,
  onPlayLine,
  onPlayRange,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: ReaderChunkProps) {
  const chunkKey = `${keyPrefix}-${chunkIdx}`;
  const wordStart = typeof chunk.start === 'number' ? chunk.start : fallbackStart;

  const playChunk = () => {
    if (typeof wordStart === 'number' && typeof fallbackEnd === 'number' && onPlayRange) {
      onPlayRange(wordStart, fallbackEnd);
    } else {
      onPlayLine(lineIndex);
    }
  };

  const { long, standard } = appearance.rubyTypeScale;

  return (
    <span
      data-reader-chunk="true"
      data-chunk-key={chunkKey}
      data-chunk-start={chunk.start}
      data-chunk-text={chunk.text}
      role="button"
      tabIndex={0}
      title="Tap to play · Hover for definition · Hold for breakdown"
      onClick={(e) => e.stopPropagation()}
      onPointerEnter={(e) => onPointerEnter(e, chunk, keyPrefix, chunkIdx)}
      onPointerLeave={onPointerLeave}
      onPointerDown={(e) => onPointerDown(e, chunk, keyPrefix, chunkIdx)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) =>
        onPointerUp(e, chunk, lineIndex, { start: wordStart, end: fallbackEnd })
      }
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          useAppStore.getState().setDictionaryWord(chunk.text);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          playChunk();
        }
      }}
      className={cn(
        'outline-none -mx-0.5 px-0.5 rounded box-decoration-clone transition-colors duration-100',
        isActive
          ? 'bg-brand-primary-soft text-brand-primary font-black'
          : isHovered
            ? 'bg-brand-primary/10 text-brand-primary'
            : '',
      )}
    >
      {showPinyin ? (
        chunk.rubyItems.map((item, itemIdx) => {
          if (item.isPunctuation || !item.pinyin) {
            return <span key={itemIdx} className="inline">{item.char}</span>;
          }
          const isLongSyllable = item.pinyin.length >= 5;
          return (
            <ruby
              key={itemIdx}
              className={cn(
                'font-chinese [ruby-position:over]',
                textSize === 'extra-large'
                  ? 'mx-[3px] sm:mx-[4px]'
                  : 'mx-[2px] sm:mx-[3px]',
              )}
            >
              {item.char}
              <rt
                className={cn(
                  'font-sans font-semibold text-brand-primary select-none leading-none pb-0.5 [ruby-position:over]',
                  isLongSyllable ? long[textSize] : standard[textSize],
                )}
              >
                {item.pinyin}
              </rt>
            </ruby>
          );
        })
      ) : appearance.plainText === 'per-char' ? (
        chunk.rubyItems.map((item, itemIdx) => (
          <span key={itemIdx} className="inline">{item.char}</span>
        ))
      ) : (
        <span>{chunk.text}</span>
      )}
    </span>
  );
});
