/**
 * The public launch, in two steps (fixed history: a later Terms change moves LEGAL_EFFECTIVE_DATE, not these).
 * - SIGNUP_OPEN_AT, 2026-11-06 00:00 Taiwan: anyone 18+ can sign up (the owner opens it in
 *   private.signup_settings). New accounts accept the new Terms and Privacy at sign-up and start with initials.
 * - PUBLIC_LAUNCH_AT, 2026-11-14 00:00 Taiwan: the new Terms and Privacy take effect for accounts made before
 *   sign-up opened (their 7-day notice), and Study together mixes school and public accounts. Until then public
 *   accounts don't join Study together, so existing learners aren't shown to strangers before that date.
 */
export const SIGNUP_OPEN_AT = Date.parse('2026-11-06T00:00:00+08:00');
export const PUBLIC_LAUNCH_AT = Date.parse('2026-11-14T00:00:00+08:00');

/** Whether public accounts may join Study together yet. */
export const studyTogetherOpenToAll = (now = Date.now()) => now >= PUBLIC_LAUNCH_AT;
