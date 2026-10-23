import { useCallback, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GrammarPractice, GrammarWordToken } from '../../types/models';
import { PracticeDock } from './components/PracticeDock';
import { PRACTICE_EXERCISES } from './exercises';
import { ITEM_FADE } from './practiceMotion';
import type { PracticeExerciseProps, PracticeResult, PracticeScript, PracticeStatus } from './practiceTypes';

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

const QUIET_KINDS = new Set(['listen-build', 'listen-pick', 'match-pairs']);

/**
 * The book exercise after a grammar page, one item at a time in a single
 * column, with sentence choices beneath the answer and actions in the bottom bar. A wrong answer says why and offers
 * Try again; nothing is recorded until the exercise is done.
 */
export function GrammarPracticeView({
  practice, script, showPinyin, contextTokens, onOpenWord, onComplete, onExit, barHost, initialIndex = 0, shortcutsDisabled = false,
}: GrammarPracticeViewProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);
  const [status, setStatus] = useState<PracticeStatus>('idle');
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [trayHost, setTrayHost] = useState<HTMLDivElement | null>(null);
  // The leaving item's inline bank unmounts after the next item's dock tray mounts: a null from it must not clear the new host.
  const claimTray = useCallback((element: HTMLDivElement | null) => { if (element) setTrayHost(element); }, []);
  const checkRef = useRef<(() => void) | null>(null);
  const item = practice.items[index];
  const Exercise = PRACTICE_EXERCISES[item.kind] as ComponentType<PracticeExerciseProps>;
  // The play button, or the two columns, already say what to do; elsewhere the item says so with `quiet`.
  const title = item.quiet || QUIET_KINDS.has(item.kind) ? null : item.prompt ?? practice.title;
  const inlineBank =item.kind === 'order-build' || item.kind === 'listen-build' || item.kind === 'chat-build' || item.kind === 'slot-build' || item.kind === 'slot-reels';

  // A result that lands after the learner moved on is dropped.
  const currentItemId = useRef(item.id);
  currentItemId.current = item.id;
  const handleResult = useCallback((next: PracticeResult, itemId: string) => {
    if (itemId !== currentItemId.current) return;
    setChecking(false);
    setResult(next);
    setStatus(next.correct ? 'correct' : 'wrong');
  }, []);

  /** Next item, or the end of the exercise. */
  const advance = () => {
    if (index + 1 >= practice.items.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
    setReady(false);
    setStatus('idle');
    setResult(null);
  };
  const goBack = () => {
    setIndex(index - 1);
    setReady(false);
    setStatus('idle');
    setResult(null);
  };
  const handleContinue = () => {
    if (status !== 'wrong') {
      advance();
      return;
    }
    setRetryKey((key) => key + 1);
    setStatus('idle');
    setResult(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-24">
      {title && <h1 className="text-2xl font-black leading-tight text-balance text-ui-ink-strong sm:text-3xl">{title}</h1>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: ITEM_FADE }}
          exit={reduceMotion ? undefined : { opacity: 0, transition: ITEM_FADE }}
        >
          <Exercise
            item={item}
            script={script}
            status={status}
            retryKey={retryKey}
            showPinyin={showPinyin}
            showTranslation={false}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
            shortcutsDisabled={shortcutsDisabled}
            trayHost={trayHost}
            onReadyChange={setReady}
            checkRef={checkRef}
            onResult={(next) => handleResult(next, item.id)}
          />
          {inlineBank && <div ref={claimTray} role="group" aria-label="Word choices" className="mt-6 flex min-h-24 flex-wrap content-start justify-center gap-2 rounded-feature bg-ui-divider/50 p-3.5 shadow-[inset_0_2px_0_color-mix(in_srgb,var(--color-ui-ink-strong)_5%,transparent)]" />}
        </motion.div>
      </AnimatePresence>

      <PracticeDock
        host={barHost}
        status={status}
        ready={ready}
        hasCheck={item.kind !== 'match-pairs' && item.kind !== 'listen-pick' && item.kind !== 'sort-groups' && item.kind !== 'spot-fix'}
        checking={checking}
        result={result}
        script={script}
        shortcutsDisabled={shortcutsDisabled}
        onTrayRef={inlineBank ? undefined : claimTray}
        onCheck={() => {
          setChecking(true);
          checkRef.current?.();
        }}
        onSkip={advance}
        onBack={index > 0 ? goBack : onExit}
        onContinue={handleContinue}
      />
    </div>
  );
}
