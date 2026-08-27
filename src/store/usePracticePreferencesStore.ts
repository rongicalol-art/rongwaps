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
    // Snappy rhythm: the next card follows a correct answer almost immediately,
    // with just a quick flash of the correct feedback (≈0.3s at balanced pace).
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

/**
 * Presets are rhythm-only: they tune pace + timings and intentionally leave
 * every other preference (answer behavior, audio, display, session) untouched.
 */
const PRESET_PACE: Record<Exclude<PracticePreset, 'custom'>, number> = {
  comfortable: 28,
  balanced: 58,
  sprint: 90,
};

/** Balanced rhythm plus the product defaults; autoAdvanceCorrect is ON by default. */
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
      ...DEFAULT_PREFERENCES,
      updatePreferences: (preferences) => set({ ...preferences, preset: preferences.preset ?? 'custom' }),
      setPace: (pace) => set({ pace, ...getPaceTimings(pace), preset: 'custom' }),
      applyPreset: (preset) => {
        const pace = PRESET_PACE[preset];
        set({ preset, pace, ...getPaceTimings(pace) });
      },
      resetPreferences: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'rongwaps-practice-preferences',
      version: 5,
      migrate: (persisted) => {
        const preferences = (
          typeof persisted === 'object' && persisted !== null ? { ...persisted } : {}
        ) as Partial<PracticePreferences> & { focusMode?: boolean };
        delete preferences.focusMode;
        // v4: instant checking is always on — the preference is gone.
        delete (preferences as { instantChoiceCheck?: boolean }).instantChoiceCheck;
        // v3: presets became rhythm-only, so they never push auto-advance off again.
        // A stored preset (not 'custom') with auto-advance off was forced by the old
        // preset behavior, not a deliberate choice — restore the default.
        if (preferences.autoAdvanceCorrect === false && preferences.preset && preferences.preset !== 'custom') {
          preferences.autoAdvanceCorrect = true;
        }
        // v5: the rhythm got snappier — re-derive stored timings from the new
        // faster ranges so existing sessions move on quickly after a correct answer.
        const pace = typeof preferences.pace === 'number' ? preferences.pace : DEFAULT_PREFERENCES.pace;
        return {
          ...DEFAULT_PREFERENCES,
          ...preferences,
          ...getPaceTimings(pace),
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
