import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PracticePreset = 'comfortable' | 'balanced' | 'sprint' | 'custom';
export type MistakeRepeat = 'off' | 'soon' | 'end';

export interface PracticePreferences {
  preset: PracticePreset;
  pace: number;
  correctDelayMs: number;
  wrongDelayMs: number;
  betweenCardsMs: number;
  flowFrontDelayMs: number;
  flowBackDelayMs: number;
  instantChoiceCheck: boolean;
  autoAdvanceCorrect: boolean;
  autoAdvanceWrong: boolean;
  repeatMistakes: MistakeRepeat;
  pronunciationRate: number;
  autoPlayAudio: boolean;
  replayAudioAfterAnswer: boolean;
  speakDefinition: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
}

type PaceTimings = Pick<
  PracticePreferences,
  'correctDelayMs' | 'wrongDelayMs' | 'betweenCardsMs' | 'flowFrontDelayMs' | 'flowBackDelayMs'
>;

const lerp = (slow: number, fast: number, pace: number) =>
  Math.round(slow + (fast - slow) * (Math.min(100, Math.max(0, pace)) / 100));

export function getPaceTimings(pace: number): PaceTimings {
  return {
    correctDelayMs: lerp(1400, 250, pace),
    wrongDelayMs: lerp(4200, 1100, pace),
    betweenCardsMs: lerp(800, 50, pace),
    flowFrontDelayMs: lerp(1600, 350, pace),
    flowBackDelayMs: lerp(2400, 650, pace),
  };
}

export function getPaceLabel(pace: number) {
  if (pace < 35) return 'Careful';
  if (pace < 70) return 'Balanced';
  return 'Rapid';
}

const comfortablePace = 28;
const balancedPace = 58;
const sprintPace = 90;

export const PRACTICE_PRESETS: Record<Exclude<PracticePreset, 'custom'>, PracticePreferences> = {
  comfortable: {
    preset: 'comfortable',
    pace: comfortablePace,
    ...getPaceTimings(comfortablePace),
    instantChoiceCheck: false,
    autoAdvanceCorrect: false,
    autoAdvanceWrong: false,
    repeatMistakes: 'end',
    pronunciationRate: 0.9,
    autoPlayAudio: true,
    replayAudioAfterAnswer: true,
    speakDefinition: true,
    showPinyin: true,
    showTranslation: true,
  },
  balanced: {
    preset: 'balanced',
    pace: balancedPace,
    ...getPaceTimings(balancedPace),
    instantChoiceCheck: true,
    autoAdvanceCorrect: true,
    autoAdvanceWrong: false,
    repeatMistakes: 'soon',
    pronunciationRate: 1,
    autoPlayAudio: true,
    replayAudioAfterAnswer: true,
    speakDefinition: true,
    showPinyin: true,
    showTranslation: true,
  },
  sprint: {
    preset: 'sprint',
    pace: sprintPace,
    ...getPaceTimings(sprintPace),
    instantChoiceCheck: true,
    autoAdvanceCorrect: true,
    autoAdvanceWrong: true,
    repeatMistakes: 'end',
    pronunciationRate: 1.2,
    autoPlayAudio: true,
    replayAudioAfterAnswer: false,
    speakDefinition: false,
    showPinyin: false,
    showTranslation: true,
  },
};

interface PracticePreferencesState extends PracticePreferences {
  updatePreferences: (preferences: Partial<PracticePreferences>) => void;
  setPace: (pace: number) => void;
  applyPreset: (preset: Exclude<PracticePreset, 'custom'>) => void;
  resetPreferences: () => void;
}

const persistedKeys: Array<keyof PracticePreferences> = [
  'preset',
  'pace',
  'correctDelayMs',
  'wrongDelayMs',
  'betweenCardsMs',
  'flowFrontDelayMs',
  'flowBackDelayMs',
  'instantChoiceCheck',
  'autoAdvanceCorrect',
  'autoAdvanceWrong',
  'repeatMistakes',
  'pronunciationRate',
  'autoPlayAudio',
  'replayAudioAfterAnswer',
  'speakDefinition',
  'showPinyin',
  'showTranslation',
];

export const usePracticePreferencesStore = create<PracticePreferencesState>()(
  persist(
    (set) => ({
      ...PRACTICE_PRESETS.balanced,
      updatePreferences: (preferences) => set({ ...preferences, preset: preferences.preset ?? 'custom' }),
      setPace: (pace) => set({ pace, ...getPaceTimings(pace), preset: 'custom' }),
      applyPreset: (preset) => set(PRACTICE_PRESETS[preset]),
      resetPreferences: () => set(PRACTICE_PRESETS.balanced),
    }),
    {
      name: 'rongwaps-practice-preferences',
      version: 2,
      migrate: (persisted) => {
        const preferences = (
          typeof persisted === 'object' && persisted !== null ? { ...persisted } : {}
        ) as Partial<PracticePreferences> & { focusMode?: boolean };
        delete preferences.focusMode;
        return {
          ...PRACTICE_PRESETS.balanced,
          ...preferences,
        } as PracticePreferencesState;
      },
      partialize: (state) => Object.fromEntries(
        persistedKeys.map((key) => [key, state[key]]),
      ) as unknown as PracticePreferencesState,
    },
  ),
);

export function selectPracticePreferences(state: PracticePreferencesState): PracticePreferences {
  return Object.fromEntries(persistedKeys.map((key) => [key, state[key]])) as unknown as PracticePreferences;
}
