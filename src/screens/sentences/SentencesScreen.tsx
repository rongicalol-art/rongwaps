import { useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, EmptyState, PlayfulNavIcon } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { getDeckIdentityKey } from '../../utils/lesson/lessonPartSelection';
import { useLessonSentences } from './hooks/useLessonSentences';
import { useSentenceSession } from './hooks/useSentenceSession';
import { SentenceFeed } from './components/SentenceFeed';
import { SentenceDock } from './components/SentenceDock';

interface SentencesScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
}

/** Read the part's sentences one card at a time: tap to hear and see the answer, Flow to play them all. */
export function SentencesScreen({
  activeBookId,
  selectedLessons = [],
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
}: SentencesScreenProps) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const sessionKey = `${getDeckIdentityKey({
    activeBookId, selectedLessons, selectedLessonParts, libraryActiveFolder, isReviewDeck, isLibraryDeck,
  })}:sentences`;
  const { sentences, highlightTerms, isLoading, loadError } = useLessonSentences(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const session = useSentenceSession(sentences, sessionKey);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  usePracticeHeaderRegistration({
    currentIndex: session.progressInfo.displayIndex,
    totalCount: session.progressInfo.totalCount,
    showLightbulb: false,
    minimal: session.completed,
    onShuffleClick: session.toggleShuffle,
    isShuffled: session.isShuffled,
  });

  if (isLoading) return null;
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) ?? SAMPLE_BOOKS[0];

  if (loadError || sentences.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        <EmptyState
          icon={<PlayfulNavIcon name="reading" className="h-12 w-12" />}
          iconBg={loadError ? 'bg-feedback-danger-surface' : 'bg-ui-surface'}
          iconColor={loadError ? 'text-feedback-danger' : activeBook.accent}
          title={loadError ? 'Something went wrong' : 'No sentences here yet'}
          description={loadError
            ? "We couldn't load these sentences. Please try again."
            : "This part's sentences haven't been added yet. Try another part."}
          action={(
            <ActionButton variant="primary" size="lg" onClick={onClose} className="uppercase tracking-wider">
              Go back
            </ActionButton>
          )}
        />
      </div>
    );
  }

  if (session.completed) {
    return (
      <LessonComplete
        learnedCount={session.deck.length - session.hardCount}
        unlearnedCount={session.hardCount}
        onReviewUnlearned={session.reviewHard}
        onContinue={onClose}
        continueLabel="Done"
        onResetAll={session.resetAll}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-content flex flex-col overflow-hidden pt-[72px] font-sans text-ui-ink">
      <div className="min-h-0 flex-1">
        <SentenceFeed
          session={session}
          highlightTerms={highlightTerms}
          onOpenCharacter={(char) => { session.pauseFlow(); setBreakdown(char); }}
          isOverlayOpen={Boolean(breakdown)}
        />
      </div>
      <SentenceDock session={session} />
      <CharacterBreakdownOverlay activeBreakdown={breakdown} onClose={() => setBreakdown(null)} activeBook={activeBook} />
    </div>
  );
}
