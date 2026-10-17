import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { audioService } from '../../services/audioService';
import type { Flashcard } from '../../data/flashcards';
import { FeedbackBottomBar, PracticeFormatMenu, SessionComplete, type SessionStats } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { MemoryHookCharacter } from '../../features/character-memory-hooks';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { useReviewTone } from '../../hooks/useReviewTone';
import { useAppStore } from '../../store/useAppStore';
import { buildPracticePartSegments } from '../../utils/lesson/practicePartSegments';
import { isHanziChar } from '../../utils/characters/hanzi';
import { ReviewDealIntro } from '../flashcard';
import { fadeOutGhost, landQuizLaunch, riseIn, type QuizHandoff } from './quizShuffle';

export interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  activeBookId: number;
  sessionKey: string;
  /** The flashcard round before this quiz (Cards done → quiz): Session complete reports the whole session. */
  sessionStats?: SessionStats | null;
}

/** What the shell needs from a quiz mode's session (choices and mixed both provide it). */
interface QuizSession {
  activeCards: Flashcard[];
  currentIndex: number;
  /** Words already done inside the current question (matched pairs): the progress bar moves with each one. */
  inBeatDone?: number;
  currentCard: Flashcard;
  completed: boolean;
  handleCheck: () => void;
  answerAudioPlaying?: boolean;
  resumedReview: boolean;
  resetAll: () => void;
  reviewUnlearned: () => void;
  practiceCards: (cards: Flashcard[]) => void;
  missedCards: Flashcard[];
  unlearnedCount: number;
  learnedCount: number;
  isShuffled: boolean;
  toggleShuffle: () => void;
}

const getFrontFontSize = (len: number) => {
  if (len === 1) return 'text-7xl sm:text-8xl';
  if (len === 2) return 'text-6xl sm:text-7xl';
  if (len === 3) return 'text-5xl sm:text-6xl';
  if (len === 4) return 'text-4xl sm:text-5xl';
  if (len <= 6) return 'text-3xl sm:text-4xl';
  return 'text-2xl sm:text-3xl';
};

/** The card front as tappable hanzi that open the character breakdown. */
export const QuizHanziPrompt: React.FC<{ front: string; onOpenBreakdown: (index: number) => void; className: string }> = ({
  front, onOpenBreakdown, className,
}) => {
  const size = getFrontFontSize(front.length || 1);
  return (
    <div data-quiz-word className={`flex w-full flex-wrap items-center justify-center gap-x-1 px-4 ${className}`}>
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
  /** Hold the current question while its recordings prepare; keep review chrome mounted. */
  preparation?: React.ReactNode;
  status: 'idle' | 'correct' | 'wrong';
  correctAnswer: string;
  pinyin?: string;
  /** The answered word shown with feedback so its replay stays visually attached to it. */
  word?: { hanzi: string; pinyin?: string; meaning: string; simple?: string };
  isCheckDisabled: boolean;
  /** The question needs an explicit Check (build the word): the bar shows it once `isCheckDisabled` clears. */
  onCheck?: () => void;
  /** Title row rises in (first question after the Cards done shuffle). */
  rise?: boolean;
  /** No character breakdown in the feedback bar (a match round covers several words). */
  hideBreakdown?: boolean;
  /** Whether the current question is a tap-to-pair exercise. */
  isMatchPair?: boolean;
  /** Keep the feedback bar up (no auto-advance) while a follow-up is open. */
  holdAutoAdvance?: boolean;
  /** The mode lands the review intro's ghost card on its prompt (choices); otherwise the ghost just fades. */
  landsReviewGhost?: boolean;
  children: (ctx: {
    openBreakdown: (index: number) => void;
    breakdownOpen: boolean;
    /** In a review pass: the intro's ghost card, only for the pass's first question (null otherwise). */
    reviewHandoff: QuizHandoff | null;
    /** True from the first review pass on (the first-pass handoff no longer applies). */
    isReviewPass: boolean;
  }) => React.ReactNode;
}

/** Shared quiz chrome: header registration, completion, title, feedback bar and breakdown overlay. */
export const QuizShell: React.FC<QuizShellProps> = ({
  session, mode, title, wide, preparation, status, correctAnswer, pinyin, word, isCheckDisabled, onCheck, rise, hideBreakdown, isMatchPair = false, holdAutoAdvance, landsReviewGhost, children,
  activeBookId, sessionKey, onEnd, onContinue, sessionStats,
}) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);
  const {
    activeCards, currentIndex, currentCard, completed, handleCheck, resumedReview, resetAll, reviewUnlearned, practiceCards, missedCards,
    unlearnedCount, learnedCount, isShuffled, toggleShuffle, answerAudioPlaying = false,
  } = session;
  const autoAdvanceCorrect = useAppStore((state) => state.autoAdvanceCorrect);
  const quizFormat = useAppStore((state) => state.quizFormat);
  const advance = useCallback(() => {
    if (preparation) return;
    // An explicit Continue interrupts audio, including a recording still loading.
    audioService.stop();
    handleCheck();
  }, [handleCheck, preparation]);

  const autoAdvance = !preparation && status === 'correct' && autoAdvanceCorrect && !holdAutoAdvance && !answerAudioPlaying;

  usePracticeAnswerAutomation({
    status,
    onAdvance: advance,
    advanceWrong: false,
    blocked: Boolean(preparation) || Boolean(activeBreakdown) || Boolean(holdAutoAdvance) || answerAudioPlaying,
  });
  const isNonCurriculum = sessionKey.includes('review') || sessionKey.includes('library');
  const partSegments = useMemo(
    () => (isNonCurriculum ? [] : buildPracticePartSegments(activeCards)),
    [activeCards, isNonCurriculum],
  );

  // Missed words come back together as a review round after the pass (the intro between), until a pass has no misses.
  const [reviewPass, setReviewPass] = useState(0);
  const [introActive, setIntroActive] = useState(false);
  const [dealStarted, setDealStarted] = useState(false);
  /** The first review pass's missed tiles are highlighted: the app turns honey from here. */
  const [introToned, setIntroToned] = useState(false);
  /** Size of the pass that just ended: the header shows that finished pass during the intro. */
  const [finishedPass, setFinishedPass] = useState<Flashcard[]>([]);
  /** The intro handed over (ghost undefined with reduced motion): the review's first question enters. */
  const [entrance, setEntrance] = useState<{ ghost: QuizHandoff | null } | null>(null);
  const firstPassRef = useRef<{ total: number; correct: number; cards: Flashcard[]; missedCards: Flashcard[] } | null>(null);
  const isReviewPass = reviewPass > 0 || resumedReview;
  const isDone = completed && unlearnedCount === 0;

  useEffect(() => {
    if (resumedReview) setReviewPass((pass) => pass || 1);
  }, [resumedReview]);


  useLayoutEffect(() => {
    if (!completed || unlearnedCount === 0) return;
    firstPassRef.current ??= { total: activeCards.length, correct: learnedCount, cards: activeCards, missedCards };
    reviewUnlearned();
    setReviewPass((pass) => pass + 1);
    setFinishedPass(activeCards);
    setIntroToned(false);
    setDealStarted(false);
    setEntrance(null);
    setIntroActive(true);
  }, [activeCards, completed, learnedCount, missedCards, reviewUnlearned, unlearnedCount]);

  const restart = useCallback(() => {
    firstPassRef.current = null;
    finishedAtRef.current = null;
    startedAtRef.current = Date.now();
    setReviewPass(0);
    setIntroActive(false);
    setEntrance(null);
    resetAll();
  }, [resetAll]);

  useReviewTone(isReviewPass && !isDone && !(introActive && reviewPass === 1 && !introToned));

  const shownIndex = currentIndex + (session.inBeatDone ?? 0);
  const progress = useMemo(
    () => (isReviewPass && introActive && !dealStarted && finishedPass.length > 0
      ? { displayIndex: finishedPass.length - 1, totalCount: finishedPass.length, cleanupPhase: null }
      : isReviewPass && !isDone
      ? { displayIndex: shownIndex, totalCount: activeCards.length, cleanupPhase: { currentIndex: shownIndex, totalCount: activeCards.length } }
      : { displayIndex: Math.min(shownIndex, Math.max(0, activeCards.length - 1)), totalCount: activeCards.length, cleanupPhase: null }),
    [activeCards.length, shownIndex, dealStarted, finishedPass.length, introActive, isDone, isReviewPass],
  );
  usePracticeHeaderRegistration({
    currentIndex: progress.displayIndex,
    totalCount: progress.totalCount,
    showLightbulb: false,
    partSegments,
    cleanupPhase: progress.cleanupPhase,
    // The deck is fixed while the review intro plays.
    onShuffleClick: () => { if (!introActive) toggleShuffle(); },
    onRestartClick: restart,
    isShuffled,
  });

  // Session complete reports the whole session: from the first flashcard when this quiz follows one.
  const startedAtRef = useRef(Date.now());
  const finishedAtRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const risenFor = useRef<unknown>(null);
  const hasCard = Boolean(currentCard);
  const showContent = !introActive || Boolean(entrance);
  // Mixed rounds can reorder their beats: the actual first question leads the sheet.
  const reviewIntroCards = useMemo(() => introActive && currentCard
    ? [currentCard, ...activeCards.filter((card) => card.id !== currentCard.id)]
    : activeCards, [activeCards, currentCard, introActive]);
  const riseKey = entrance ?? (rise ? 'first' : null);
  useLayoutEffect(() => {
    if (preparation || !riseKey || risenFor.current === riseKey || !titleRef.current) return;
    risenFor.current = riseKey;
    if (entrance && !landsReviewGhost && questionRef.current) {
      riseIn(questionRef.current, 220, 8, 260);
      return;
    }
    if (riseKey === 'first' && questionRef.current && landQuizLaunch(questionRef.current)) return;
    riseIn(titleRef.current, entrance ? 240 : 120, entrance ? 8 : 12, entrance ? 220 : 480);
  }, [riseKey, hasCard, showContent, entrance, landsReviewGhost, preparation]);

  // The intro's ghost card is landed on the review's first question; modes without a landing fade it.
  const reviewHandoff = !preparation && landsReviewGhost && currentIndex === 0 ? entrance?.ghost ?? null : null;
  useEffect(() => {
    if (entrance?.ghost && !landsReviewGhost) fadeOutGhost(entrance.ghost.ghost);
  }, [entrance, landsReviewGhost]);
  useEffect(() => {
    if (preparation && entrance?.ghost) {
      entrance.ghost.ghost.remove();
      setEntrance({ ghost: null });
    }
  }, [preparation, entrance]);
  const entranceRef = useRef(entrance);
  entranceRef.current = entrance;
  useEffect(() => () => { entranceRef.current?.ghost?.ghost.remove(); }, []);

  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const openBreakdown = (index: number) => {
    setBreakdownIndex(index);
    setActiveBreakdown(currentCard.front);
  };

  if (isDone) {
    finishedAtRef.current ??= Date.now();
    // Quiz % is the first pass's: a review round doesn't change it.
    const first = firstPassRef.current ?? { total: learnedCount, correct: learnedCount, cards: activeCards, missedCards: [] };
    const words = sessionStats?.words ?? Array.from(new Set(first.cards.map((card) => card.front)));
    return (
      <SessionComplete
        words={words}
        pct={Math.round((first.correct / Math.max(1, first.total)) * 100)}
        pctLabel="Quiz"
        seconds={Math.max(1, Math.round((finishedAtRef.current - (sessionStats?.startedAt ?? startedAtRef.current)) / 1000))}
        onContinue={onContinue ?? onEnd}
        onReviewMissed={first.missedCards.length > 0 ? () => practiceCards(first.missedCards) : undefined}
        missedCount={first.missedCards.length}
        onStudyAllAgain={restart}
      />
    );
  }

  // `completed` with misses is one transient render: the review starts in the effect above.
  if (completed || (!currentCard && !introActive)) return null;

  return (
    <div className="relative flex-1 flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      {preparation && showContent ? preparation : <div className={`flex-1 flex flex-col ${wide ? 'max-w-xl md:max-w-[640px]' : 'max-w-lg'} mx-auto w-full px-4 sm:px-6 pb-[260px] md:pb-[250px] lg:pb-[150px] overscroll-none overflow-y-auto`}>
        {/* One exercise group: instruction aligned with the card, then the answers. */}
        {showContent && currentCard && (
          <div ref={questionRef} className="my-auto flex w-full flex-col items-center gap-5 pt-4">
            <div ref={titleRef} className="flex w-full items-center justify-center gap-3">
              {(isMatchPair || !(mode === 'quiz-choices' && quizFormat === 'mixed')) && (
                <PracticeFormatMenu mode={mode} isMatchPair={isMatchPair} />
              )}
              <h2 className="text-balance text-center text-2xl font-black leading-tight text-ui-ink-strong md:text-3xl">{title}</h2>
            </div>

            <Fragment key={`${currentIndex}:${currentCard.id}`}>
              {children({ openBreakdown, breakdownOpen: Boolean(activeBreakdown), reviewHandoff, isReviewPass })}
            </Fragment>
          </div>
        )}
      </div>}

      {introActive && (
        <div className="absolute inset-x-0 bottom-0 top-[72px] z-30">
          <ReviewDealIntro
            key={reviewPass}
            landing="ghost"
            cards={reviewIntroCards}
            passCards={finishedPass}
            pass={reviewPass}
            onHighlight={() => setIntroToned(true)}
            onDealStart={() => setDealStarted(true)}
            onHandoff={(ghost) => setEntrance({ ghost: ghost ?? null })}
            onDone={() => setIntroActive(false)}
          />
        </div>
      )}

      {!preparation && <FeedbackBottomBar
        status={status}
        correctAnswer={correctAnswer}
        pinyin={pinyin}
        word={word}
        onContinue={advance}
        onCheck={onCheck}
        showCheck={Boolean(onCheck)}
        isCheckDisabled={isCheckDisabled}
        hideWhenAutoAdvance={autoAdvance}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={hideBreakdown ? undefined : () => openBreakdown(0)}
        activeBook={activeBook}
      />}

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={breakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </div>
  );
};
