import { useCallback, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GrammarPractice, GrammarWordToken } from '../../types/models';
import { PracticeDock } from './components/PracticeDock';
import { sceneFirstPicture } from './components/PictureScene';
import { PRACTICE_EXERCISES } from './exercises';
import { orderBuildHeading } from './exercises/OrderBuildExercise';
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

/**
 * The book exercise after a grammar page, one item at a time in a single
 * column, with sentence choices beneath the answer and actions in the bottom bar. A wrong answer says why and offers
 * Try again; nothing is recorded until the exercise is done.
 */
export function GrammarPracticeView({
  practice, script, showPinyin, showTranslation, contextTokens, onOpenWord, onComplete, onExit, barHost, initialIndex = 0, shortcutsDisabled = false,
}: GrammarPracticeViewProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);
  const [status, setStatus] = useState<PracticeStatus>('idle');
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [trayHost, setTrayHost] = useState<HTMLDivElement | null>(null);
  const checkRef = useRef<(() => void) | null>(null);
  const item = practice.items[index];
  const Exercise = PRACTICE_EXERCISES[item.kind] as ComponentType<PracticeExerciseProps>;
  const inlineBank = item.kind === 'order-build' || item.kind === 'listen-build' || item.kind === 'chat-build' || item.kind === 'slot-build' || item.kind === 'slot-reels';
  // This source-checked clock pair supplies the time context visually. Keep its written explanation in the hint.
  const clockReading = item.id === 'l8g5-p2' || ('scene' in item && item.scene?.type === 'countdown' && Boolean(item.scene.now.time && item.scene.next.time));
  const sceneFirst = 'scene' in item && item.scene?.type === 'picture' && Boolean(sceneFirstPicture(item.scene));
  const heading = sceneFirst ? (item.kind === 'order-build' ? (item.sub ? 'Your reply' : 'Build the sentence') : 'Drag and place') : clockReading ? 'Complete the sentence' : item.kind === 'order-build' ? orderBuildHeading(item) : item.prompt;

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 pb-24">
      <header className="flex flex-col gap-1">
        <span className="ui-eyebrow text-ui-muted">Book exercise · p.{practice.bookPage}</span>
        {/* The item's own question is the title; the book's general instruction only when an item has none. */}
        <h1 className="text-2xl font-black leading-tight text-balance text-ui-ink-strong sm:text-3xl">{heading ?? practice.title}</h1>
        {clockReading && !sceneFirst && item.prompt && (
          <details key={item.id} open={status !== 'idle'} className="mt-2 text-sm font-bold text-ui-muted-strong">
            <summary data-action="" className="w-fit cursor-pointer rounded-xs focus-ring-inline">Hint</summary>
            <p className="mt-2">{item.prompt}</p>
          </details>
        )}
      </header>

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
            showTranslation={showTranslation}
            contextTokens={contextTokens}
            onOpenWord={onOpenWord}
            shortcutsDisabled={shortcutsDisabled}
            trayHost={trayHost}
            onReadyChange={setReady}
            checkRef={checkRef}
            onResult={(next) => handleResult(next, item.id)}
          />
          {inlineBank && <div ref={setTrayHost} role="group" aria-label="Word choices" className="mt-6 flex min-h-20 flex-wrap content-start justify-center gap-2" />}
        </motion.div>
      </AnimatePresence>

      <PracticeDock
        host={barHost}
        status={status}
        ready={ready}
        checking={checking}
        result={result}
        script={script}
        shortcutsDisabled={shortcutsDisabled}
        onTrayRef={inlineBank ? undefined : setTrayHost}
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
