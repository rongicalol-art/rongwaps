import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { AnimatedActivityScreen } from './AnimatedActivityScreen';
import { AddCardScreen } from '../../add-card';
import type { ActivityType } from '../../../types/models';
import type { FlashcardViewMode } from '../../flashcard';

const FlashcardScreen = lazy(() => (
  import('../../flashcard').then((module) => ({ default: module.FlashcardScreen }))
));
const ListeningScreen = lazy(() => (
  import('../../listening').then((module) => ({ default: module.ListeningScreen }))
));
const QuizScreen = lazy(() => (
  import('../../quiz').then((module) => ({ default: module.QuizScreen }))
));
const WritingScreen = lazy(() => (
  import('../../writing').then((module) => ({ default: module.WritingScreen }))
));

type QuizScreenProps = React.ComponentProps<typeof QuizScreen>;

interface ActivityScreensProps {
  activeActivity: ActivityType;
  activeBookId: number;
  selectedLessons: number[];
  isReviewMode: boolean;
  isLibraryMode: boolean;
  activeQuizMode: QuizScreenProps['mode'] | null;
  flashcardMode: FlashcardViewMode;
  direction: number;
  onClose: () => void;
  onWritingClose: () => void;
  onCreateCardClose: () => void;
  onContinue?: () => void;
  continueLabel: string;
  onNavigateToPractice?: () => void;
  onScrollDockVisibility?: (visible: boolean) => void;
  /** Shrinks the screens so they clear a vertical practice dock. */
  edgeInsetClassName?: string;
}

/** The lazy-loaded practice screens, swapped by activity with slide transitions. */
export function ActivityScreens({
  activeActivity,
  activeBookId,
  selectedLessons,
  isReviewMode,
  isLibraryMode,
  activeQuizMode,
  flashcardMode,
  direction,
  onClose,
  onWritingClose,
  onCreateCardClose,
  onContinue,
  continueLabel,
  onNavigateToPractice,
  onScrollDockVisibility,
  edgeInsetClassName,
}: ActivityScreensProps) {
  return (
    <AnimatePresence custom={direction} mode="popLayout">
      {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && (
        <AnimatedActivityScreen activityKey="flashcards" direction={direction} className={edgeInsetClassName}>
          <Suspense fallback={null}>
            <FlashcardScreen
              activeBookId={activeBookId}
              selectedLessons={selectedLessons}
              isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
              isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
              mode={flashcardMode}
              onClose={onClose}
              onContinue={onContinue}
              continueLabel={continueLabel}
              onNavigateToPractice={onNavigateToPractice}
              onScrollDockVisibility={onScrollDockVisibility}
            />
          </Suspense>
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'listening' && (
        <AnimatedActivityScreen activityKey="listening" direction={direction} className={edgeInsetClassName}>
          <Suspense fallback={null}>
            <ListeningScreen
              activeBookId={activeBookId}
              selectedLessons={selectedLessons}
              isReviewDeck={isReviewMode}
              isLibraryDeck={isLibraryMode}
              onClose={onClose}
              onContinue={onContinue}
              continueLabel={continueLabel}
            />
          </Suspense>
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'quiz' && (
        <AnimatedActivityScreen activityKey="quiz" direction={direction} className={edgeInsetClassName}>
          <Suspense fallback={null}>
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
          </Suspense>
        </AnimatedActivityScreen>
      )}

      {activeActivity === 'writing' && (
        <AnimatedActivityScreen activityKey="writing" direction={direction}>
          <Suspense fallback={null}>
            <WritingScreen
              activeBookId={activeBookId}
              selectedLessons={selectedLessons}
              isReviewDeck={isReviewMode}
              isLibraryDeck={isLibraryMode}
              onClose={onWritingClose}
              onContinue={onContinue}
              continueLabel={continueLabel}
            />
          </Suspense>
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
