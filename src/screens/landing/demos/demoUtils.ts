import { publicAudioUrl } from '../../../services/audio/audioCache';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { characterReadings } from '../../../utils/pinyin/characterReadings';
import { SAMPLE_WORDS, type SampleWord } from '../sampleWords';

export const shuffle = <T,>(items: readonly T[]): T[] => {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Other words with a different meaning, for wrong answers. */
export const distractors = (word: SampleWord, count: number): SampleWord[] =>
  shuffle(SAMPLE_WORDS.filter((other) => other[2] !== word[2])).slice(0, count);

/** How long an answered round stays on screen before the next one. */
export const NEXT_ROUND_MS = 1300;

let playing: HTMLAudioElement | null = null;

/** The word's real recording (the same files the app plays); silent if it cannot load. */
export function playWord(word: SampleWord | undefined) {
  const url = word && publicAudioUrl(`vocabulary-trimmed/v1/${word[3]}`);
  if (!url) return;
  playing?.pause();
  playing = new Audio(url);
  void playing.play().catch(() => {});
}

let audioIndexPromise: Promise<Map<string, string>> | null = null;

/** Play the individual character's pronunciation clip when tapping a build tile. */
export function playCharacter(char: string, contextWord?: SampleWord) {
  audioIndexPromise ??= getPronunciationAudioIndex().catch(() => new Map());
  void audioIndexPromise.then((index) => {
    let reading: string | undefined;
    if (contextWord && contextWord[0].includes(char)) {
      const aligned = characterReadings(contextWord[0], contextWord[1]);
      const i = aligned?.characters.indexOf(char) ?? -1;
      reading = i >= 0 ? aligned?.readings[i]?.[0] : undefined;
    }
    if (!reading) {
      const match = SAMPLE_WORDS.find(([h]) => h.includes(char));
      if (match) {
        const aligned = characterReadings(match[0], match[1]);
        const i = aligned?.characters.indexOf(char) ?? -1;
        reading = i >= 0 ? aligned?.readings[i]?.[0] : undefined;
      }
    }
    if (!reading) return;
    const clip = index.get(reading);
    if (!clip) return;
    const url = publicAudioUrl(clip);
    if (!url) return;
    playing?.pause();
    playing = new Audio(url);
    void playing.play().catch(() => {});
  });
}
