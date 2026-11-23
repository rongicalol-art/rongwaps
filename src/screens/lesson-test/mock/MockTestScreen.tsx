import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FeedbackBottomBar } from '../../../features/practice';
import type { MockTestPool } from '../../../hooks/useMockTestPool';
import { useReviewTone } from '../../../hooks/useReviewTone';
import { ActionButton, ScreenHeader } from '../../../lib/widgets';
import type { MockTestAttempt } from '../../../store/slices/mockTestSlice';
import { useAppStore } from '../../../store/useAppStore';
import type { LessonTestScreen as TestScreen } from '../../../utils/lesson/lessonTestPlan';
import { ADAPTIVE_FULL, ADAPTIVE_QUICK } from '../../../utils/mockTest/adaptiveScale';
import { AnswerDetail } from '../components/AnswerDetail';
import { TestWords } from '../components/ChineseText';
import { PartIntro } from '../components/PartIntro';
import { QuestionBody } from '../components/QuestionBody';
import { TestBooklet } from '../components/TestBooklet';
import { TestDock } from '../components/TestDock';
import { TestLookup } from '../components/TestLookup';
import { useTestAudioPreparation } from '../hooks/useTestAudioPreparation';
import { testRecordings, turnGapMs } from '../testAudioSequence';
import { itemPictureUrls } from '../testPictures';
import { hasTestScript } from '../testScript';
import { AnswerTimer, AnswerTimerDock } from './AnswerTimer';
import { MockTestScore } from './MockTestScore';
import { mockTestTitle } from './mockTestText';
import { useMockTestRun } from './useMockTestRun';
import { clockText, useReadingClock } from './useReadingClock';

interface MockTestScreenProps {
  data: MockTestPool;
  attempt: MockTestAttempt;
  onClose: () => void;
}

/** As on the TOCFL computer test: about ten seconds to answer once a recording has played. */
const ANSWER_MS = 10_000;
/** The reading part's clock: the exam's 60 minutes, and a quarter of it for a quick test. */
const READING_MS = { full: 60 * 60_000, quick: 15 * 60_000 };
const NO_SOUNDS = {};

/** Number of the first question on each screen (a paragraph screen covers several). */
function questionNumbers(screens: TestScreen[]) {
  let next = 0;
  return screens.map((screen) => { const first = next; next += screen.questionIds.length; return first; });
}

/**
 * A mock test in the lesson test's own screens, run by the exam's rules. Listening: each recording plays by itself
 * and can't be replayed, then a bar gives ten seconds and the test moves on (a quick test may also go on early).
 * Reading: one clock for the whole part; a fixed paper lets the learner go back, the adaptive test does not. Then the
 * score, with the Fix round and the answers.
 */
export function MockTestScreen({ data, attempt, onClose }: MockTestScreenProps) {
  const run = useMockTestRun(data, attempt);
  const { config } = run;
  const script = useAppStore((state) => state.characterPreference);
  const lookingUp = useAppStore((state) => state.dictionaryWord !== null);
  const reduceMotion = useReducedMotion();
  const title = mockTestTitle(config);
  const planned = useMemo(() => new Map(run.plan.items.map((entry) => [entry.itemId, entry])), [run.plan]);
  const numbers = useMemo(() => questionNumbers(run.screens), [run.screens]);
  const isFix = run.stage === 'fix';
  useReviewTone(isFix);
  const [bookletOpen, setBookletOpen] = useState(false);

  const screen = isFix ? run.fix.screen : run.screen;
  const item = screen ? data.items.get(screen.itemId) : undefined;
  const origin = screen ? data.entries.get(screen.itemId)?.origin : undefined;
  const sounds = (origin && data.sounds.get(origin.bookId)) || NO_SOUNDS;
  const plannedItem = screen ? planned.get(screen.itemId) : undefined;
  const answers = isFix ? run.fix.answers : run.answers;
  const ready = Boolean(screen?.questionIds.every((id) => answers[id] !== undefined));
  /** Names and book words kept whole, from every lesson the test draws on. */
  const words = useMemo(() => [...new Set(run.plan.items.flatMap((entry) => data.entries.get(entry.itemId)?.origin.allowWords ?? []))], [data.entries, run.plan]);

  // The next screen's pictures load while this one is answered.
  const nextScreen = isFix ? run.fix.screens[run.fix.index + 1] : run.screens[run.screenIndex + 1];
  useEffect(() => {
    const nextItem = nextScreen && data.items.get(nextScreen.itemId);
    if (nextItem) for (const url of itemPictureUrls(nextItem)) new Image().src = url;
  }, [data.items, nextScreen]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const position = isFix ? run.fix.index : run.screenIndex;
  const screenKey = `${run.stage}:${position}`;
  const [scriptOpen, setScriptOpen] = useState(false);
  useEffect(() => { setScriptOpen(false); }, [screenKey]);
  useEffect(() => { scrollerRef.current?.scrollTo({ top: 0 }); }, [screenKey]);

  // Each screen's recordings download as it comes up, and the next two behind it (the adaptive test only knows its
  // next question once this one is answered).
  const recordingsOf = useCallback((list: TestScreen[]) => list.map((entry) => {
    const entryItem = data.items.get(entry.itemId);
    const entryOrigin = data.entries.get(entry.itemId)?.origin;
    const entryQuestions = entryItem?.questions.filter((q) => entry.questionIds.includes(q.id)) ?? [];
    return entryItem && entryQuestions.length ? testRecordings(entryItem, entryQuestions, (entryOrigin && data.sounds.get(entryOrigin.bookId)) || NO_SOUNDS) : [];
  }), [data]);
  const examRecordings = useMemo(() => recordingsOf(run.screens), [recordingsOf, run.screens]);
  const fixRecordings = useMemo(() => recordingsOf(run.fix.screens), [recordingsOf, run.fix.screens]);
  const audioReady = useTestAudioPreparation(isFix ? fixRecordings : examRecordings, position, screenKey);

  // The Fix round's bar grows with its explanation; the question keeps clear of it (see LessonTestScreen).
  const checkedRef = useRef(false);
  checkedRef.current = isFix && run.fix.checked;
  const barRef = useCallback((bar: HTMLDivElement | null) => {
    const scroller = scrollerRef.current;
    if (!bar || !scroller) return undefined;
    const observer = new ResizeObserver(() => {
      scroller.style.setProperty('--cover', `${bar.offsetHeight}px`);
      if (checkedRef.current) scroller.scrollTop = scroller.scrollHeight;
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      scroller.style.removeProperty('--cover');
    };
  }, []);

  const listening = !isFix && run.stage === 'question' && screen?.part === 'listening';
  const reading = !isFix && run.stage === 'question' && screen?.part === 'reading';
  const clock = useReadingClock(reading, run.readingMs, READING_MS[config.length], run.timeUp);
  // The time to answer starts when the recording has played; it belongs to one screen.
  const [answerTime, setAnswerTime] = useState<{ key: string; at: number } | null>(null);
  const openAnswerTime = useCallback(() => setAnswerTime({ key: screenKey, at: Date.now() }), [screenKey]);
  const timer = listening && answerTime?.key === screenKey ? { startedAt: answerTime.at, durationMs: ANSWER_MS } : null;
  const { next, back, answer, saveClock } = run;
  const { usedMs } = clock;
  const goNext = useCallback(() => next(usedMs()), [next, usedMs]);
  const goBack = useCallback(() => back(usedMs()), [back, usedMs]);
  const answerNow = useCallback((questionId: string, choice: number | undefined) => answer(questionId, choice, usedMs()), [answer, usedMs]);
  // The reading clock is saved whenever the test is left (closed, hidden or the tab shut), so no time comes back.
  useEffect(() => {
    if (!reading) return undefined;
    const flush = () => saveClock(usedMs());
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [reading, saveClock, usedMs]);

  if (run.stage === 'results' && run.finished) {
    const misses = run.finished.score.missed.length;
    return (
      <>
        <MockTestScore
          config={config}
          result={run.finished.result}
          misses={misses}
          onFix={run.startFix}
          onAnswers={() => setBookletOpen(true)}
          onClose={onClose}
          covered={bookletOpen}
        />
        <AnimatePresence>
          {bookletOpen && (
            <TestBooklet
              key="booklet"
              items={data.items}
              title={title}
              words={words}
              plan={run.plan}
              answers={run.answers}
              rise
              onClose={() => setBookletOpen(false)}
              footer={misses > 0 && (
                <ActionButton size="lg" fullWidth className="text-base tracking-wider md:text-lg" onClick={() => { setBookletOpen(false); run.startFix(); }}>
                  Fix {misses} mistake{misses === 1 ? '' : 's'}
                </ActionButton>
              )}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // The adaptive test's length isn't known ahead: its bar runs to the most it can ask.
  const limit = (config.length === 'quick' ? ADAPTIVE_QUICK : ADAPTIVE_FULL);
  const examTotal = run.adaptive
    ? config.parts.reduce((sum, part) => sum + limit[part].maxQuestions, 0)
    : numbers.length ? numbers[numbers.length - 1] + run.screens[run.screens.length - 1].questionIds.length : 0;
  const shownIndex = isFix ? run.fix.index : numbers[run.screenIndex] ?? 0;
  const shownTotal = isFix ? run.fix.screens.length : Math.max(examTotal, shownIndex + 1);
  const done = isFix ? run.fix.index + (run.fix.checked ? 1 : 0) : shownIndex;
  const header = (
    <ScreenHeader
      variant="window"
      tone="practice"
      onClose={onClose}
      progress={shownTotal ? (done / shownTotal) * 100 : 0}
      currentIndex={shownIndex}
      totalCount={shownTotal}
      rightAction={reading ? (
        <span role="timer" aria-label="Reading time left" className="text-sm font-black tabular-nums text-ui-muted-strong">{clockText(clock.leftMs)}</span>
      ) : null}
    />
  );

  if (!screen || !item || !plannedItem) return null;

  const intro = run.stage === 'intro';
  const fixQuestions = item.questions.filter((question) => screen.questionIds.includes(question.id));
  const correct = fixQuestions.every((question) => answers[question.id] === question.key);
  const checked = isFix && run.fix.checked;
  const barShown = isFix && (checked || ready);
  // The adaptive test needs an answer to choose what comes next; a fixed paper's question may be left blank.
  const mayGoOn = reading ? (!run.adaptive || ready) : listening && config.length === 'quick' && ready;
  const nextLabel = !run.adaptive && run.screenIndex + 1 >= run.screens.length ? 'Finish' : 'Next';

  return (
    <TestWords value={words}>
      {/* Words can be looked up once a Fix round answer is checked, never during the test. */}
      <TestLookup on={checked}>
      <div ref={scrollerRef} className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain custom-scrollbar">
        {header}
        {intro ? null : (
        <motion.div
          key={screenKey}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
          className={`flex flex-auto flex-col px-4 pt-[clamp(0.75rem,5vh,3.5rem)] sm:px-6 ${barShown ? '' : 'pb-36'}`}
          style={barShown ? { paddingBottom: 'max(9rem, calc(var(--cover, 0px) + 1.5rem))' } : undefined}
        >
          <QuestionBody
            item={item}
            questionIds={screen.questionIds}
            planned={plannedItem}
            answers={answers}
            checked={checked}
            mode={isFix ? 'replay' : 'exam'}
            sounds={sounds}
            turnGap={origin ? turnGapMs(origin) : undefined}
            audioReady={audioReady}
            script={script}
            firstNumber={(numbers[run.screens.findIndex((entry) => entry.itemId === screen.itemId)] ?? 0) + 1}
            onAnswer={isFix ? run.fix.answer : answerNow}
            scriptOpen={scriptOpen}
            onCloseScript={() => setScriptOpen(false)}
            onAudioDone={listening ? openAnswerTime : undefined}
          />
        </motion.div>
        )}
      </div>
      {intro ? null : isFix ? (
        <FeedbackBottomBar
          status={checked ? (correct ? 'correct' : 'wrong') : 'idle'}
          detail={checked ? <AnswerDetail item={item} questions={fixQuestions} script={script} /> : undefined}
          onCheck={run.fix.check}
          isCheckDisabled={!ready}
          onContinue={run.continueFix}
          keyboardShortcutDisabled={scriptOpen || lookingUp}
          layout="wide"
          barRef={barRef}
          secondaryAction={checked && hasTestScript(item) ? { label: 'Script', icon: 'script', onPress: () => setScriptOpen(true) } : undefined}
        />
      ) : mayGoOn ? (
        <TestDock
          key={screenKey}
          label={nextLabel}
          onPress={goNext}
          riseKey={screenKey}
          secondary={run.canGoBack ? { label: 'Back', onPress: goBack } : undefined}
          above={timer ? <AnswerTimer {...timer} onDone={goNext} /> : undefined}
        />
      ) : timer && (
        <AnswerTimerDock key={screenKey} {...timer} onDone={goNext} />
      )}
      <AnimatePresence>
        {intro && <PartIntro key={screen.part} part={screen.part} title={title} loading={null} onDone={() => run.setStage('question')} />}
      </AnimatePresence>
      </TestLookup>
    </TestWords>
  );
}
