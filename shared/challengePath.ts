/**
 * Challenge link addresses, with no other imports so the app's first load can recognise one cheaply.
 * The rest of the challenge rules: shared/challenge.ts.
 */

export const CHALLENGE_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

/** The lesson a link is named after (its preview picture): the first numbered lesson of the quiz. */
export interface ChallengeLesson { book: number; lesson: number }

/** `/c/1-5/K7Q2MXAB`: the lesson is in the address so a link preview needs no database lookup. */
export function challengePath({ book, lesson }: ChallengeLesson, code: string): string {
  return `/c/${book}-${lesson}/${code}`;
}

/** The lesson pair a preview page is named by (`/c/1-5`), or null. */
export const CHALLENGE_PAGE = /^\/c\/([1-9])-([1-9]\d?)$/;
const CHALLENGE_LINK = /^\/c\/([1-9])-([1-9]\d?)\/([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8})\/?$/;

/** A challenge address, parsed; null for anything else. */
export function parseChallengePath(path: string | null | undefined): (ChallengeLesson & { code: string; page: string }) | null {
  const match = path ? CHALLENGE_LINK.exec(path) : null;
  if (!match) return null;
  return { book: Number(match[1]), lesson: Number(match[2]), code: match[3], page: `/c/${match[1]}-${match[2]}` };
}

