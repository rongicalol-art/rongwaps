import { reviewSessionKey } from './sessionProgress';
import type { QuizTypeId } from '../vocabulary/quizDirector';

export type ResumeKind = 'cards' | 'review' | 'quiz';

export interface ResumeState {
  kind: ResumeKind;
  /** Which screen it was left in: Continue opens that one, whatever button started the launch. */
  mode: 'flashcards' | 'quiz';
  /** 1-based position of the card/question the session was left on. */
  position: number;
  /** Words still to review (review only). */
  left?: number;
  /** Every saved progress key this resume covers: Start over clears them all. */
  keys: string[];
  /** Quiz only: the picked types the saved round used ([] = Mixed), so Continue skips the picker. */
  quizTypes?: QuizTypeId[];
}

interface Saved {
  sessionProgressIndex: Record<string, number>;
  sessionCardOrder: Record<string, string[]>;
}

/** What a flashcard session saved under its deck key: an unfinished review pass, or a card position. */
export function getFlashcardResume(sessionKey: string, saved: Saved): ResumeState | null {
  const index = saved.sessionProgressIndex[sessionKey];
  const reviewIds = saved.sessionCardOrder[reviewSessionKey(sessionKey)];
  if (reviewIds?.length) {
    return { kind: 'review', mode: 'flashcards', position: (index ?? 0) + 1, left: Math.max(1, reviewIds.length - (index ?? 0)), keys: [sessionKey] };
  }
  if (typeof index !== 'number' || index <= 0) return null;
  return { kind: 'cards', mode: 'flashcards', position: index + 1, keys: [sessionKey] };
}

/** The quiz's own saved place for a deck; the flashcards keep the plain deck key, so the two never overwrite each other. */
export const quizSessionKey = (deckKey: string) => `${deckKey}|quiz`;

/** What a quiz saved for this deck: its own key (Mixed / classic), a picked-types key, or the typing quiz. */
export function getQuizResume(sessionKey: string, saved: Saved): ResumeState | null {
  const typesPrefix = `${sessionKey}|types:`;
  // A left review round counts even on its first card (index 0); it wins over a plain position.
  let best: { key: string; index: number; reviewLeft: number } | null = null;
  const keys: string[] = [];
  for (const [key, index] of Object.entries(saved.sessionProgressIndex)) {
    const mine = key === quizSessionKey(sessionKey) || key === `${sessionKey}:typing` || key.startsWith(typesPrefix);
    if (!mine || !Number.isSafeInteger(index) || index < 0) continue;
    keys.push(key);
    const reviewIds = saved.sessionCardOrder[reviewSessionKey(key)];
    const reviewLeft = reviewIds?.length ? Math.max(1, reviewIds.length - index) : 0;
    // An explicit index 0 means the quiz was opened and saved on its first question.
    // An untouched quiz has no entry at all (the picker does not create a session).
    if (!best || (reviewLeft && !best.reviewLeft) || (!reviewLeft === !best.reviewLeft && index > best.index)) best = { key, index, reviewLeft };
  }
  if (!best) return null;
  const quizTypes = best.key.startsWith(typesPrefix)
    ? best.key.slice(typesPrefix.length).split('+').filter(Boolean) as QuizTypeId[]
    : best.key === quizSessionKey(sessionKey) ? [] : undefined;
  if (best.reviewLeft) {
    return { kind: 'review', mode: 'quiz', position: best.index + 1, left: best.reviewLeft, keys, quizTypes };
  }
  return { kind: 'quiz', mode: 'quiz', position: best.index + 1, keys, quizTypes };
}

const RESUME_COPY: Record<ResumeKind, { title: string; continueLabel: string }> = {
  cards: { title: 'Pick up where you left off?', continueLabel: 'Continue cards' },
  review: { title: 'Finish your review?', continueLabel: 'Continue review' },
  quiz: { title: 'Pick up your quiz?', continueLabel: 'Continue quiz' },
};

export function resumeCopy(state: ResumeState): { title: string; continueLabel: string } {
  return RESUME_COPY[state.kind];
}

/** `total` is the deck size once it has loaded; without it the line just names the position. */
export function resumeDetail(state: ResumeState, total?: number): string {
  if (state.kind === 'review') return `${state.left} ${state.left === 1 ? 'word' : 'words'} left to review`;
  const noun = state.kind === 'quiz' ? 'Question' : 'Card';
  return total && total >= state.position ? `${noun} ${state.position} of ${total}` : `${noun} ${state.position}`;
}

/** 0-100 for the dialog's bar: only flashcards know their deck size up front. */
export function resumeProgress(state: ResumeState, total?: number): number | undefined {
  if (state.kind !== 'cards' || !total || total < state.position) return undefined;
  return Math.round(((state.position - 1) / total) * 100);
}

export const RESUME_ICON = { cards: 'flashcards', review: 'review', quiz: 'quiz' } as const;

/** The quiz round's frozen seed lives in sessionStorage under this key; Start over drops it with the progress. */
export const quizSnapshotKey = (sessionKey: string) => `rw-quiz-round:${sessionKey}`;

export function clearQuizSnapshot(sessionKey: string) {
  try { window.sessionStorage.removeItem(quizSnapshotKey(sessionKey)); } catch { /* storage unavailable */ }
}

let launchedQuizTypes: QuizTypeId[] | null = null;
/** Continue on a saved quiz hands its picked types to the quiz screen that opens next (skips the picker). */
export function stashQuizTypes(types: QuizTypeId[] | null) { launchedQuizTypes = types; }
export function peekQuizTypes(): QuizTypeId[] | null { return launchedQuizTypes; }
