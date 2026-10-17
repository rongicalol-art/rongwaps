import type { MutableRefObject } from 'react';
import type { GrammarWordToken, PracticeItem, PracticeSentence, PracticeText } from '../../types/models';

export type PracticeScript = 'traditional' | 'simplified';
export type PracticeStatus = 'idle' | 'correct' | 'wrong';

export interface PracticeResult {
  correct: boolean;
  title?: string;
  note?: string;
  sentence?: PracticeSentence;
}

/** What every exercise kind receives. The view owns the dock; the exercise owns its sentence and its word bank. */
export interface PracticeExerciseProps<T extends PracticeItem = PracticeItem> {
  item: T;
  script: PracticeScript;
  status: PracticeStatus;
  /** Increments when the learner taps Try again: wrong words go back to the dock. */
  retryKey: number;
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
  /** A panel (book page, dictionary, notes) is open on top: ignore key shortcuts. */
  shortcutsDisabled: boolean;
  /** The dock's word-bank area: the exercise portals its tiles here. */
  trayHost: HTMLElement | null;
  /** The answer is complete, so the dock offers Check. */
  onReadyChange: (ready: boolean) => void;
  /** Set to this exercise's check; the dock's Check calls it. */
  checkRef: MutableRefObject<(() => void) | null>;
  onResult: (result: PracticeResult) => void;
}

export const textIn = (text: PracticeText, script: PracticeScript) =>
  (script === 'simplified' && text.simplified ? text.simplified : text.traditional);
