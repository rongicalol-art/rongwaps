import { useMemo, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, EmptyState, PlayfulNavIcon, ScreenLayout } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { buildPracticePartSegments } from '../../utils/lesson/practicePartSegments';
import { useTones } from './hooks/useTones';
import { ToneStrip } from './components/ToneStrip';

interface ToneScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

/** Tone Painter: hear a word, draw each character's tone on the melody strip. */
export function ToneScreen({
  activeBookId,
  selectedLessons = [],
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
  onContinue,
  continueLabel,
}: ToneScreenProps) {
  const tones = useTones(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);
  const { isLoading, loadError, playlist, currentCard, currentIndex, targets, status, completed, progressInfo } = tones;
  const showPinyin = useAppStore((state) => state.showPinyin);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  const partSegments = useMemo(
    () => (isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(playlist)),
    [isLibraryDeck, isReviewDeck, playlist],
  );
  usePracticeHeaderRegistration({
    currentIndex: progressInfo.displayIndex,
    totalCount: progressInfo.totalCount,
    showLightbulb: false,
    partSegments,
    isRetry: progressInfo.isRetry,
    cleanupPhase: progressInfo.cleanupPhase,
    onShuffleClick: tones.toggleShuffle,
    onRestartClick: tones.restartRound,
    isShuffled: tones.isShuffled,
  });

  if (isLoading) return null;
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) ?? SAMPLE_BOOKS[0];

  if (loadError || playlist.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        <EmptyState
          icon={<PlayfulNavIcon name="tones" className="h-12 w-12" />}
          iconBg={loadError ? 'bg-feedback-danger-surface' : 'bg-ui-surface'}
          iconColor={loadError ? 'text-feedback-danger' : activeBook.accent}
          title={loadError ? 'Something went wrong' : 'No words to draw yet'}
          description={loadError
            ? "We couldn't load these words. Please try again."
            : 'Tones work with words of one to four characters. Try another lesson or add cards to your library.'}
          action={(
            <ActionButton variant="primary" size="lg" onClick={onClose} className="uppercase tracking-wider">
              Go back
            </ActionButton>
          )}
        />
      </div>
    );
  }

  if (completed) {
    return (
      <LessonComplete
        accuracy={tones.accuracy}
        onContinue={onContinue ?? onClose}
        continueLabel={onContinue ? continueLabel : undefined}
        onResetAll={tones.restartRound}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-content flex flex-col overflow-hidden pt-[72px] font-sans text-ui-ink">
      <ScreenLayout maxWidth="xl" className="flex flex-1 flex-col items-center justify-center px-4 pb-[180px] md:pb-[160px]">
        <h2 className="mb-6 text-xl font-black text-ui-ink-strong md:mb-8 md:text-2xl">Draw the tones</h2>
        {currentCard && targets && (
          <ToneStrip
            key={`${currentIndex}:${currentCard.id}`}
            targets={targets}
            showPinyin={showPinyin}
            singKey={tones.singKey}
            onReplay={tones.playWord}
            onSyllable={tones.playSyllable}
            onDone={tones.finishWord}
            keyboardEnabled={!breakdown}
          />
        )}
      </ScreenLayout>

      <FeedbackBottomBar
        status={status}
        word={currentCard ? { hanzi: currentCard.front, pinyin: currentCard.pinyin, meaning: currentCard.back, simple: currentCard.simple } : undefined}
        onContinue={tones.next}
        showCheck={false}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(breakdown)}
        onBreakdown={currentCard ? () => setBreakdown(currentCard.front) : undefined}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={breakdown} onClose={() => setBreakdown(null)} activeBook={activeBook} />
    </div>
  );
}
