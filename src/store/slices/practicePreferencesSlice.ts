export type PracticePreset = 'comfortable' | 'balanced' | 'sprint' | 'custom';
export type MistakeRepeat = 'off' | 'soon' | 'end';
export type CharacterFont = 'huninn' | 'kai';
export type QuizQuestionType = 'hanzi' | 'pinyin' | 'meaning';
export type QuizChoiceType = 'meaning' | 'hanzi' | 'pinyin';
export type ListeningChoiceType = 'meaning' | 'hanzi' | 'pinyin';
export type TypingPromptType = 'hanzi' | 'meaning';

export interface PracticePreferences {
  preset: PracticePreset;
  pace: number;
  correctDelayMs: number;
  wrongDelayMs: number;
  betweenCardsMs: number;
  flowFrontDelayMs: number;
  flowBackDelayMs: number;
  autoAdvanceCorrect: boolean;
  autoAdvanceWrong: boolean;
  repeatMistakes: MistakeRepeat;
  pronunciationRate: number;
  autoPlayAudio: boolean;
  replayAudioAfterAnswer: boolean;
  speakDefinition: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  hideExamplePinyin: boolean;
  characterFont: CharacterFont;
  quizQuestionType: QuizQuestionType;
  quizChoiceType: QuizChoiceType;
  listeningChoiceType: ListeningChoiceType;
  typingPromptType: TypingPromptType;
}

type PaceTimings = Pick<
  PracticePreferences,
  'correctDelayMs' | 'wrongDelayMs' | 'betweenCardsMs' | 'flowFrontDelayMs' | 'flowBackDelayMs'
>;

const lerp = (slow: number, fast: number, pace: number) =>
  Math.round(slow + (fast - slow) * (Math.min(100, Math.max(0, pace)) / 100));

export function getPaceTimings(pace: number): PaceTimings {
  return {
    correctDelayMs: lerp(400, 100, pace),
    wrongDelayMs: lerp(4200, 1100, pace),
    betweenCardsMs: lerp(200, 30, pace),
    flowFrontDelayMs: lerp(1600, 350, pace),
    flowBackDelayMs: lerp(2400, 650, pace),
  };
}

export function getPaceLabel(pace: number) {
  if (pace < 35) return 'Careful';
  if (pace < 70) return 'Balanced';
  return 'Rapid';
}

const PRESET_PACE: Record<Exclude<PracticePreset, 'custom'>, number> = {
  comfortable: 28,
  balanced: 58,
  sprint: 90,
};

export const DEFAULT_PREFERENCES: PracticePreferences = {
  preset: 'balanced',
  pace: PRESET_PACE.balanced,
  ...getPaceTimings(PRESET_PACE.balanced),
  autoAdvanceCorrect: true,
  autoAdvanceWrong: false,
  repeatMistakes: 'soon',
  pronunciationRate: 1,
  autoPlayAudio: true,
  replayAudioAfterAnswer: true,
  speakDefinition: true,
  showPinyin: true,
  showTranslation: true,
  hideExamplePinyin: true,
  characterFont: 'huninn',
  quizQuestionType: 'hanzi',
  quizChoiceType: 'meaning',
  listeningChoiceType: 'meaning',
  typingPromptType: 'hanzi',
};

export interface PracticePreferencesActions {
  updatePreferences: (preferences: Partial<PracticePreferences>) => void;
  updatePracticePreferences: (preferences: Partial<PracticePreferences>) => void;
  setPace: (pace: number) => void;
  setPracticePace: (pace: number) => void;
  applyPreset: (preset: Exclude<PracticePreset, 'custom'>) => void;
  applyPracticePreset: (preset: Exclude<PracticePreset, 'custom'>) => void;
  resetPreferences: () => void;
  resetPracticePreferences: () => void;
}

export type PracticePreferencesState = PracticePreferences & PracticePreferencesActions;

export const PRACTICE_PREFERENCES_PERSISTED_KEYS = [
  'preset',
  'pace',
  'correctDelayMs',
  'wrongDelayMs',
  'betweenCardsMs',
  'flowFrontDelayMs',
  'flowBackDelayMs',
  'autoAdvanceCorrect',
  'autoAdvanceWrong',
  'repeatMistakes',
  'pronunciationRate',
  'autoPlayAudio',
  'replayAudioAfterAnswer',
  'speakDefinition',
  'showPinyin',
  'showTranslation',
  'hideExamplePinyin',
  'characterFont',
  'quizQuestionType',
  'quizChoiceType',
  'listeningChoiceType',
  'typingPromptType',
] as const;

export const PRACTICE_PREFERENCES_ACCOUNT_SWITCH_DEFAULTS = {};

export function normalizePracticePreferences(persisted: unknown): PracticePreferences {
  const preferences = (
    typeof persisted === 'object' && persisted !== null ? { ...persisted } : {}
  ) as Partial<PracticePreferences> & { focusMode?: boolean; instantChoiceCheck?: boolean };
  delete preferences.focusMode;
  delete preferences.instantChoiceCheck;

  if (preferences.autoAdvanceCorrect === false && preferences.preset && preferences.preset !== 'custom') {
    preferences.autoAdvanceCorrect = true;
  }
  if ((preferences.characterFont as string) === 'sans') {
    preferences.characterFont = 'huninn';
  }
  const pace = typeof preferences.pace === 'number' ? preferences.pace : DEFAULT_PREFERENCES.pace;
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    ...getPaceTimings(pace),
  };
}

type SetState = (
  partial:
    | Partial<PracticePreferencesState>
    | ((state: PracticePreferencesState) => Partial<PracticePreferencesState>),
) => void;

export function createPracticePreferencesSlice(set: SetState): PracticePreferencesState {
  const update = (preferences: Partial<PracticePreferences>) =>
    set((state) => ({
      ...preferences,
      preset: preferences.preset ?? (Object.keys(preferences).some((k) => k === 'pace') ? 'custom' : state.preset),
    }));

  const setPace = (pace: number) =>
    set({ pace, ...getPaceTimings(pace), preset: 'custom' });

  const applyPreset = (preset: Exclude<PracticePreset, 'custom'>) => {
    const pace = PRESET_PACE[preset];
    set({ preset, pace, ...getPaceTimings(pace) });
  };

  const reset = () => set(DEFAULT_PREFERENCES);

  return {
    ...DEFAULT_PREFERENCES,
    updatePreferences: update,
    updatePracticePreferences: update,
    setPace,
    setPracticePace: setPace,
    applyPreset,
    applyPracticePreset: applyPreset,
    resetPreferences: reset,
    resetPracticePreferences: reset,
  };
}

export function selectPracticePreferences(state: PracticePreferences): PracticePreferences {
  return Object.fromEntries(
    PRACTICE_PREFERENCES_PERSISTED_KEYS.map((key) => [key, state[key]]),
  ) as unknown as PracticePreferences;
}
