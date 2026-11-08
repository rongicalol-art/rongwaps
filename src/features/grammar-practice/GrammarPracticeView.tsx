import { useCallback, useMemo, useReducer, useState, type ComponentType, type MutableRefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { GrammarPractice, GrammarWordToken, PracticeItem } from '../../types/models';
import { PracticeDock } from './components/PracticeDock';
import { PRACTICE_EXERCISES } from './exercises';
import { ITEM_FADE } from './practiceMotion';
import type { PracticeExerciseProps, PracticeScript } from './practiceTypes';
import { practiceStepsReducer, startSteps, stepAt } from './practiceSteps';
import { shuffleItems } from '../../utils/srs/sessionOrder';

export interface GrammarPracticeViewProps {
  practice: GrammarPractice;
  script: PracticeScript;
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  /** All items done (or skipped): hand back to the lesson flow. */
  onComplete: () => void;
  /** Back from the first item leaves the exercise (to its grammar page). */
  onExit?: () => void;
  /** The window's non-scrolling column: the dock sits at its bottom. */
  barHost: HTMLElement | null;
  /** Start at this item (UI Previews). */
  initialIndex?: number;
  /** A panel (book page, dictionary, notes) is open on top: ignore key shortcuts. */
  shortcutsDisabled?: boolean;
}

const INLINE_BANK = new Set<PracticeItem['kind']>(['reply-pick', 'order-build', 'listen-build', 'chat-build', 'slot-build', 'slot-reels']);
const NO_CHECK = new Set<PracticeItem['kind']>(['match-pairs', 'listen-pick', 'same-meaning', 'sort-groups', 'spot-fix']);

/**
 * The book exercise after a grammar page, one item at a time in a single
 * column, with sentence choices beneath the answer and actions in the bottom bar. A wrong answer says why and offers
 * Try again; nothing is recorded until the exercise is done. Back steps to the previous item exactly as the learner
 * left it: every opened item stays mounted (hidden), so an answered one shows its answer, locked.
 */
export function GrammarPracticeView({
  practice, script, showPinyin, contextTokens, onOpenWord, onComplete, onExit, barHost, initialIndex = 0, shortcutsDisabled = false,
}: GrammarPracticeViewProps) {
  const reduceMotion = useReducedMotion();
  const [state, dispatch] = useReducer(practiceStepsReducer, initialIndex, startSteps);
  const { index } = state;
  const step = stepAt(state);
  // Mix once per visit of the exercise, not on each pick, retry or step back. Every occurrence keeps its own identity,
  // and the bank never shows the authored order (repeated words compared by what they show).
  const items = useMemo(() => practice.items.map((source) => ('tiles' in source
    ? { ...source, tiles: shuffleItems(source.tiles, (a, b) => a.traditional === b.traditional) }
    : source)), [practice]);
  const checkRefs = useMemo(() => items.map((): MutableRefObject<(() => void) | null> => ({ current: null })), [items]);
  const readyHandlers = useMemo(() => items.map((_, at) => (ready: boolean) => dispatch({ type: 'ready', index: at, ready })), [items]);
  // Sentence builds keep their bank beneath the sentence (one per item); the other kinds share the dock's.
  const [trays, setTrays] = useState<Record<number, HTMLElement>>({});
  const trayRefs = useMemo(() => items.map((_, at) => (element: HTMLDivElement | null) => {
    if (element) setTrays((current) => (current[at] === element ? current : { ...current, [at]: element }));
  }), [items]);
  const [dockTray, setDockTray] = useState<HTMLDivElement | null>(null);

  const item = items[index];
  const needsInstruction = item.kind === 'reply-pick' || item.kind === 'match-pairs' || (item.kind === 'slot-build' && item.gaps);
  const title = item.quiet && !needsInstruction ? null : item.prompt ?? practice.title;
  const inlineBank = INLINE_BANK.has(item.kind);

  /** Next item, or the end of the exercise. */
  const advance = useCallback(() => {
    if (index + 1 >= items.length) onComplete();
    else dispatch({ type: 'forward' });
  }, [index, items.length, onComplete]);
  const goBack = index > 0 ? () => dispatch({ type: 'back' }) : onExit;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-24">
      {title && <h1 className={`text-2xl font-black leading-tight text-balance text-ui-ink-strong sm:text-3xl ${item.kind === 'same-meaning' ? 'sm:text-center' : ''}`}>{title}</h1>}

      {state.visited.map((at) => {
        const visible = at === index;
        const shown = items[at];
        const own = stepAt(state, at);
        const Exercise = PRACTICE_EXERCISES[shown.kind] as ComponentType<PracticeExerciseProps>;
        const inline = INLINE_BANK.has(shown.kind);
        return (
          <motion.div
            key={shown.id}
            hidden={!visible}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0, transition: visible && !reduceMotion ? ITEM_FADE : { duration: 0 } }}
          >
            <Exercise
              item={shown}
              script={script}
              status={own.status}
              retryKey={own.retryKey}
              showPinyin={showPinyin}
              showTranslation={false}
              contextTokens={contextTokens}
              onOpenWord={onOpenWord}
              shortcutsDisabled={shortcutsDisabled || !visible}
              trayHost={inline ? trays[at] ?? null : visible ? dockTray : null}
              onReadyChange={readyHandlers[at]}
              checkRef={checkRefs[at]}
              onResult={(result) => dispatch({ type: 'result', index: at, result })}
            />
            {inline && <div ref={trayRefs[at]} role="group" aria-label="Word choices" className="mt-6 flex min-h-24 flex-wrap content-start justify-center gap-2 rounded-feature bg-ui-divider/50 p-3.5 shadow-[inset_0_2px_0_color-mix(in_srgb,var(--color-ui-ink-strong)_5%,transparent)]" />}
          </motion.div>
        );
      })}

      <PracticeDock
        host={barHost}
        status={step.status}
        ready={step.ready}
        hasCheck={!NO_CHECK.has(item.kind)}
        checking={step.checking}
        result={step.result}
        script={script}
        shortcutsDisabled={shortcutsDisabled}
        onTrayRef={inlineBank ? undefined : setDockTray}
        onCheck={() => {
          dispatch({ type: 'check' });
          checkRefs[index].current?.();
        }}
        onSkip={advance}
        onBack={goBack}
        backLabel={index > 0 ? 'Back' : 'Grammar'}
        onContinue={step.status === 'wrong' ? () => dispatch({ type: 'retry' }) : advance}
      />
    </div>
  );
}
