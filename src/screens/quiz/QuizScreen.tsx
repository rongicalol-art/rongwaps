import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useActivityDataLoader } from '../../hooks/useActivityDataLoader';
import { QuizChoices } from './QuizChoices';
import { cancelQuizLaunch } from './quizShuffle';
import { QuizMixed } from './QuizMixed';
import { QuizTyping } from './QuizTyping';
import { useAppStore } from '../../store/useAppStore';
import { getDeckIdentityKey } from '../../utils/lesson/lessonPartSelection';
import { quizSessionKey } from '../../utils/srs/resumeState';
import type { QuizMode } from '../../types/models';
import type { SessionStats } from '../../features/practice';
import type { QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { QuizTypePicker, type QuizPickerEntrance } from '../flashcard';

interface QuizScreenProps {
  activeBookId: number;
  selectedLessons: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  mode?: QuizMode;
  /** Picked on Cards done ([] = Mixed): the mixed quiz plans only these types. Null when opened another way. */
  quizTypes?: readonly QuizTypeId[] | null;
  /** The flashcard round this quiz follows; Session complete merges it with the quiz result. */
  sessionStats?: SessionStats | null;
}

export function QuizScreen({
  activeBookId,
  selectedLessons,
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
  onContinue,
  continueLabel,
  mode = 'choices',
  quizTypes = null,
  sessionStats = null,
}: QuizScreenProps) {
  const { cards, isLoading } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const launchCleanup = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(launchCleanup.current);
    return () => { launchCleanup.current = window.setTimeout(cancelQuizLaunch, 0); };
  }, []);
  const quizFormat = useAppStore((state) => state.quizFormat);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const reduceMotion = useReducedMotion();
  /** Picked on Cards done, or here: opened from the quiz button, the mixed quiz asks first. */
  const [picked, setPicked] = useState<readonly QuizTypeId[] | null>(quizTypes);
  // Opened from the dock: its quiz button grows into the Mixed card (read once, where the button is now).
  const [entrance] = useState<QuizPickerEntrance>(() => {
    if (reduceMotion) return { kind: 'none' };
    const r = document.querySelector('button[data-mode="quiz"]')?.getBoundingClientRect();
    return r && r.width > 0
      ? { kind: 'morph', look: 'dock', from: { left: r.left, top: r.top, width: r.width, height: r.height } }
      : { kind: 'rise' };
  });

  const sessionKey = getDeckIdentityKey({
    activeBookId,
    selectedLessons,
    selectedLessonParts,
    libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck,
  });
  // The quiz never shares the flashcards' saved place: its own key, and each pick keeps its own progress.
  const quizKey = quizSessionKey(sessionKey);
  const mixedKey = picked?.length ? `${sessionKey}|types:${picked.join('+')}` : quizKey;
  const mixed = mode === 'choices' && quizFormat === 'mixed';


  if (isLoading) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-content bg-transparent w-full flex flex-col overflow-hidden">
      <div className="flex-1 w-full mx-auto relative px-0 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-content flex flex-col bg-transparent overflow-hidden"
          >
            {mode === 'choices' && picked ? (
              <QuizMixed
                activeBookId={activeBookId}
                cards={cards}
                sessionKey={mixedKey}
                types={picked}
                sessionStats={sessionStats}
                onEnd={onClose || (() => {})}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            ) : mixed ? (
              <div className="absolute inset-0 pt-[72px]">
                <div className="relative h-full">
                  <QuizTypePicker
                    entrance={entrance}
                    deck={cards}
                    onStart={setPicked}
                  />
                </div>
              </div>
            ) : mode === 'choices' ? (
              <QuizChoices
                activeBookId={activeBookId}
                cards={cards}
                sessionKey={quizKey}
                sessionStats={sessionStats}
                onEnd={onClose || (() => {})}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            ) : (
              <QuizTyping
                activeBookId={activeBookId}
                cards={cards}
                sessionKey={`${sessionKey}:typing`}
                sessionStats={sessionStats}
                onEnd={onClose || (() => {})}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
