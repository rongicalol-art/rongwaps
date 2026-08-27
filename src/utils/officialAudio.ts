/**
 * Official 時代華語 (Modern Chinese) book audio resolution.
 *
 * The publisher's official MP3s are named `B1-LL-P-T.mp3` (lesson-part-track),
 * which maps 1:1 onto the app's `audioReference` strings (e.g. `01-1-3` →
 * `B1-01-1-3.mp3`). Book 1's tracks are hosted in the `vocabulary-audio`
 * Supabase bucket, so they stream through the existing durable-cache → public
 * URL → /api/audio proxy chain and degrade to TTS like any other audio file.
 *
 * Books 2–4 official audio is not hosted yet; `officialAudioFileName` returns
 * null for them so callers fall back to TTS automatically.
 */

/** Master switch: set false to disable all official book audio playback. */
export const OFFICIAL_BOOK_AUDIO_ENABLED = true;

/** `LL-P-T` where LL is 1–2 digits, P and T are 1–3. */
const OFFICIAL_AUDIO_REFERENCE_PATTERN = /^(\d{1,2})-([1-3])-([1-3])$/;

/**
 * Resolve an `audioReference` to the official audio file name for a book, or
 * null when no official track is hosted for it. Pure and deterministic so
 * callers (and tests) can rely on it.
 */
export function officialAudioFileName(
  bookId: number,
  audioReference: string,
): string | null {
  if (!OFFICIAL_BOOK_AUDIO_ENABLED) return null;
  if (bookId !== 1) return null; // Only Book 1 official audio is hosted.
  const match = OFFICIAL_AUDIO_REFERENCE_PATTERN.exec(audioReference.trim());
  if (!match) return null;
  const [, lesson, part, track] = match;
  return `B1-${lesson.padStart(2, '0')}-${part}-${track}.mp3`;
}
