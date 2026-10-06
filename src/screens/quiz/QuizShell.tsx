import React, { Fragment, useMemo, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import type { Flashcard } from '../../data/flashcards';
import { FeedbackBottomBar, LessonComplete, PracticeFormatMenu } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { MemoryHookCharacter } from '../../features/character-memory-hooks';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { useAppStore } from '../../store/useAppStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { isHanziChar } from '../../utils/hanzi';
import type { useQuizChoices } from './hooks/useQuiz';

export interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  activeBookId: number;
  sessionKey: string;
}

type QuizSession = Pick<
  ReturnType<typeof useQuizChoices>,
  | 'activeCards' | 'currentIndex' | 'currentCard' | 'completed' | 'handleCheck' | 'retryAnswer'
  | 'resetAll' | 'reviewUnlearned' | 'unlearnedCount' | 'learnedCount' | 'isShuffled' | 'toggleShuffle' | 'progressInfo'
>;

const getFrontFontSize = (len: number) => {
  if (len === 1) return 'text-[90px] sm:text-[120px]';
  if (len === 2) return 'text-[70px] sm:text-[96px]';
  if (len === 3) return 'text-[54px] sm:text-[72px]';
  if (len === 4) return 'text-[44px] sm:text-[60px]';
  if (len <= 6) return 'text-[36px] sm:text-[48px]';
  return 'text-[28px] sm:text-[36px]';
};

/** The card front as tappable hanzi that open the character breakdown. */
export const QuizHanziPrompt: React.FC<{ front: string; onOpenBreakdown: (index: number) => void; className: string }> = ({
  front, onOpenBreakdown, className,
}) => {
  const size = getFrontFontSize(front.length || 1);
  return (
    <div className={`flex w-full flex-wrap items-center justify-center gap-x-1 px-4 ${className}`}>
      {Array.from(front).map((char, i) =>
        isHanziChar(char) ? (
          <MemoryHookCharacter
            key={i}
            char={char}
            label={`Open character breakdown for ${char}`}
            onOpen={() => onOpenBreakdown(i)}
            glyphClassName={`${size} leading-tight text-ui-ink text-center`}
            className="px-1.5 py-1"
          />
        ) : (
          <span key={i} className={`${size} font-chinese leading-tight text-ui-ink`}>
            {char}
          </span>
        ),
      )}
    </div>
  );
};

interface QuizShellProps extends Omit<QuizModeProps, 'cards'> {
  session: QuizSession;
  mode: 'quiz-choices' | 'quiz-typing';
  title: string;
  /** Wider column and larger title (choice list). */
  wide?: boolean;
  status: 'idle' | 'correct' | 'wrong';
  correctAnswer: string;
  pinyin?: string;
  isCheckDisabled: boolean;
  children: (ctx: { openBreakdown: (index: number) => void; breakdownOpen: boolean }) => React.ReactNode;
}

/** Shared quiz chrome: header registration, completion, title, feedback bar and breakdown overlay. */
export const QuizShell: React.FC<QuizShellProps> = ({
  session, mode, title, wide, status, correctAnswer, pinyin, isCheckDisabled, children,
  activeBookId, sessionKey, onEnd, onContinue, continueLabel,
}) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);
  const {
    activeCards, currentIndex, currentCard, completed, handleCheck, retryAnswer, resetAll,
    reviewUnlearned, unlearnedCount, learnedCount, isShuffled, toggleShuffle, progressInfo,
  } = session;
  const autoAdvanceCorrect = useAppStore((state) => state.autoAdvanceCorrect);
  const autoAdvance = status === 'correct' && autoAdvanceCorrect;

  usePracticeAnswerAutomation({
    status,
    onAdvance: handleCheck,
    advanceWrong: false,
    blocked: Boolean(activeBreakdown),
  });
  const isNonCurriculum = sessionKey.includes('review') || sessionKey.includes('library');
  const partSegments = useMemo(
    () => (isNonCurriculum ? [] : buildPracticePartSegments(activeCards)),
    [activeCards, isNonCurriculum],
  );
  usePracticeHeaderRegistration({
    currentIndex: progressInfo.displayIndex,
    totalCount: progressInfo.totalCount,
    showLightbulb: false,
    partSegments,
    isRetry: progressInfo.isRetry,
    cleanupPhase: progressInfo.cleanupPhase,
    onShuffleClick: toggleShuffle,
    onRestartClick: resetAll,
    isShuffled,
  });

  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const openBreakdown = (index: number) => {
    setBreakdownIndex(index);
    setActiveBreakdown(currentCard.front);
  };

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onContinue ?? onEnd}
        continueLabel={onContinue ? continueLabel : undefined}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard) return null;

  return (
    <div className="relative flex-1 flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      <div className={`flex-1 flex flex-col ${wide ? 'max-w-xl' : 'max-w-lg'} mx-auto w-full px-4 sm:px-6 pb-[240px] overscroll-none overflow-y-auto`}>
        <div className="mt-4 flex w-full items-center gap-2.5 px-2">
          <PracticeFormatMenu mode={mode} />
          <h2 className={`text-xl font-extrabold text-ui-ink ${wide ? 'sm:text-[26px]' : 'sm:text-2xl'}`}>{title}</h2>
        </div>

        <Fragment key={`${currentIndex}:${currentCard.id}`}>
          {children({ openBreakdown, breakdownOpen: Boolean(activeBreakdown) })}
        </Fragment>
      </div>

      <FeedbackBottomBar
        status={status}
        correctAnswer={correctAnswer}
        pinyin={pinyin}
        onContinue={status === 'correct' ? () => handleCheck() : retryAnswer}
        showCheck={false}
        isCheckDisabled={isCheckDisabled}
        hideWhenAutoAdvance={autoAdvance}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={() => openBreakdown(0)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={breakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </div>
  );
};
