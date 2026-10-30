/**
 * Official 時代華語 (Modern Chinese) book audio resolution.
 *
 * The publisher's official MP3s are named `B1-LL-P-T.mp3` or `B3-LL-P-T.mp3` (lesson-part-track),
 * which maps 1:1 onto the app's `audioReference` strings (e.g. `01-1-3` →
 * `B1-01-1-3.mp3`). Books 1 and 3 tracks are hosted in the Cloudflare R2 bucket
 * behind VITE_AUDIO_BASE_URL, so they stream through the existing durable-cache →
 * public URL chain and degrade to TTS like any other audio file.
 *
 * Book 2 lessons 1–8 use hosted tracks. Local DEV playback, including lessons
 * 1–16, requires VITE_BOOK2_AUDIO_LOCAL=true. Book 4 falls back to TTS until
 * official audio is available.
 */

/** Master switch: set false to disable all official book audio playback. */
export const OFFICIAL_BOOK_AUDIO_ENABLED = true;

/** `LL-P-T` where LL is 1–2 digits, P and T are 1–3. */
const OFFICIAL_AUDIO_REFERENCE_PATTERN = /^(\d{1,2})-([1-3])-([1-3])$/;

function shouldUseLocalBook2Audio(): boolean {
  const env = (import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_BOOK2_AUDIO_LOCAL?: string } }).env;
  return env?.DEV === true && env.VITE_BOOK2_AUDIO_LOCAL === 'true';
}

/**
 * Resolve an `audioReference` to the official audio file name for a book, or
 * null when no official track is available for it. Pure and deterministic so
 * callers (and tests) can rely on it.
 */
export function officialAudioFileName(
  bookId: number,
  audioReference: string,
): string | null {
  if (!OFFICIAL_BOOK_AUDIO_ENABLED) return null;
  if (bookId !== 1 && bookId !== 2 && bookId !== 3) return null;
  const match = OFFICIAL_AUDIO_REFERENCE_PATTERN.exec(audioReference.trim());
  if (!match) return null;
  const [, lesson, part, track] = match;
  if (bookId === 2) {
    const maxLesson = shouldUseLocalBook2Audio() ? 16 : 8;
    if (Number(lesson) < 1 || Number(lesson) > maxLesson || !['1', '2'].includes(part) || track !== '1') return null;
  }
  return `B${bookId}-${lesson.padStart(2, '0')}-${part}-${track}.mp3`;
}
