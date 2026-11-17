import { speechKey, type SpeechVoice } from '../../../shared/speechKey';
import { debugLogger } from '../../utils/debug/debugLogger';
import { authService } from '../authService';
import { isSupabaseConfigured } from '../supabaseClient';
import { audioBlobCachedAt, cacheObjectUrl, getCachedObjectUrl, isUsableAudioBlob, readCachedAudioBlob, storeAudioBlob } from './audioCache';
import { playHtmlAudio } from './playbackEngine';

/**
 * The cloud voice (`POST /api/speech`): a natural Taiwan voice for Chinese text that has no recording. The
 * server makes each text once and keeps it; this device keeps what it has played in the audio cache.
 */
export interface CloudSpeechRequest { text: string; voice?: SpeechVoice; /** Bopomofo, one syllable per character. */ reading?: string }

const MAX_CHARACTERS = 80;
const WAIT_MS = 4500;
/** After the server says the voice is out (allowance used up, not set up), stop asking for a while. */
const REST_MS = 5 * 60_000;
let restUntil = 0;

/** Whether asking is worth the wait; otherwise the caller goes straight to its fallback. */
export function cloudSpeechAvailable(text: string): boolean {
  const length = Array.from(text.trim()).length;
  return length > 0 && length <= MAX_CHARACTERS && /\p{Script=Han}/u.test(text)
    && Date.now() >= restUntil && isSupabaseConfigured();
}

/** The audio for a text, with the cache name it is kept under; null when the voice can't provide it now. */
export async function fetchCloudSpeech({ text, voice = 'female', reading }: CloudSpeechRequest): Promise<{ fileName: string; blob: Blob } | null> {
  try {
    const fileName = await speechKey(text, voice, reading);
    const cached = await readCachedAudioBlob(fileName);
    if (cached) return { fileName, blob: cached };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const token = await authService.getAccessToken();
    if (!token) return null;
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, ...(reading ? { reading } : {}) }),
      signal: AbortSignal.timeout(WAIT_MS),
    });
    if (!response.ok) {
      if (response.status === 503 || response.status === 429 || response.status === 404) restUntil = Date.now() + REST_MS;
      return null;
    }
    const blob = await response.blob();
    if (!isUsableAudioBlob(blob)) return null;
    storeAudioBlob(fileName, blob);
    return { fileName, blob };
  } catch { return null; }
}

/**
 * Chinese without a recording: the cloud voice says it (made once, then a stored file). `otherwise` runs when
 * the voice can't provide this text now (signed out, offline, allowance used up, too long).
 */
export function startCloudSpeech(
  request: CloudSpeechRequest,
  audio: HTMLAudioElement | null,
  objectUrls: Map<string, string>,
  rate: number,
  isCurrent: () => boolean,
  setCleanup: (cleanup: () => void) => void,
  finish: () => void,
  otherwise: () => void,
): void {
  if (!audio || !cloudSpeechAvailable(request.text)) { otherwise(); return; }
  void fetchCloudSpeech(request).then((speech) => {
    if (!isCurrent()) return;
    if (!speech) { otherwise(); return; }
    let url = getCachedObjectUrl(objectUrls, speech.fileName);
    if (!url) {
      url = URL.createObjectURL(speech.blob);
      cacheObjectUrl(objectUrls, speech.fileName, url, speech.blob.size, audioBlobCachedAt(speech.blob));
    }
    let failed = false;
    setCleanup(playHtmlAudio(audio, url, rate, finish, () => {
      if (failed || !isCurrent()) return;
      failed = true;
      try { audio.pause(); } catch (e) { debugLogger.warn('Audio', 'Pause on cloud speech failure failed', e); }
      otherwise();
    }, 0));
  });
}

/** Tests start from a voice that has not been refused. */
export function resetCloudSpeech(): void { restUntil = 0; }
