import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import type { Flashcard } from '../../data/flashcards';
import { useRaceQuiz } from '../../features/social';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';

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
  /** The review deck snapshot stays available after the daily review is marked complete. */
  sessionDeck?: Flashcard[];
}

/** The picker is not a round yet: the header keeps only its close button instead of the flashcards' leftover count. */
function PickerHeader() {
  usePracticeHeaderRegistration({ currentIndex: 0, totalCount: 0, showLightbulb: false, minimal: true });
  return null;
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
  sessionDeck,
}: QuizScreenProps) {
  const race = useRaceQuiz();
  const raceSelection = race?.selection;
  const raceParts = useMemo(() => raceSelection ? Object.fromEntries(Object.entries(raceSelection.lessons).map(([lesson, parts]) => [`1:${lesson}`, parts])) : undefined, [raceSelection]);
  const { cards: loadedCards, deckCards, isLoading } = useActivityDataLoader(activeBookId, selectedLessons, !race && isReviewDeck, !race && isLibraryDeck, true, raceParts);
  const cards = race ? deckCards : isReviewDeck && sessionDeck?.length ? sessionDeck : loadedCards;
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const launchCleanup = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(launchCleanup.current);
    return () => { launchCleanup.current = window.setTimeout(cancelQuizLaunch, 0); };
  }, []);
  const quizFormat = useAppStore((state) => state.quizFormat);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  /** Picked on Cards done, or here: opened from the quiz button, the mixed quiz asks first. */
  const [chosen, setPicked] = useState<readonly QuizTypeId[] | null>(quizTypes);
  // A quiz race skips the picker: the room chose the types, and every player shares its seed.
  const picked = race ? race.types : chosen;
  // The picker appears plainly: no morph out of the dock button, no sliding tiles.
  const entrance: QuizPickerEntrance = { kind: 'none' };

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
  const mixedKey = race ? race.sessionKey : picked?.length ? `${sessionKey}|types:${picked.join('+')}` : quizKey;
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
                seed={race?.seed}
                sessionStats={sessionStats}
                onEnd={onClose || (() => {})}
                onContinue={onContinue}
                continueLabel={continueLabel}
              />
            ) : mixed ? (
              <div className="absolute inset-0 pt-12">
                <div className="relative h-full">
                  <PickerHeader />
                  <QuizTypePicker
                    entrance={entrance}
                    deck={cards}
                    summary={selectedLessons.length > 1 ? `${selectedLessons.length} lessons · ${cards.length} words` : undefined}
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
