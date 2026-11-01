import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FeedbackBottomBar } from '../../features/practice';
import { ScreenHeader } from '../../lib/widgets';
import { useReviewTone } from '../../hooks/useReviewTone';
import { useAppStore } from '../../store/useAppStore';
import type { LessonTestLesson, LessonTestSounds } from '../../types/lessonTest';
import { lessonItemIndex, type LessonTestScreen as TestScreen } from '../../utils/lesson/lessonTestPlan';
import { AnswerDetail } from './components/AnswerDetail';
import { QuestionBody } from './components/QuestionBody';
import { SectionIntro } from './components/SectionIntro';
import { TestDock } from './components/TestDock';
import { TestDone, TestResults } from './components/TestResults';
import { useLessonTestRun } from './hooks/useLessonTestRun';
import { itemPictureUrls } from './testPictures';

interface LessonTestScreenProps {
  lesson: LessonTestLesson;
  sounds: LessonTestSounds;
  onClose: () => void;
}

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
  useEffect(() => { scrollerRef.current?.scrollTo({ top: 0 }); }, [screenKey]);

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

  if (run.stage === 'intro' && run.screen) {
    return (
      <>
        {header}
        <SectionIntro part={run.screen.part} script={script} onStart={() => run.setStage('question')} />
      </>
    );
  }
  if (!screen || !item || !plannedItem) return null;

  const fixQuestions = item.questions.filter((question) => screen.questionIds.includes(question.id));
  const correct = fixQuestions.every((question) => run.fixAnswers[question.id] === question.key);
  const last = run.screenIndex + 1 >= run.screens.length;

  return (
    <>
      <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overscroll-contain custom-scrollbar">
        {header}
        {/* Each screen rises in; the last one leaves at once, so its keys and audio never outlive it. */}
        <motion.div
          key={screenKey}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
          className={`px-4 pt-2 sm:px-6 md:pt-6 ${isFix && run.checked ? 'pb-80 lg:pb-56' : 'pb-40'}`}
        >
          <QuestionBody
            item={item}
            questionIds={screen.questionIds}
            planned={plannedItem}
            answers={answers}
            checked={isFix && run.checked}
            mode={isFix ? 'replay' : 'exam'}
            sounds={sounds}
            script={script}
            firstNumber={(numbers[run.screens.findIndex((entry) => entry.itemId === screen.itemId)] ?? 0) + 1}
            onAnswer={isFix ? run.answerFix : run.answer}
          />
        </motion.div>
      </div>
      {isFix ? (
        <FeedbackBottomBar
          status={run.checked ? (correct ? 'correct' : 'wrong') : 'idle'}
          detail={run.checked ? <AnswerDetail item={item} questions={fixQuestions} script={script} /> : undefined}
          onCheck={run.check}
          isCheckDisabled={!ready}
          onContinue={run.continueFix}
        />
      ) : ready && (
        <TestDock key={screenKey} label={last ? 'Finish' : 'Next'} onPress={run.next} riseKey={screenKey} />
      )}
    </>
  );
}
