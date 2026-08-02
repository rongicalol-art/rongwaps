import type {
  PracticePreferences,
  PracticePreset,
} from '../../../store/usePracticePreferencesStore';

export interface PracticeSettingsTabProps {
  preferences: PracticePreferences;
  onChange: (preferences: Partial<PracticePreferences>) => void;
  onPaceChange: (pace: number) => void;
  onApplyPreset: (preset: Exclude<PracticePreset, 'custom'>) => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}
