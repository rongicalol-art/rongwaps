import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../../features/practice';
import { AppIcon } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { cn } from '../../../utils/cn';

interface PairMatchProps {
  /** Left column: hanzi tiles, or speaker tiles that play the word. The right column is always meanings. */
  variant: 'hanzi' | 'sound';
  cards: Flashcard[];
  /** Right-column order. */
  meanings: Flashcard[];
  activeBook: (typeof SAMPLE_BOOKS)[number];
  /** A pair was matched; `firstTry` is false when either tile was in an earlier wrong pair. */
  onPair: (card: Flashcard, firstTry: boolean) => void;
  /** A wrong pair: these two words were mixed up. */
  onMismatch: (leftId: string, rightId: string) => void;
}

type Side = 'left' | 'right';
const WRONG_FLASH_MS = 420;
const PLAYING_MS = 900;
const NO_NUMBER_OPTIONS: readonly number[] = [];
const ignoreNumberSelection = () => {};

/** Nine bar heights (px) from the word's id: each sound tile gets its own shape to recognise it by. */
function waveHeights(id: string): number[] {
  let h = 7;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return Array.from({ length: 9 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const edge = i === 0 || i === 8 ? 0.45 : 1;
    return Math.round((8 + (h % 18)) * edge);
  });
}

/** Speaker badge plus a wave; once matched it becomes the word itself. */
const SoundFace: React.FC<{ card: Flashcard; playing: boolean; matched: boolean }> = ({ card, playing, matched }) => {
  if (matched) {
    return (
      <span className="flex items-center justify-center gap-2.5">
        <span className="font-chinese text-2xl font-bold text-ui-ink-strong sm:text-3xl">{card.front}</span>
        {card.pinyin && <span className="text-sm font-extrabold text-ui-muted-strong">{numberToToneMarks(card.pinyin)}</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center gap-3 text-brand-primary">
      <span className="flex shrink-0 items-center justify-center">
        <AppIcon name="audio" size={26} />
      </span>
      <span aria-hidden="true" className={cn('flex h-7 items-center gap-[3px]', playing && 'rw-wave-playing')}>
        {waveHeights(card.id).map((height, i) => (
          <span
            key={i}
            className={cn('w-1 rounded-full bg-current', playing ? 'opacity-100' : 'opacity-55')}
            style={{ height, animationDelay: `${(i % 4) * 70}ms` }}
          />
        ))}
      </span>
    </span>
  );
};

export const PairMatch: React.FC<PairMatchProps> = ({ variant, cards, meanings, activeBook, onPair, onMismatch }) => {
  const reduceMotion = useReducedMotion();
  const rate = useAppStore((state) => state.pronunciationRate);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const [picked, setPicked] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [flash, setFlash] = useState<{ left: string; right: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playTimer = useRef<number | undefined>(undefined);
  const touched = useRef(new Set<string>());
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(playTimer.current);
  }, []);

  const tap = (side: Side, card: Flashcard) => {
    if (flash || matched.has(card.id)) return;
    if (side === 'left') {
      void audioService.playCard(card, rate);
      setPlayingId(card.id);
      window.clearTimeout(playTimer.current);
      playTimer.current = window.setTimeout(() => setPlayingId(null), PLAYING_MS);
    }
    if (!picked || picked.side === side) {
      setPicked(picked && picked.side === side && picked.id === card.id ? null : { side, id: card.id });
      return;
    }
    const leftId = side === 'left' ? card.id : picked.id;
    const rightId = side === 'right' ? card.id : picked.id;
    setPicked(null);
    if (leftId === rightId) {
      setMatched((previous) => new Set(previous).add(leftId));
      const word = cards.find((c) => c.id === leftId);
      if (word) onPair(word, !touched.current.has(leftId));
      return;
    }
    touched.current.add(leftId).add(rightId);
    onMismatch(leftId, rightId);
    setFlash({ left: leftId, right: rightId });
    timer.current = window.setTimeout(() => setFlash(null), WRONG_FLASH_MS);
  };

  const stateOf = (side: Side, id: string): PracticeChoiceState => {
    if (matched.has(id)) return 'muted';
    if (flash && flash[side] === id) return 'wrong';
    return picked?.side === side && picked.id === id ? 'selected' : 'idle';
  };
  const selected = `${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`;

  useNumberKeySelection({
    items: NO_NUMBER_OPTIONS,
    onSelect: ignoreNumberSelection,
    disabled: Boolean(flash) || matched.size === cards.length,
    onDebugAnswer: () => {
      setPicked(null);
      setMatched(new Set(cards.map((card) => card.id)));
      for (const card of cards) onPair(card, !touched.current.has(card.id));
    },
  });

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-3 gap-y-3"
    >
      {cards.map((card, i) => {
        const meaning = meanings[i];
        return (
          <React.Fragment key={card.id}>
            <PracticeChoiceButton
              compact
              data-quiz-launch-target={i === 0 ? '' : undefined}
              state={stateOf('left', card.id)}
              disabled={matched.has(card.id)}
              onClick={() => tap('left', card)}
              aria-label={variant === 'sound' && !matched.has(card.id) ? `Sound ${i + 1}` : card.front}
              selectedClassName={selected}
              selectedEdgeColor={activeBook.accentHex}
              className="min-h-20"
            >
              {variant === 'sound'
                ? <SoundFace card={card} playing={playingId === card.id} matched={matched.has(card.id)} />
                : <span className="font-chinese text-2xl font-bold sm:text-3xl">{card.front}</span>}
            </PracticeChoiceButton>
            {meaning && (
              <PracticeChoiceButton
                compact
                state={stateOf('right', meaning.id)}
                disabled={matched.has(meaning.id)}
                onClick={() => tap('right', meaning)}
                selectedClassName={selected}
                selectedEdgeColor={activeBook.accentHex}
                className="min-h-20"
              >
                <span className="text-base leading-snug sm:text-lg">
                  {(simpleDefinitions && meaning.simple) ? meaning.simple : meaning.back}
                </span>
              </PracticeChoiceButton>
            )}
          </React.Fragment>
        );
      })}
    </motion.div>
  );
};
