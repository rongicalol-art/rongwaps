import { memo, type Ref } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, ContextualChineseText } from '../../../lib/widgets';
import type { GrammarWordToken, PracticeLine, PracticeSentence, SlotBuildItem } from '../../../types/models';
import { practiceSlots } from '../../../utils/grammar/grammarPracticeCheck';
import { cn } from '../../../utils/cn';
import { LEADING_CLOSING, textIn, type PracticeScript } from '../practiceTypes';
import { BookBlank, type BookBlankState } from './BookBlank';
import { PracticeScene } from './PracticeScene';
import { PracticeTileButton } from './PracticeTileButton';
import { SentencePlayButton } from './SentencePlayButton';

export interface ExerciseItemState {
  /** Slot id → tile index. */
  placed: Record<string, number>;
  status: 'idle' | 'checking' | 'wrong' | 'correct' | 'revealed';
  tries: number;
  /** Slots shown wrong after a check. */
  wrong: string[];
  note?: string;
  sentence?: PracticeSentence;
}

interface ExerciseItemProps {
  ref?: Ref<HTMLLIElement>;
  item: SlotBuildItem;
  /** Position on the page, from 0; shown as number + 1. */
  index: number;
  state: ExerciseItemState;
  active: boolean;
  script: PracticeScript;
  showPinyin: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  onActivate: (index: number) => void;
  onPlace: (index: number, tile: number) => void;
  onTakeBack: (index: number, slotId: string) => void;
}

/** Chinese line size; the badge and feedback indents are measured in it. */
const LINE_SIZE = 'text-xl sm:text-2xl lg:text-3xl';
const SHAKE = { x: [0, -6, 5, -4, 2, 0], transition: { duration: 0.36, ease: 'easeOut' as const } };

/**
 * One numbered item on a Book 1 exercise page: its lines with blanks, the book picture beside it, and (while active) its words.
 * Memoised: answering one item re-renders only that item.
 */
export const ExerciseItem = memo(function ExerciseItem({
  ref, item, index, state, active, script, showPinyin, contextTokens, onOpenWord, onActivate, onPlace, onTakeBack,
}: ExerciseItemProps) {
  const number = index + 1;
  const reduceMotion = useReducedMotion();
  const slots = practiceSlots(item);
  const finished = state.status === 'correct' || state.status === 'revealed';
  const answering = active && !finished;
  const editable = answering && state.status === 'idle';
  const nextSlot = editable ? slots.find((slot) => state.placed[slot.id] === undefined)?.id : undefined;
  const dialogue = item.lines.some((line) => line.speaker);
  const used = new Set(Object.values(state.placed));
  const bank = item.tiles.map((_, tile) => tile).filter((tile) => !used.has(tile));
  const textOf = (tile: number) => textIn(item.tiles[tile], script);

  // The picture comes first on phone (as in the book) and sits beside the lines on wider screens.
  // A row of people always goes above. Columns are explicit ranges: `cn` drops a start when a span follows it.
  const scene = item.scene;
  const above = scene?.type === 'cast' || scene?.type === 'change';
  const layout = !scene
    ? { badge: 'row-start-1', body: 'col-[2/4] row-start-1', bank: 'col-[2/4] row-start-2' }
    : above
      ? { badge: 'row-start-2', scene: 'col-[2/4] row-start-1 mb-4 max-w-md', body: 'col-[2/4] row-start-2', bank: 'col-[2/4] row-start-3' }
      : {
        badge: 'row-start-2 sm:row-start-1',
        scene: 'col-[2/4] row-start-1 mb-4 w-full max-w-80 sm:col-[3/4] sm:row-span-2 sm:mb-0 sm:w-60',
        body: 'col-[2/4] row-start-2 sm:col-[2/3] sm:row-start-1',
        bank: 'col-[2/4] row-start-3 sm:col-[2/3] sm:row-start-2',
      };

  const blankState = (slotId: string): BookBlankState => {
    if (state.placed[slotId] === undefined) return slotId === nextSlot ? 'next' : 'empty';
    if (state.status === 'correct') return 'correct';
    if (state.status === 'revealed') return 'revealed';
    if (state.status === 'wrong' && state.wrong.includes(slotId)) return 'wrong';
    return 'filled';
  };

  // A closing mark never wraps alone: it stays with the blank before it.
  const renderLine = (line: PracticeLine) => line.segments.map((segment, at) => {
    if (segment.type === 'text') {
      const full = textIn(segment, script);
      const text = line.segments[at - 1]?.type === 'slot' ? full.replace(LEADING_CLOSING, '') : full;
      return text && <ContextualChineseText key={at} wordClassName="font-chinese font-semibold" text={text} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />;
    }
    const tile = state.placed[segment.id];
    const next = line.segments[at + 1];
    const closing = next?.type === 'text' ? textIn(next, script).match(LEADING_CLOSING)?.[0] : undefined;
    const blank = (
      <BookBlank
        key={segment.id}
        state={blankState(segment.id)}
        quiet={!answering}
        narrow={slots.length >= 4}
        word={tile === undefined ? undefined : { text: textOf(tile), onTakeBack: editable ? () => onTakeBack(index, segment.id) : undefined }}
      />
    );
    return closing ? <span key={segment.id} className="whitespace-nowrap">{blank}{closing}</span> : blank;
  });

  return (
    <li
      ref={ref}
      aria-current={answering ? 'step' : undefined}
      onClick={answering || finished ? undefined : () => onActivate(index)}
      className={cn(
        'relative grid scroll-mt-[22vh] grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 rounded-feature border-2 border-b-4 border-transparent px-3 pb-4 pt-3.5 transition-colors duration-200 motion-reduce:transition-none sm:gap-x-5 sm:px-[18px] sm:pb-5.5 sm:pt-4.5',
        // A hairline after every numbered item, the active one included; the line above the active band would touch it, so it hides.
        'after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ui-divider last:after:hidden sm:after:inset-x-5 [&:has(+[aria-current=step])]:after:hidden',
        answering && 'border-ui-border bg-ui-surface after:hidden',
        !finished && !answering && 'cursor-pointer',
      )}
    >
      <span className={cn('col-[1/2] flex h-[1.75em] items-center', LINE_SIZE, layout.badge)}>
        <span
          aria-label={`Item ${number}${state.status === 'correct' ? ', correct' : ''}`}
          className={cn(
            'flex size-[30px] items-center justify-center rounded-xs border-2 border-b-[3px] font-sans text-sm font-black transition-colors duration-200 sm:size-[34px] sm:text-base lg:size-9',
            state.status === 'correct' ? 'border-brand-primary-edge bg-brand-primary text-brand-on-primary'
              : answering ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep'
                : 'border-ui-border bg-ui-surface text-ui-muted-strong',
          )}
        >
          {state.status === 'correct' ? <AppIcon name="check" size={16} /> : number}
        </span>
      </span>

      <motion.div animate={state.status === 'wrong' && !reduceMotion ? SHAKE : { x: 0 }} className={cn('min-w-0', layout.body)}>
        {item.lines.map((line, at) => (
          <p key={at} className={cn('flex items-baseline font-chinese font-semibold text-ui-ink-strong', LINE_SIZE, 'leading-[1.75]')}>
            {line.speaker && <span className="w-[2em] shrink-0 font-sans text-[0.75em] font-black text-ui-muted">{textIn(line.speaker, script)}:</span>}
            <span className="min-w-0">{renderLine(line)}</span>
          </p>
        ))}
        {(state.note || state.sentence) && (
          <div className={cn(dialogue && 'pl-[1.5em]', LINE_SIZE)}>
            {state.note && (
              <p className={cn('mt-1 text-base font-extrabold leading-snug sm:text-lg', state.status === 'revealed' ? 'text-ui-ink' : 'text-feedback-danger-text')}>{state.note}</p>
            )}
            {state.sentence && (
              <div>
                {showPinyin && <p className="mt-1 text-base font-bold text-ui-muted-strong sm:text-lg">{state.sentence.pinyin}</p>}
                <div className="mt-1 flex items-start gap-2">
                  <p className="min-w-0 text-base font-bold leading-snug text-ui-muted-strong sm:text-lg">{state.sentence.english}</p>
                  <SentencePlayButton sentence={state.sentence} script={script} />
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {scene && (
        <div className={cn('self-start', layout.scene)}>
          <PracticeScene
            scene={scene}
            arrived={finished}
            renderChinese={(text) => <ContextualChineseText wordClassName="font-chinese font-semibold" text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
          />
        </div>
      )}

      {answering && (
        <div
          role="group"
          aria-label="Word choices"
          className={cn('mt-4 flex flex-wrap gap-2.5 sm:mt-5 sm:gap-3', layout.bank)}
        >
          {bank.map((tile) => (
            <PracticeTileButton
              key={tile}
              tile={item.tiles[tile]}
              script={script}
              disabled={!editable}
              slim
              onClick={() => onPlace(index, tile)}
            />
          ))}
        </div>
      )}
    </li>
  );
});
