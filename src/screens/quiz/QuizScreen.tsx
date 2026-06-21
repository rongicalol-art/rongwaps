import { motion, AnimatePresence } from 'motion/react';
import { useQuizLoader } from './hooks/useQuiz';
import { ScreenSkeleton } from '../../lib/widgets';
import { QuizChoices } from './QuizChoices';
import { useAppStore } from '../../store/useAppStore';

interface QuizScreenProps {
  activeBookId: number;
  selectedLessons: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose?: () => void;
}

export function QuizScreen({ activeBookId, selectedLessons, isLibraryDeck = false, isReviewDeck = false, onClose }: QuizScreenProps) {
  const { cards, isLoading } = useQuizLoader(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);
  const libraryActiveFolder = useAppStore(state => state.libraryActiveFolder);

  const choicesSessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : `shared_deck_${activeBookId}_${selectedLessons?.slice().sort().join(',') || 'all'}`;

  if (isLoading) {
    return <ScreenSkeleton type="quiz" />;
  }

  return (
    <div className="absolute inset-0 z-[100] bg-[#F7F7F7] w-full flex flex-col overflow-hidden">
      <div className="flex-1 w-full mx-auto relative px-0 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div 
            key="choices"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-[100] flex flex-col bg-[#F7F7F7] overflow-hidden"
          >
            <QuizChoices 
              activeBookId={activeBookId}
              cards={cards} 
              sessionKey={choicesSessionKey}
              onEnd={onClose || (() => {})} 
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
