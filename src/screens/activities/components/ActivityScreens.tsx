import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AnimatedActivityScreen } from './AnimatedActivityScreen';
import { AddCardScreen } from '../../add-card';
import type { ActivityType } from '../../../types/models';
import { getPracticeScreen } from '../practiceScreens';
import { useAppStore } from '../../../store/useAppStore';
import type { QuizTypeId } from '../../../utils/vocabulary/quizDirector';
import type { SessionStats } from '../../../features/practice';
import type { Flashcard } from '../../../data/flashcards';

/** The AnimatedActivityScreen key an activity renders under. */
function activityScreenKey(activity: ActivityType): string | null {
  if (activity === 'flashcards-library' || activity === 'flashcards-review') return 'flashcards';
  return activity;
}

type QuizScreenProps = React.ComponentProps<NonNullable<ReturnType<typeof getPracticeScreen<'quiz'>>>>;

interface ActivityScreensProps {
  activeActivity: ActivityType;
  activeBookId: number;
  selectedLessons: number[];
  isReviewMode: boolean;
  isLibraryMode: boolean;
  activeQuizMode: QuizScreenProps['mode'] | null;
  direction: number;
  onClose: () => void;
  onWritingClose: () => void;
  onCreateCardClose: () => void;
  onContinue?: () => void;
  continueLabel: string;
  onStartQuiz: (types: QuizTypeId[], stats: SessionStats) => void;
  /** Cards done shows this word first in its sheet. */
  quizFirstId?: string;
  /** The lesson's full deck (the same one the quiz loads): Cards done's words when the first pass isn't in memory. */
  sessionDeck?: Flashcard[];
  /** Set when the quiz was opened from Cards done ([] = Mixed): the screen swap is instant and the quiz plans only these types. */
  quizTypes?: QuizTypeId[] | null;
  /** The flashcard round before the quiz; Session complete reports the whole session. */
  sessionStats?: SessionStats | null;
  /** Shrinks the screens so they clear a vertical practice dock. */
  edgeInsetClassName?: string;
}

/**
 * The practice screens, swapped by activity with slide transitions. The modal only mounts this
 * once every screen it needs is loaded (`usePracticeScreenReady`), so nothing here suspends.
 * The first screen skips its entrance (it is part of the window's open motion). This is per screen,
 * not `AnimatePresence initial={false}`, which would also silence every motion inside the screens.
 */
export function ActivityScreens({
  activeActivity,
  activeBookId,
  selectedLessons,
  isReviewMode,
  isLibraryMode,
  activeQuizMode,
  direction,
  onClose,
  onWritingClose,
  onCreateCardClose,
  onContinue,
  continueLabel,
  onStartQuiz,
  quizFirstId,
  sessionDeck,
  quizTypes = null,
  sessionStats = null,
  edgeInsetClassName,
}: ActivityScreensProps) {
  const FlashcardScreen = getPracticeScreen('flashcards');
  const ListeningScreen = getPracticeScreen('listening');
  const QuizScreen = getPracticeScreen('quiz');
  const WritingScreen = getPracticeScreen('writing');
  const ToneScreen = getPracticeScreen('tones');
  // The activity the session opened with skips its entrance; once the user switches away it is
  // forgotten, so coming back slides in like any other switch.
  const currentKey = activityScreenKey(activeActivity);
  const [firstKey, setFirstKey] = useState(currentKey);
  if (firstKey !== null && currentKey !== firstKey) setFirstKey(null);

  // The quiz picker brings its own entrance (from Cards done, or the dock's quiz button growing into it).
  const quizFormat = useAppStore((state) => state.quizFormat);
  const picksQuiz = Boolean(quizTypes) || (quizFormat === 'mixed' && (activeQuizMode ?? 'choices') === 'choices');
  const instant = picksQuiz && activeActivity === 'quiz';

  return (
    <AnimatePresence custom={instant ? 'instant' : direction} mode="popLayout">
      {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && FlashcardScreen && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="flashcards" direction={direction} className={edgeInsetClassName}>
          <FlashcardScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
            isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
            onClose={onClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
            onStartQuiz={onStartQuiz}
            quizFirstId={quizFirstId}
            sessionDeck={sessionDeck}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'listening' && ListeningScreen && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="listening" direction={direction} className={edgeInsetClassName}>
          <ListeningScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode}
            isLibraryDeck={isLibraryMode}
            onClose={onClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'quiz' && QuizScreen && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="quiz" direction={direction} instant={instant} className={edgeInsetClassName}>
          <QuizScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode}
            isLibraryDeck={isLibraryMode}
            mode={activeQuizMode ?? 'choices'}
            quizTypes={quizTypes}
            sessionStats={sessionStats}
            onClose={onClose}
            onContinue={onClose}
            continueLabel={continueLabel}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'writing' && WritingScreen && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="writing" direction={direction}>
          <WritingScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode}
            isLibraryDeck={isLibraryMode}
            onClose={onWritingClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'tones' && ToneScreen && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="tones" direction={direction} className={edgeInsetClassName}>
          <ToneScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode}
            isLibraryDeck={isLibraryMode}
            onClose={onClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'create-card' && (
        <AnimatedActivityScreen skipEnter={firstKey} activityKey="create-card" direction={direction} useSlide={false}>
          <AddCardScreen onClose={onCreateCardClose} />
        </AnimatedActivityScreen>
      )}
    </AnimatePresence>
  );
}
