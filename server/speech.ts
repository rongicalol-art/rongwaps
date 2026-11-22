import type { AudioStore, Context } from './env';
import { normalizeSpeechText, speechKey, type SpeechVoice } from '../shared/speechKey';
import { json, PRIVATE, readJson } from './respond';

/**
 * The cloud voice for Chinese text that has no recording (docs/API_SPEC.md). Each text is made once by Azure
 * Speech, stored under a name derived from the text, and served from storage ever after, so the free monthly
 * allowance is spent only on text nobody has asked for before.
 */
const VOICES: Record<SpeechVoice, string> = { female: 'zh-TW-HsiaoChenNeural', male: 'zh-TW-YunJheNeural' };
export const MAX_SPEECH_CHARACTERS = 80;
const MAX_AUDIO_BYTES = 1024 * 1024;
const HAN = /\p{Script=Han}/u;
const SPEAKABLE = /^[\p{Script=Han}\p{P}\p{N}\p{Zs}A-Za-z]+$/u;
const BOPOMOFO_SYLLABLE = /^[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?$/u;

export interface SpeechRequest { text: string; voice: SpeechVoice; reading?: string }

/** The request as the server will use it, or null when it is not something to speak. */
export function parseSpeechRequest(body: unknown): SpeechRequest | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as { text?: unknown; voice?: unknown; reading?: unknown };
  if (typeof input.text !== 'string') return null;
  const text = normalizeSpeechText(input.text);
  const length = Array.from(text).length;
  if (!length || length > MAX_SPEECH_CHARACTERS || !HAN.test(text) || !SPEAKABLE.test(text)) return null;
  const voice = input.voice === undefined ? 'female' : input.voice;
  if (voice !== 'female' && voice !== 'male') return null;
  if (input.reading === undefined) return { text, voice };
  // A reading is one Bopomofo syllable per character of a word written only in characters.
  if (typeof input.reading !== 'string' || !/^\p{Script=Han}+$/u.test(text)) return null;
  const syllables = input.reading.split(' ');
  if (syllables.length !== length || !syllables.every((syllable) => BOPOMOFO_SYLLABLE.test(syllable))) return null;
  return { text, voice, reading: input.reading };
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function speechMarkup({ text, voice, reading }: SpeechRequest): string {
  const spoken = reading ? `<phoneme alphabet="sapi" ph="${escapeXml(reading)}">${escapeXml(text)}</phoneme>` : escapeXml(text);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW"><voice name="${VOICES[voice]}">${spoken}</voice></speak>`;
}

const audio = (body: ArrayBuffer | ReadableStream, source: 'stored' | 'new') => new Response(body, {
  headers: { 'Content-Type': 'audio/mpeg', 'X-Speech-Source': source, ...PRIVATE },
});

/**
 * New clips one learner may have made in a day (UTC). Stored clips are free and unlimited; only text nobody
 * asked for before spends the monthly allowance, and without this one account could spend all of it in hours.
 */
export const MAX_NEW_CLIPS_A_DAY = 200;
const madeTodayKey = (userId: string) => `limits/${new Date().toISOString().slice(0, 10)}/${userId}`;

async function madeToday(store: AudioStore, userId: string): Promise<number> {
  const saved = await store.get(madeTodayKey(userId));
  return saved ? Number(await new Response(saved.body).text()) || 0 : 0;
}

export async function speak(context: Context, request: Request, userId?: string): Promise<Response> {
  const { env } = context;
  const wanted = parseSpeechRequest(await readJson(request, 2048));
  if (!wanted) return json({ error: 'Nothing to speak.' }, 400, PRIVATE);
  const key = await speechKey(wanted.text, wanted.voice, wanted.reading);
  try {
    const stored = await env.SPEECH_AUDIO?.get(key);
    if (stored) return audio(stored.body, 'stored');
  } catch (error: unknown) { context.report(error, 'speech-read'); }

  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) return json({ error: 'The voice is not set up.' }, 503, PRIVATE);
  // A count that cannot be read never locks the voice: the monthly allowance is still the outer limit.
  let made = 0;
  if (userId && env.SPEECH_AUDIO) {
    try { made = await madeToday(env.SPEECH_AUDIO, userId); } catch (error: unknown) { context.report(error, 'speech-count'); }
    if (made >= MAX_NEW_CLIPS_A_DAY) return json({ error: 'The voice is unavailable right now.' }, 503, PRIVATE);
  }
  let answer: Response;
  try {
    answer = await fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'rons-mandarin',
      },
      body: speechMarkup(wanted),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error: unknown) {
    context.report(error, 'speech-make');
    return json({ error: 'The voice is unavailable right now.' }, 502, PRIVATE);
  }
  if (!answer.ok) {
    // 429 is the monthly allowance or the per-minute cap: expected, and the app falls back to the device voice.
    if (answer.status !== 429) context.report(new Error(`Azure Speech answered ${answer.status}`), 'speech-make');
    return json({ error: 'The voice is unavailable right now.' }, answer.status === 429 ? 503 : 502, PRIVATE);
  }
  const bytes = await answer.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_AUDIO_BYTES) return json({ error: 'The voice is unavailable right now.' }, 502, PRIVATE);
  try {
    await env.SPEECH_AUDIO?.put(key, bytes, { httpMetadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' } });
    if (userId) await env.SPEECH_AUDIO?.put(madeTodayKey(userId), new TextEncoder().encode(String(made + 1)).buffer as ArrayBuffer);
  } catch (error: unknown) { context.report(error, 'speech-store'); }
  return audio(bytes, 'new');
}
