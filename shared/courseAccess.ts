/** Book 1's public school beta lesson boundary, shared by client and game API. */
export const BETA_LAST_LESSON = 16;

/**
 * Books a quiz race may use and their open lesson range (0 = Introduction): the books every beta account
 * can open (`isLessonLocked` in src/data/books.ts). Keep the two in step.
 */
export const RACE_BOOKS: Readonly<Record<number, { first: number; last: number }>> = { 1: { first: 0, last: BETA_LAST_LESSON }, 3: { first: 1, last: 16 } };
