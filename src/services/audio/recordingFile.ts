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
