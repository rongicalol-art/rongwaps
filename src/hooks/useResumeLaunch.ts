import { useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ActivityType } from '../types/models';
import { getDeckIdentityKey, getSelectedLessonIds } from '../utils/lesson/lessonPartSelection';
import { clearQuizSnapshot, getFlashcardResume, getQuizResume, stashQuizTypes, type ResumeState } from '../utils/srs/resumeState';

export interface PendingResume {
  /** What the learner tapped; Continue opens the saved session's own screen instead when it differs. */
  activity: NonNullable<ActivityType>;
  resume: ResumeState;
  /** Every saved place for this deck (cards and quiz): Start over clears them all. */
  clearKeys: string[];
  /** The deck the saved session belongs to, so the dialog can read its size. */
  deck: { bookId: number; lessons: number[]; isReview: boolean; isLibrary: boolean };
}

/**
 * A flashcard or quiz session that has saved progress asks before its window opens: the screen the
 * learner tapped from stays up behind the dialog. `intercept` returns true when it took the launch over.
 */
export function useResumeLaunch(open: (activity: ActivityType) => void) {
  const [pending, setPending] = useState<PendingResume | null>(null);

  const intercept = useCallback((activity: ActivityType) => {
    const state = useAppStore.getState();
    if (!activity || state.activeActivity) return false;
    const isFlashcards = activity === 'flashcards' || activity === 'flashcards-library' || activity === 'flashcards-review';
    if (!isFlashcards && activity !== 'quiz') return false;
    const deck = {
      bookId: state.activeBookId,
      lessons: getSelectedLessonIds(state.selectedLessonParts, state.activeBookId),
      isReview: state.isReviewMode || activity === 'flashcards-review',
      isLibrary: activity === 'flashcards-library' || state.activeTab === 'library',
    };
    const sessionKey = getDeckIdentityKey({
      activeBookId: deck.bookId,
      selectedLessons: deck.lessons,
      selectedLessonParts: state.selectedLessonParts,
      libraryActiveFolder: state.libraryActiveFolder,
      isReviewDeck: deck.isReview,
      isLibraryDeck: deck.isLibrary,
    });
    const cards = isFlashcards ? getFlashcardResume(sessionKey, state) : null;
    const quiz = getQuizResume(sessionKey, state);
    // One entry, two modes: the deck opens where it was left (last activity), whichever button was tapped.
    const resume = isFlashcards
      ? (state.lastActivity === 'quiz' && quiz) || cards || quiz
      : quiz;
    if (!resume) return false;
    const clearKeys = [...(cards?.keys ?? []), ...(quiz?.keys ?? [])];
    setPending({ activity, resume, clearKeys, deck });
    return true;
  }, []);

  const launch = useCallback((continued: boolean) => {
    if (!pending) return;
    const types = continued && pending.resume.kind !== 'cards' ? pending.resume.quizTypes ?? null : null;
    // Mixed ([]) only means something while the mixed quiz is the chosen format.
    stashQuizTypes(types && (types.length > 0 || useAppStore.getState().quizFormat === 'mixed') ? types : null);
    setPending(null);
    open(continued && pending.resume.mode === 'quiz' ? 'quiz' : pending.activity);
  }, [open, pending]);

  const onContinue = useCallback(() => launch(true), [launch]);
  const onStartOver = useCallback(() => {
    const { clearSessionProgressIndex } = useAppStore.getState();
    pending?.clearKeys.forEach((key) => { clearSessionProgressIndex(key); clearQuizSnapshot(key); });
    launch(false);
  }, [launch, pending]);
  /** Closing the question leaves the saved progress alone. */
  const onClose = useCallback(() => {
    setPending(null);
    useAppStore.getState().setIsReviewMode(false);
    useAppStore.getState().setActiveReviewSessionCards(null);
  }, []);

  return { pending, intercept, onContinue, onStartOver, onClose };
}
