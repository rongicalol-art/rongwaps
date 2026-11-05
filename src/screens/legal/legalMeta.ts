import { SIGNUP_OPEN_AT } from '../../../shared/publicLaunch';

/** Shared facts the legal pages state; change them here, not in the prose. */
export const LEGAL_CONTACT_EMAIL = 'rongicalol@gmail.com';

/** ISO date the current Terms and Privacy Policy take effect. */
export const LEGAL_EFFECTIVE_DATE = '2026-11-14';

export interface LegalUpdate {
  /** The changed pages; Read opens the first, and each links the others. */
  pages: readonly ('terms' | 'privacy')[];
  /** One or two plain sentences: what changes for the user. */
  summary: string;
  /** Accounts created from this ISO date accepted the new text at sign-up, so they never see the notice. */
  acceptedFrom?: string;
}

/**
 * A meaningful Terms/Privacy change (Terms §18, Privacy §12). Publish the new
 * text together with a LEGAL_EFFECTIVE_DATE at least 7 days after the deploy
 * and a summary here; signed-in users then see a banner until 30 days after it
 * takes effect. Keep null when nothing meaningful changed.
 */
export const LEGAL_UPDATE: LegalUpdate | null = {
  pages: ['privacy', 'terms'],
  summary: 'From November 6, anyone 18 or older can join. From November 14, learners outside Shu-Te will see your name, photo and lesson in Study together (to hide: Settings → Show me online). You can report or block anyone.',
  acceptedFrom: '2026-11-06',
};

/** Shown beside the effective date: accounts made since sign-up opened are bound from sign-up. */
export const LEGAL_NEW_ACCOUNTS_NOTE = 'new accounts from sign-up';

/** Anyone 18+ can sign up from that day (owner sets private.signup_settings.public_open). */
export function isSignupOpen(now = Date.now()): boolean {
  return now >= SIGNUP_OPEN_AT;
}

const NOTICE_AFTER_EFFECTIVE_MS = 30 * 24 * 60 * 60 * 1000;

const effectiveAt = (iso: string) => Date.parse(`${iso}T00:00:00+08:00`);

/** Shown until 30 days after the change, and only to accounts made before they accepted it (at sign-up or the date). */
export function isLegalUpdateCurrent(effectiveIso: string, now = Date.now(), accountCreatedAt?: string, acceptedFromIso = effectiveIso): boolean {
  const created = accountCreatedAt ? Date.parse(accountCreatedAt) : Number.NaN;
  if (Number.isFinite(created) && created >= effectiveAt(acceptedFromIso)) return false;
  return now < effectiveAt(effectiveIso) + NOTICE_AFTER_EFFECTIVE_MS;
}

/** "Takes effect November 14, 2026." before the date, "Took effect …" from it. */
export function legalEffectivePhrase(effectiveIso: string, now = Date.now()): string {
  return `${now < effectiveAt(effectiveIso) ? 'Takes' : 'Took'} effect ${formatLegalDate(effectiveIso)}.`;
}

/** "October 23, 2026" — the date is a Taiwan calendar date, so no time zone shift. */
export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
