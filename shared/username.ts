/**
 * @username rules, in one place for the app; the database enforces the same (20261121130000_usernames.sql), and
 * tests/unit/usernameBase.test.ts checks the two agree.
 */
export const USERNAME_CHANGE_DAYS = 7;
export const USERNAME_FORMAT_HINT = 'Use 3 to 20 letters, numbers, dots or underscores.';
/** Add friends shows at most this many search results. */
export const USERNAME_SEARCH_LIMIT = 20;

/** 3-20 of a-z 0-9 . _, not starting or ending with a dot, no two dots in a row. */
export function usernameFormatOk(name: string): boolean {
  return /^[a-z0-9_.]{3,20}$/.test(name) && !/^\.|\.$|\.\./.test(name);
}
