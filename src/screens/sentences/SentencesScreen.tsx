import { SAMPLE_BOOKS } from '../../data/books';
import { ActionButton, EmptyState, PlayfulNavIcon } from '../../lib/widgets';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { useLessonSentences } from './hooks/useLessonSentences';
import { SentenceList } from './components/SentenceList';

interface SentencesScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
}

/** Read the part's sentences: hanzi first, pinyin and English on demand, the book's recordings. */
export function SentencesScreen({
  activeBookId,
  selectedLessons = [],
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
}: SentencesScreenProps) {
  const { sentences, highlightTerms, isLoading, loadError } = useLessonSentences(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  usePracticeHeaderRegistration({ currentIndex: 0, totalCount: 0, showLightbulb: false, minimal: true });

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

  return (
    <div className="absolute inset-0 z-content flex flex-col overflow-hidden pt-[72px] font-sans text-ui-ink">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <SentenceList sentences={sentences} highlightTerms={highlightTerms} />
      </div>
    </div>
  );
}
