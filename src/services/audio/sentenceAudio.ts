import type { SentenceAudio } from '../../types/models';
import { audioService } from '../audioService';

/**
 * A grammar sentence: its book clip, else its approved studio-voice file, else browser
 * speech (Taiwan locale for traditional characters). A clip that won't load falls back too.
 */
export function playSentence(text: string, audio: SentenceAudio | undefined, characters: 'traditional' | 'simplified', rate = 1): Promise<void> {
  const language = characters === 'traditional' ? 'zh-TW' : 'zh-CN';
  if (audio?.start === undefined || audio.end === undefined) return audioService.play(audio?.file, rate, text, language);
  let failed = false;
  return audioService.playRange(audio.file, audio.start, audio.end, {
    rate,
    cacheOnComplete: audio.cache !== false,
    onUnavailable: () => { failed = true; },
  })
    .then(() => (failed ? audioService.play(undefined, rate, text, language) : undefined));
}
