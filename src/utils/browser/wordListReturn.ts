const PENDING_KEY = 'pendingWordList';
const KNOWN_PREFIX = 'rw-known-words-';
/** A Study tap older than this was abandoned; it must not save cards on some later visit. */
const PENDING_LIFETIME_MS = 30 * 60 * 1000;

export interface WordListReturn {
  slug: string;
  /** Words the visitor marked as known (`wordKey`); the rest are saved to study. */
  known: string[];
}

/** One word of a list: two readings of one spelling (長 cháng, zhǎng) are two words. */
export const wordKey = (hanzi: string, pinyin: string) => `${hanzi} ${pinyin}`;

// Storage can throw in private mode or when site data is blocked.

/**
 * A public word list's Study button remembers its list and the known words here, so the app can
 * save the others into a folder after the trip through Google sign-in (which always returns to
 * the home address).
 */
export function rememberWordListReturn(slug: string, known: readonly string[]): void {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ slug, known, at: Date.now() })); } catch { /* ignore */ }
}

function read(): WordListReturn | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as { slug?: unknown; known?: unknown; at?: unknown } | null;
    if (!value || typeof value.slug !== 'string' || !Array.isArray(value.known) || typeof value.at !== 'number') return null;
    if (Date.now() - value.at > PENDING_LIFETIME_MS) return null;
    return { slug: value.slug, known: value.known.filter((key): key is string => typeof key === 'string') };
  } catch { return null; }
}

export const hasWordListReturn = (): boolean => read() !== null;

export function takeWordListReturn(): WordListReturn | null {
  const pending = read();
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  return pending;
}

/** Known words stay on this device, so a visitor who comes back finds their taps. */
export function readKnownWords(slug: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KNOWN_PREFIX + slug) ?? '[]');
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : [];
  } catch { return []; }
}

export function saveKnownWords(slug: string, known: readonly string[]): void {
  try { localStorage.setItem(KNOWN_PREFIX + slug, JSON.stringify(known)); } catch { /* ignore */ }
}
