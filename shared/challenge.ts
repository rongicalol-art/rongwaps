/**
 * Challenge links ("race my run"): a learner shares a finished lesson quiz, and a classmate plays the same words
 * and quiz types against a replay of the sender's first pass. Shared by the app, the server (link previews) and
 * the build (preview pages). The database (20261123120000_challenges) keeps the same code and size rules.
 */
import { parseSelection, socialColor, type RaceSelection, type SocialColor } from './quizRace';
import { isNameAllowed } from './nameFilter';
import type { ChallengeLesson } from './challengePath';

export { CHALLENGE_CODE, CHALLENGE_PAGE, challengePath, parseChallengePath, type ChallengeLesson } from './challengePath';

/** Unambiguous letters and digits, as room codes use; 8 of them cannot be guessed. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** The longest quiz a challenge records (the database checks the same). */
export const CHALLENGE_MAX_WORDS = 2000;
/** One answer may take at most an hour of the recorded run. */
export const CHALLENGE_MAX_MS = 3_600_000;

export function newChallengeCode(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  // 256 is a multiple of 32, so every letter is equally likely.
  return Array.from(random(new Uint8Array(8)), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** The lesson to name a quiz's link after; null when it has only the Introduction (no preview picture). */
export function challengeLesson(selection: RaceSelection): ChallengeLesson | null {
  const lessons = Object.keys(selection.lessons).map(Number).filter((lesson) => lesson >= 1).sort((a, b) => a - b);
  return lessons.length ? { book: selection.book, lesson: lessons[0] } : null;
}

/** What a classmate needs to play a challenge (from `challenge_card`). */
export interface ChallengeLink {
  code: string;
  name: string;
  color: SocialColor;
  selection: RaceSelection;
  correct: number;
  total: number;
  /** Milliseconds from the first question at which the sender had answered word 1, 2, … */
  run: number[];
  /** The viewer sent it. */
  mine: boolean;
  /** The viewer and the sender are already friends. */
  friends: boolean;
}

/** A recorded run is usable: one mark per word, never going back in time, within the limits. */
export function isValidRun(run: unknown, total: number): run is number[] {
  if (!Array.isArray(run) || run.length !== total || total < 1 || total > CHALLENGE_MAX_WORDS) return false;
  let previous = 0;
  for (const mark of run) {
    if (!Number.isInteger(mark) || mark < previous || mark > CHALLENGE_MAX_MS) return false;
    previous = mark;
  }
  return true;
}

/** The sender's name as shown: a name the chat filter would refuse is never shown. */
export const challengeName = (name: unknown): string => {
  const text = typeof name === 'string' ? name.trim().slice(0, 30) : '';
  return text && isNameAllowed(text) ? text : 'A classmate';
};

/** A `challenge_card` answer, checked; null when it isn't a playable challenge. */
export function parseChallengeLink(code: string, value: unknown): ChallengeLink | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const total = Number(data.total);
  const correct = Number(data.correct);
  if (!Number.isInteger(total) || !Number.isInteger(correct) || correct < 0 || correct > total || !isValidRun(data.run, total)) return null;
  let selection: RaceSelection;
  try { selection = parseSelection(data.selection); } catch { return null; }
  return {
    code, name: challengeName(data.name), color: socialColor(data.color), selection, correct, total, run: data.run,
    mine: data.mine === true, friends: data.friends === true,
  };
}

/** How many words the sender had answered `elapsed` ms into their run. */
export function ghostAnswered(run: readonly number[], elapsed: number): number {
  let low = 0;
  let high = run.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (run[mid] <= elapsed) low = mid + 1; else high = mid;
  }
  return low;
}

export interface ChallengeScore { correct: number; total: number; ms: number }
export type ChallengeOutcome = 'won' | 'lost' | 'tied';

/** The better first-pass score wins; the same score goes to the faster run. */
export function challengeOutcome(me: ChallengeScore, them: ChallengeScore): ChallengeOutcome {
  // Cross-multiplied so a deck that changed size since the link was made still compares fairly.
  const mine = me.correct * Math.max(1, them.total);
  const theirs = them.correct * Math.max(1, me.total);
  if (mine !== theirs) return mine > theirs ? 'won' : 'lost';
  if (me.ms !== them.ms) return me.ms < them.ms ? 'won' : 'lost';
  return 'tied';
}

export const challengePercent = ({ correct, total }: Pick<ChallengeScore, 'correct' | 'total'>) => Math.round((correct / Math.max(1, total)) * 100);
