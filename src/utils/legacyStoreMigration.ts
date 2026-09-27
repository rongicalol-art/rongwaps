import { normalizePracticePreferences } from '../store/slices/practicePreferencesSlice';

export const LEGACY_GRAMMAR_STORE_KEY = 'rongwaps-grammar-lesson-progress';
export const LEGACY_PRACTICE_PREFERENCES_KEY = 'rongwaps-practice-preferences';

interface LegacyZustandPayload<T> {
  state?: T;
  version?: number;
}

/**
 * Migrates data from the two legacy standalone localStorage stores:
 *   - 'rongwaps-grammar-lesson-progress'
 *   - 'rongwaps-practice-preferences'
 * into the unified useAppStore state object.
 */
export function migrateLegacyStores(
  targetState: Record<string, unknown>,
  getLocalStorageItem: (key: string) => string | null = (k) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  },
): boolean {
  let migrated = false;

  // 1. Grammar progress migration
  const hasGrammarProgress =
    (Array.isArray(targetState.startedPartIds) && targetState.startedPartIds.length > 0) ||
    (Array.isArray(targetState.completedPageIds) && targetState.completedPageIds.length > 0) ||
    (Array.isArray(targetState.completedPartIds) && targetState.completedPartIds.length > 0);

  if (!hasGrammarProgress) {
    const rawGrammar = getLocalStorageItem(LEGACY_GRAMMAR_STORE_KEY);
    if (rawGrammar) {
      try {
        const parsed = JSON.parse(rawGrammar) as LegacyZustandPayload<{
          startedPartIds?: string[];
          completedPageIds?: string[];
          completedPartIds?: string[];
        }>;
        if (parsed?.state) {
          if (Array.isArray(parsed.state.startedPartIds)) {
            targetState.startedPartIds = parsed.state.startedPartIds;
          }
          if (Array.isArray(parsed.state.completedPageIds)) {
            targetState.completedPageIds = parsed.state.completedPageIds;
          }
          if (Array.isArray(parsed.state.completedPartIds)) {
            targetState.completedPartIds = parsed.state.completedPartIds;
          }
          migrated = true;
        }
      } catch {
        // Corrupted legacy storage: ignore gracefully
      }
    }
  }

  // 2. Practice preferences migration
  if (targetState.preset === undefined) {
    const rawPrefs = getLocalStorageItem(LEGACY_PRACTICE_PREFERENCES_KEY);
    if (rawPrefs) {
      try {
        const parsed = JSON.parse(rawPrefs) as LegacyZustandPayload<Record<string, unknown>>;
        if (parsed?.state) {
          const normalized = normalizePracticePreferences(parsed.state);
          Object.assign(targetState, normalized);
          migrated = true;
        }
      } catch {
        // Corrupted legacy storage: ignore gracefully
      }
    }
  }

  return migrated;
}
