/** Book 1's public school beta lesson boundary, shared by client and game API. */
export const BETA_LAST_LESSON = 16;

/**
 * Books a quiz race may use and their lesson range (0 = Introduction); the same books and lessons the beta opens (Book 4 is locked).
 */
export const RACE_BOOKS: Readonly<Record<number, { first: number; last: number }>> = {
  1: { first: 0, last: BETA_LAST_LESSON }, 2: { first: 1, last: 16 }, 3: { first: 1, last: 16 },
};
