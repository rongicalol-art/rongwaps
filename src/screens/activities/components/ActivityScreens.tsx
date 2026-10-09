import React from 'react';
import { AnimatePresence } from 'motion/react';
import { AnimatedActivityScreen } from './AnimatedActivityScreen';
import { AddCardScreen } from '../../add-card';
import type { ActivityType } from '../../../types/models';
import { getPracticeScreen } from '../practiceScreens';

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
  onStartQuiz: () => void;
  /** Shrinks the screens so they clear a vertical practice dock. */
  edgeInsetClassName?: string;
}

/**
 * The practice screens, swapped by activity with slide transitions. The modal only mounts this
 * once every screen it needs is loaded (`usePracticeScreenReady`), so nothing here suspends.
 * `initial={false}`: the first screen is part of the window's open motion, not its own.
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
  edgeInsetClassName,
}: ActivityScreensProps) {
  const FlashcardScreen = getPracticeScreen('flashcards');
  const ListeningScreen = getPracticeScreen('listening');
  const QuizScreen = getPracticeScreen('quiz');
  const WritingScreen = getPracticeScreen('writing');

  return (
    <AnimatePresence custom={direction} mode="popLayout" initial={false}>
      {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && FlashcardScreen && (
        <AnimatedActivityScreen activityKey="flashcards" direction={direction} className={edgeInsetClassName}>
          <FlashcardScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
            isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
            onClose={onClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
            onStartQuiz={onStartQuiz}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'listening' && ListeningScreen && (
        <AnimatedActivityScreen activityKey="listening" direction={direction} className={edgeInsetClassName}>
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
        <AnimatedActivityScreen activityKey="quiz" direction={direction} className={edgeInsetClassName}>
          <QuizScreen
            activeBookId={activeBookId}
            selectedLessons={selectedLessons}
            isReviewDeck={isReviewMode}
            isLibraryDeck={isLibraryMode}
            mode={activeQuizMode ?? 'choices'}
            onClose={onClose}
            onContinue={onContinue}
            continueLabel={continueLabel}
          />
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'writing' && WritingScreen && (
        <AnimatedActivityScreen activityKey="writing" direction={direction}>
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

      {activeActivity === 'create-card' && (
        <AnimatedActivityScreen activityKey="create-card" direction={direction} useSlide={false}>
          <AddCardScreen onClose={onCreateCardClose} />
        </AnimatedActivityScreen>
      )}
    </AnimatePresence>
  );
}
