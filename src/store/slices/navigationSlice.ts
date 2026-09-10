import type { ActivityType, LessonPartSelectionMap, QuizMode } from '../../types/models';

export interface NavigationState {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  setActiveTab: (tab: NavigationState['activeTab']) => void;
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;
  activeQuizMode: QuizMode | null;
  setActiveQuizMode: (mode: QuizMode | null) => void;
  selectedBooks: number[];
  setSelectedBooks: (books: number[] | ((prev: number[]) => number[])) => void;
  selectedLessonParts: LessonPartSelectionMap;
  setSelectedLessonParts: (
    parts: LessonPartSelectionMap | ((prev: LessonPartSelectionMap) => LessonPartSelectionMap)
  ) => void;
}

type SetState = (partial: Partial<NavigationState> | ((state: NavigationState) => Partial<NavigationState>)) => void;

export function createNavigationSlice(set: SetState): NavigationState {
  return {
    activeTab: 'path',
    setActiveTab: (tab) => set({ activeTab: tab }),
    activeActivity: null,
    setActiveActivity: (activity) => set({ activeActivity: activity }),
    activeQuizMode: null,
    setActiveQuizMode: (mode) => set({ activeQuizMode: mode }),
    selectedBooks: [],
    setSelectedBooks: (books) => set((state) => ({
      selectedBooks: typeof books === 'function' ? books(state.selectedBooks) : books,
    })),
    selectedLessonParts: {},
    setSelectedLessonParts: (parts) => set((state) => ({
      selectedLessonParts: typeof parts === 'function'
        ? parts(state.selectedLessonParts)
        : parts,
    })),
  };
}

/** Persisted slices owned by this domain. */
export const NAVIGATION_PERSISTED_KEYS = [
  'activeTab',
  'activeActivity',
  'activeQuizMode',
  'selectedBooks',
  'selectedLessonParts',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const NAVIGATION_ACCOUNT_SWITCH_DEFAULTS = {
  activeActivity: null,
  selectedBooks: [],
  selectedLessonParts: {},
};
