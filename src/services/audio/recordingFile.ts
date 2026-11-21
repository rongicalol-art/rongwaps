import { wordBopomofo } from '../../utils/pinyin/bopomofo';

/** A real recording (audio file or URL), as opposed to text for the browser voice. The one owner of this rule. */
export function isRecordingFile(name: string | undefined): name is string {
  return Boolean(name) && /\.(mp3|wav|ogg|m4a)(?:$|[?#])|^https?:\/\//i.test(name as string);
}

/**
 * Flashcards never swap a word's recording for the browser voice (owner rule:
 * avoid robotic speech wherever a recording exists). If the clip can't play,
 * the card stays quiet; the next tap or card retries the download.
 */
export function recordedOnly(card: { audio?: string }): { fallback: 'none' } | undefined {
  return isRecordingFile(card.audio) ? { fallback: 'none' } : undefined;
}

/**
 * Whether audioService.playCard has something to say without guessing: a recording, a dictionary character's
 * recorded syllable, or a dictionary word whose reading the cloud voice can be told.
 */
export function canPlayCard(card: { audio?: string; front: string; source?: string; pinyin?: string }): boolean {
  if (isRecordingFile(card.audio)) return true;
  if (card.source !== 'dictionary' || !card.pinyin) return false;
  return /^[\u3400-\u9fff]$/u.test(card.front) || wordBopomofo(card.front, card.pinyin) !== null;
}
