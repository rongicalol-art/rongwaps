import { audioService } from '../../../services/audioService';
import type { ReaderStudyTargetWord } from './readerStudyTargets';

type CharacterPreference = 'traditional' | 'simplified';

/** The spelling to show for the learner's script preference. */
export function studyWordText(word: ReaderStudyTargetWord, script: CharacterPreference): string {
  return script === 'simplified' ? word.simplified || word.traditional : word.traditional;
}

/** Plays the word's recording, falling back to speech when it has none. */
export function playStudyWord(word: ReaderStudyTargetWord, script: CharacterPreference): void {
  void audioService.play(word.audio, undefined, studyWordText(word, script), script === 'simplified' ? 'zh-CN' : 'zh-TW');
}
