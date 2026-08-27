import type { PracticePreferences } from '../../../store/usePracticePreferencesStore';

export interface PracticeSettingsTabProps {
  preferences: PracticePreferences;
  onChange: (preferences: Partial<PracticePreferences>) => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}
