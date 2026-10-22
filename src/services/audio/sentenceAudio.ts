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
