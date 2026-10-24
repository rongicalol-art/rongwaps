import type { SentenceAudio } from '../../types/models';
import { audioService } from '../audioService';

/**
 * Play a recorded sentence clip or range, falling back to browser speech if it cannot load.
 */
export function playSentence(
  text: string,
  audio: SentenceAudio | undefined,
  characters: 'traditional' | 'simplified',
  rate?: number,
): Promise<void> {
  const language = characters === 'traditional' ? 'zh-TW' : 'zh-CN';
  const effectiveRate = rate ?? audioService.getDefaultRate();
  if (audio?.start === undefined || audio.end === undefined) return audioService.play(audio?.file, effectiveRate, text, language);
  let failed = false;
  return audioService.playRange(audio.file, audio.start, audio.end, {
    rate: effectiveRate,
    cacheOnComplete: audio.cache !== false,
    onUnavailable: () => { failed = true; },
  })
    .then(() => (failed ? audioService.play(undefined, effectiveRate, text, language) : undefined));
}

export interface FlowSentenceOptions {
  /** Speak the English after the recording. */
  speakTranslation: boolean;
  /** Then wait as long as the clip, so it can be repeated aloud. */
  repeatPause: boolean;
  rate?: number;
  isCancelled: () => boolean;
}

/** Shortest repeat-after-me pause, for very short clips. */
const MIN_REPEAT_PAUSE_MS = 1200;

/** Flow's sentence beat (Sentences, flashcard examples): the recording, its English, room to repeat it. */
export async function playFlowSentence(
  text: string,
  audio: SentenceAudio | undefined,
  english: string | undefined,
  characters: 'traditional' | 'simplified',
  options: FlowSentenceOptions,
): Promise<void> {
  await playSentence(text, audio, characters, options.rate).catch(() => {});
  if (options.isCancelled()) return;
  if (options.speakTranslation && english) {
    await audioService.speakText(english, 'en-US', Math.min(options.rate ?? 1, 1.1)).catch(() => {});
    if (options.isCancelled()) return;
  }
  if (options.repeatPause) {
    const clipMs = audio?.start !== undefined && audio.end !== undefined ? (audio.end - audio.start) * 1000 : 0;
    await new Promise((resolve) => window.setTimeout(resolve, Math.max(MIN_REPEAT_PAUSE_MS, clipMs)));
  }
}
