/** The cloud voice's two speakers (server/speech.ts). */
export type SpeechVoice = 'female' | 'male';

/** Text as the cloud voice stores it: one spelling per sentence, so one file. */
export function normalizeSpeechText(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * The file a text's audio lives in, on the server and in the device's audio cache. Named from the content, so it
 * never changes (the `-<12 hex>.mp3` ending marks it immutable for the cache); `v1` changes when the voices do.
 */
export async function speechKey(text: string, voice: SpeechVoice, reading?: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([normalizeSpeechText(text), reading ?? ''])));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `speech/v1/${voice}-${hex.slice(0, 28)}-${hex.slice(28, 40)}.mp3`;
}
