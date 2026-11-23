import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { befriendChallenger, saveChallenge } from '../../services/challengeService';
import { loadFriends } from './friendsController';
import { challengeLesson, challengePath, newChallengeCode, type ChallengeLink } from '../../../shared/challenge';
import { parseSelection, type RaceSelection } from '../../../shared/quizRace';
import type { Flashcard } from '../../data/flashcards';
import type { QuizTypeId } from '../../utils/vocabulary/quizDirector';

/**
 * Challenge links: the sender shares a finished lesson quiz from Session complete; a classmate opens the link,
 * plays the same words and quiz types, and races a replay of the sender's first pass (shared/challenge.ts).
 */

/** Opens the challenge quiz for `link`; the caller then starts the quiz activity. */
export function playChallenge(link: ChallengeLink) {
  useAppStore.getState().setSocial({ challenge: link, challengePlaying: true, challengeStartedAt: null, challengeDoneMs: null, challengeKey: `challenge:${link.code}:${Date.now()}` });
}

export function endChallenge() {
  useAppStore.getState().setSocial({ challenge: null, challengePlaying: false, challengeStartedAt: null, challengeDoneMs: null, challengeKey: null });
}

/** While a challenge is on screen: its quiz types, a session of its own and its seed. */
export function useChallengeQuiz(): { types: readonly QuizTypeId[]; sessionKey: string; seed: string; selection: RaceSelection } | null {
  const { link, key } = useAppStore(useShallow((state) => ({ link: state.challengePlaying ? state.challenge : null, key: state.challengeKey })));
  if (!link || !key) return null;
  return { types: link.selection.types, sessionKey: key, seed: link.code, selection: link.selection };
}

/** The quiz a finished deck can be shared as: one book, its lessons and the parts the words came from. */
export function challengeSelection(cards: readonly Flashcard[], types: readonly QuizTypeId[]): RaceSelection | null {
  const books = new Set(cards.map((card) => card.bookId));
  if (books.size !== 1) return null;
  const parts: Record<string, Set<number>> = {};
  for (const card of cards) (parts[String(card.lessonId)] ??= new Set()).add(card.lessonId === 0 ? 1 : card.partId ?? 1);
  const lessons = Object.fromEntries(Object.entries(parts).map(([lesson, set]) => [lesson, [...set].sort((a, b) => a - b)]));
  try {
    const selection = parseSelection({ book: [...books][0], lessons, types: [...types] });
    // Every word's lesson must survive the check, or the classmate would get a different deck.
    if (Object.keys(selection.lessons).length !== Object.keys(lessons).length || !challengeLesson(selection)) return null;
    return selection;
  } catch {
    return null;
  }
}

export interface ChallengeRun { selection: RaceSelection; correct: number; total: number; run: number[] }

/**
 * Shares a run: the link goes to the share sheet (or the clipboard) inside the tap, as Safari requires, while the
 * run is saved under the same code. A save that fails says so, since the link would lead nowhere.
 */
export async function shareChallenge({ selection, correct, total, run }: ChallengeRun): Promise<void> {
  const lesson = challengeLesson(selection);
  if (!lesson) return;
  const store = useAppStore.getState();
  const code = newChallengeCode();
  const url = `${window.location.origin}${challengePath(lesson, code)}`;
  const saving = saveChallenge(code, selection, correct, total, run).then(() => true, () => false);
  let shared = true;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Can you beat my score?', url });
    } catch (error) {
      // Closing the share sheet is not a failure; a browser that refuses to share copies instead.
      shared = !(error instanceof DOMException && error.name === 'AbortError') && await copy(url);
    }
  } else {
    shared = await copy(url);
  }
  if (shared && !(await saving)) store.showFeedbackToast('That challenge didn’t save. Share a new one.', 'neutral', 3500);
}

async function copy(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    useAppStore.getState().showFeedbackToast('Challenge link copied', 'neutral', 2000);
    return true;
  } catch {
    useAppStore.getState().showFeedbackToast('Couldn’t copy the challenge link', 'neutral', 2500);
    return false;
  }
}

/** Add friend on a challenge: friends at once (the sender said yes by sharing), or a request past the link's limit. */
export async function befriend(link: ChallengeLink): Promise<'friends' | 'requested' | null> {
  try {
    const result = await befriendChallenger(link.code);
    const store = useAppStore.getState();
    if (store.challenge?.code === link.code) store.setSocial({ challenge: { ...link, friends: result === 'friends' } });
    void loadFriends();
    return result;
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : '';
    useAppStore.getState().showFeedbackToast(/most friends|ended|can.t add/i.test(message) ? message : 'Couldn’t add a friend right now', 'neutral', 3000);
    return null;
  }
}
