/**
 * Who may use Study together, beyond a genuine sign-in (docs/RELEASING.md → Study together emergency):
 * - SOCIAL_PAUSED = "1" (a Worker secret) pauses chat and races for everyone at once;
 * - SOCIAL_BANNED (a Worker secret, comma-separated account IDs) shuts out those accounts at once, before their
 *   database ban reaches their sign-in;
 * - a new public account must have answered the 18+ step (age_ok, stamped by the sign-in hook), and joins only
 *   from 14 November (public_account; shared/publicLaunch.ts);
 * - OWNER_EMAILS (config) may use the names reserved for the app ("Ron", "Admin").
 * Changing a secret deploys a new Worker version, which also closes every open connection.
 */
import { studyTogetherOpenToAll } from '../shared/publicLaunch';

type Switches = { SOCIAL_PAUSED?: string; SOCIAL_BANNED?: string; OWNER_EMAILS?: string };
const switches = (env: Env) => env as Env & Switches;
const list = (value: string | undefined) => (value ?? '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);

export const SOCIAL_PAUSED_ERROR = 'Study together is paused for now. Try again later.';
export const SOCIAL_BANNED_ERROR = 'This account can’t use Study together.';
export const AGE_STEP_ERROR = 'Finish signing up in the app first.';
export const NOT_YET_ERROR = 'Study together opens to everyone on November 14.';

export const socialPaused = (env: Env) => switches(env).SOCIAL_PAUSED === '1';
export const socialBanned = (env: Env, userId: string) => list(switches(env).SOCIAL_BANNED).includes(userId.toLowerCase());

/** Why this account may not join right now, or null. */
export function socialRefusal(env: Env, userId: string, claims: Record<string, unknown>): string | null {
  if (socialPaused(env)) return SOCIAL_PAUSED_ERROR;
  if (socialBanned(env, userId)) return SOCIAL_BANNED_ERROR;
  // Older school tokens carry no age_ok: they passed the school check, whose Terms already required 18+.
  if (claims.age_ok === false) return AGE_STEP_ERROR;
  // Existing learners are shown to strangers only from 14 November (their 7-day notice).
  if (claims.public_account === true && !studyTogetherOpenToAll()) return NOT_YET_ERROR;
  return null;
}

export const isOwnerAccount = (env: Env, claims: Record<string, unknown>) =>
  typeof claims.email === 'string' && list(switches(env).OWNER_EMAILS).includes(claims.email.toLowerCase());

/**
 * The Google photo the sign-in hook copied from Google's own identity record (`google_photo`, migration
 * 20261106120000): the only provider photo an account may show. Never `user_metadata`, which learners can edit.
 */
export function googlePhoto(claims: Record<string, unknown>): string | undefined {
  return typeof claims.google_photo === 'string' && claims.google_photo ? claims.google_photo : undefined;
}
