/** Shared facts the legal pages state; change them here, not in the prose. */
export const LEGAL_CONTACT_EMAIL = 'rongicalol@gmail.com';

/** ISO date the current Terms and Privacy Policy take effect. */
export const LEGAL_EFFECTIVE_DATE = '2026-11-14';

export interface LegalUpdate {
  page: 'terms' | 'privacy';
  /** One plain sentence: what changes for the user. */
  summary: string;
}

/**
 * A meaningful Terms/Privacy change (Terms §18, Privacy §12). Publish the new
 * text together with a LEGAL_EFFECTIVE_DATE at least 7 days after the deploy
 * and a summary here; signed-in users then see a banner until 30 days after it
 * takes effect. Keep null when nothing meaningful changed.
 */
export const LEGAL_UPDATE: LegalUpdate | null = {
  page: 'terms',
  summary: 'From November 14, anyone 18 or older can join Ron’s Mandarin. Study together will include learners from outside Shu-Te, and you can report or block anyone.',
};

/** Public sign-up opens with the current Terms (owner sets private.signup_settings.public_open that day). */
export function isPublicLaunched(now = Date.now()): boolean {
  return now >= Date.parse(`${LEGAL_EFFECTIVE_DATE}T00:00:00+08:00`);
}

const NOTICE_AFTER_EFFECTIVE_MS = 30 * 24 * 60 * 60 * 1000;

export function isLegalUpdateCurrent(effectiveIso: string, now = Date.now()): boolean {
  return now < Date.parse(`${effectiveIso}T00:00:00+08:00`) + NOTICE_AFTER_EFFECTIVE_MS;
}

/** "October 23, 2026" — the date is a Taiwan calendar date, so no time zone shift. */
export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
