import { PUBLIC_LAUNCH_AT } from '../../../shared/publicLaunch';

/** Shared facts the legal pages state; change them here, not in the prose. */
export const LEGAL_CONTACT_EMAIL = 'rongicalol@gmail.com';

/** ISO date the current Terms and Privacy Policy take effect. */
export const LEGAL_EFFECTIVE_DATE = '2026-11-14';

export interface LegalUpdate {
  /** The changed pages; Read opens the first, and each links the others. */
  pages: readonly ('terms' | 'privacy')[];
  /** One or two plain sentences: what changes for the user. */
  summary: string;
}

/**
 * A meaningful Terms/Privacy change (Terms §18, Privacy §12). Publish the new
 * text together with a LEGAL_EFFECTIVE_DATE at least 7 days after the deploy
 * and a summary here; signed-in users then see a banner until 30 days after it
 * takes effect. Keep null when nothing meaningful changed.
 */
export const LEGAL_UPDATE: LegalUpdate | null = {
  pages: ['privacy', 'terms'],
  summary: 'From November 14, anyone 18 or older can join. Learners outside Shu-Te will see your name, photo and lesson in Study together (to hide: Settings → Show me online). You can report or block anyone.',
};

/** Public sign-up opens that day (owner sets private.signup_settings.public_open). */
export function isPublicLaunched(now = Date.now()): boolean {
  return now >= PUBLIC_LAUNCH_AT;
}

const NOTICE_AFTER_EFFECTIVE_MS = 30 * 24 * 60 * 60 * 1000;

const effectiveAt = (iso: string) => Date.parse(`${iso}T00:00:00+08:00`);

/** Shown until 30 days after the change, and only to accounts that existed before it took effect. */
export function isLegalUpdateCurrent(effectiveIso: string, now = Date.now(), accountCreatedAt?: string): boolean {
  const created = accountCreatedAt ? Date.parse(accountCreatedAt) : Number.NaN;
  if (Number.isFinite(created) && created >= effectiveAt(effectiveIso)) return false;
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
