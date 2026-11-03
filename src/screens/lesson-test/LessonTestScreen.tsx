import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FeedbackBottomBar } from '../../features/practice';
import { AudioPreparation, ScreenHeader } from '../../lib/widgets';
import { useReviewTone } from '../../hooks/useReviewTone';
import { useAppStore } from '../../store/useAppStore';
import type { LessonTestLesson, LessonTestSounds } from '../../types/lessonTest';
import { lessonItemIndex, type LessonTestScreen as TestScreen } from '../../utils/lesson/lessonTestPlan';
import { AnswerDetail } from './components/AnswerDetail';
import { TestWords } from './components/ChineseText';
import { QuestionBody } from './components/QuestionBody';
import { PartIntro } from './components/PartIntro';
import { TestDock } from './components/TestDock';
import { TestDone, TestResults } from './components/TestResults';
import { useLessonTestRun } from './hooks/useLessonTestRun';
import { useTestAudioDownload } from './hooks/useTestAudioDownload';
import { useTestAudioPreparation } from './hooks/useTestAudioPreparation';
import { testRecordings } from './testAudioSequence';
import { itemPictureUrls } from './testPictures';

interface LessonTestScreenProps {
  lesson: LessonTestLesson;
  sounds: LessonTestSounds;
  onClose: () => void;
}

const NO_WORDS: string[] = [];

/** Number of the first question on each screen (a paragraph screen covers several). */
function questionNumbers(screens: TestScreen[]) {
  let next = 0;
  return screens.map((screen) => { const first = next; next += screen.questionIds.length; return first; });
}

/**
 * The lesson test: 聽力 then 閱讀 with no right or wrong shown, the results, then a Fix round (in the
 * review honey tone) over every miss, with the answer and the reason.
 */
export function LessonTestScreen({ lesson, sounds, onClose }: LessonTestScreenProps) {
  const run = useLessonTestRun(lesson);
  const script = useAppStore((state) => state.characterPreference);
  const reduceMotion = useReducedMotion();
  const items = useMemo(() => lessonItemIndex(lesson), [lesson]);
  const planned = useMemo(() => new Map(run.plan.items.map((entry) => [entry.itemId, entry])), [run.plan]);
  const numbers = useMemo(() => questionNumbers(run.screens), [run.screens]);
  const total = numbers.length ? numbers[numbers.length - 1] + run.screens[run.screens.length - 1].questionIds.length : 0;
  const isFix = run.stage === 'fix';
  useReviewTone(isFix);

  const screen = isFix ? run.fixScreen : run.screen;
  const item = screen ? items.get(screen.itemId) : undefined;
  const plannedItem = screen ? planned.get(screen.itemId) : undefined;
  const answers = isFix ? run.fixAnswers : run.answers;
  const ready = Boolean(screen?.questionIds.every((id) => answers[id] !== undefined));

  // The next screen's pictures load while this one is answered.
  const nextScreen = isFix ? run.fixScreens[run.fixIndex + 1] : run.screens[run.screenIndex + 1];
  useEffect(() => {
    const nextItem = nextScreen && items.get(nextScreen.itemId);
    if (nextItem) for (const url of itemPictureUrls(nextItem)) new Image().src = url;
  }, [items, nextScreen]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const screenKey = `${run.stage}:${isFix ? run.fixIndex : run.screenIndex}`;
  // Every recording downloads before the listening part (the quiz's "Getting audio ready" screen); then each
  // screen's clips are prepared as it comes up, so audio starts on time and never late.
  const recordingsOf = useCallback((list: TestScreen[]) => list.map((entry) => {
    const entryItem = items.get(entry.itemId);
    const entryQuestion = entryItem?.questions.find((q) => q.id === entry.questionIds[0]) ?? entryItem?.questions[0];
    return entryItem && entryQuestion ? testRecordings(entryItem, entryQuestion, sounds) : [];
  }), [items, sounds]);
  const examRecordings = useMemo(() => recordingsOf(run.screens), [recordingsOf, run.screens]);
  const fixRecordings = useMemo(() => recordingsOf(run.fixScreens), [recordingsOf, run.fixScreens]);
  const recordings = isFix ? fixRecordings : examRecordings;
  const testFiles = useMemo(() => [...new Set(examRecordings.flat())], [examRecordings]);
  const download = useTestAudioDownload(testFiles);
  const downloading = !isFix && !download.ready && (examRecordings[run.screenIndex]?.length ?? 0) > 0;
  const audioReady = useTestAudioPreparation(recordings, isFix ? run.fixIndex : run.screenIndex, `${isFix ? 'fix' : 'test'}:${isFix ? run.fixIndex : run.screenIndex}`);
  useEffect(() => { scrollerRef.current?.scrollTo({ top: 0 }); }, [screenKey]);
  // The Fix round's bar grows with its explanation. The question keeps clear of it (--cover), and once
  // checked it scrolls up with the bar, so the checked answers stay in view right above it.
  const checkedRef = useRef(false);
  checkedRef.current = isFix && run.checked;
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

  if (run.stage === 'results' && run.result) {
    return (
      <TestResults
        lessonId={lesson.lessonId}
        score={run.result.score}
        seconds={run.result.seconds}
        passed={run.result.passed}
        onFix={run.startFix}
        onLater={onClose}
      />
    );
  }
  if (run.stage === 'done') {
    return <TestDone lessonId={lesson.lessonId} passed={Boolean(run.result?.passed)} rescheduled={Boolean(run.result?.rescheduled)} onClose={onClose} />;
  }

  const shownIndex = isFix ? run.fixIndex : numbers[run.screenIndex] ?? 0;
  const shownTotal = isFix ? run.fixScreens.length : total;
  const done = isFix ? run.fixIndex + (run.checked ? 1 : 0) : run.stage === 'intro' ? shownIndex : shownIndex + (screen?.questionIds.length ?? 1) * (ready ? 1 : 0);
  const header = (
    <ScreenHeader
      variant="window"
      tone="practice"
      onClose={onClose}
      progress={shownTotal ? (done / shownTotal) * 100 : 0}
      currentIndex={shownIndex}
      totalCount={shownTotal}
      rightAction={null}
    />
  );

  if (!screen || !item || !plannedItem) return null;

  const intro = run.stage === 'intro';
  const fixQuestions = item.questions.filter((question) => screen.questionIds.includes(question.id));
  const correct = fixQuestions.every((question) => run.fixAnswers[question.id] === question.key);
  const last = run.screenIndex + 1 >= run.screens.length;
  const barShown = isFix && (run.checked || ready);

  return (
    <TestWords value={lesson.allowWords ?? NO_WORDS}>
      {/* One header for the part intros and the questions, so the progress bar never rebuilds (and refills) between them. */}
      <div ref={scrollerRef} className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain custom-scrollbar">
        {header}
        {/* The part intro covers the download; "Getting audio ready" shows only if it outlasts the intro. */}
        {intro ? null : downloading ? (
          (download.slow || download.error) && (
            <AudioPreparation progress={download.progress} error={download.error} onRetry={download.retry} onBack={onClose} />
          )
        ) : (
        /* Each screen rises in at the same place under the header, so the title never jumps; the last one leaves at once, so its keys and audio never outlive it. */
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
            checked={isFix && run.checked}
            mode={isFix ? 'replay' : 'exam'}
            sounds={sounds}
            audioReady={audioReady}
            script={script}
            firstNumber={(numbers[run.screens.findIndex((entry) => entry.itemId === screen.itemId)] ?? 0) + 1}
            onAnswer={isFix ? run.answerFix : run.answer}
          />
        </motion.div>
        )}
      </div>
      {downloading || intro ? null : isFix ? (
        <FeedbackBottomBar
          status={run.checked ? (correct ? 'correct' : 'wrong') : 'idle'}
          detail={run.checked ? <AnswerDetail item={item} questions={fixQuestions} script={script} /> : undefined}
          onCheck={run.check}
          isCheckDisabled={!ready}
          onContinue={run.continueFix}
          layout="wide"
          barRef={barRef}
        />
      ) : ready && (
        <TestDock key={screenKey} label={last ? 'Finish' : 'Next'} onPress={run.next} riseKey={screenKey} />
      )}
      {/* Each part opens with its intro (the rocket flies through); it leaves as the part's first question rises in. */}
      <AnimatePresence>
        {intro && (
          <PartIntro
            key={screen.part}
            part={screen.part}
            lessonId={lesson.lessonId}
            holding={downloading && !download.error}
            onDone={() => run.setStage('question')}
          />
        )}
      </AnimatePresence>
    </TestWords>
  );
}
