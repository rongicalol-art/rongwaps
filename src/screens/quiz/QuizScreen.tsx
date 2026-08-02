import { motion, AnimatePresence } from 'motion/react';
import { useQuizLoader } from './hooks/useQuiz';
import { ScreenSkeleton } from '../../lib/widgets';
import { QuizChoices } from './QuizChoices';
import { QuizTyping } from './QuizTyping';
import { useAppStore } from '../../store/useAppStore';
import { getCurriculumSessionKey } from '../../utils/lessonPartSelection';
import type { QuizMode } from '../../types/models';

interface QuizScreenProps {
  activeBookId: number;
  selectedLessons: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose?: () => void;
  mode?: QuizMode;
}

export function QuizScreen({
  activeBookId,
  selectedLessons,
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
  mode = 'choices',
}: QuizScreenProps) {
  const { cards, isLoading } = useQuizLoader(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);

  const sessionKey = isReviewDeck
    ? `shared_deck_review_${activeBookId}`
    : isLibraryDeck
      ? `shared_deck_library_${libraryActiveFolder}`
      : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);

  if (isLoading) {
    return <ScreenSkeleton type="quiz" />;
  }

  return (
    <div className="absolute inset-0 z-[100] bg-transparent w-full flex flex-col overflow-hidden">
      <div className="flex-1 w-full mx-auto relative px-0 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-[100] flex flex-col bg-transparent overflow-hidden"
          >
            {mode === 'choices' ? (
              <QuizChoices
                activeBookId={activeBookId}
                cards={cards}
                sessionKey={sessionKey}
                onEnd={onClose || (() => {})}
              />
            ) : (
              <QuizTyping
                activeBookId={activeBookId}
                cards={cards}
                sessionKey={`${sessionKey}:typing`}
                onEnd={onClose || (() => {})}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
