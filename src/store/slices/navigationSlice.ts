import type { ActivityType, LessonPartSelectionMap, QuizMode } from '../../types/models';

export type PracticeContext = 'lesson' | 'independent';

export interface NavigationState {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  setActiveTab: (tab: NavigationState['activeTab']) => void;
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType, context?: PracticeContext) => void;
  /** Launch origin survives reloads and switches between practice modes. */
  practiceContext: PracticeContext | null;
  activeQuizMode: QuizMode | null;
  setActiveQuizMode: (mode: QuizMode | null) => void;
  selectedBooks: number[];
  setSelectedBooks: (books: number[] | ((prev: number[]) => number[])) => void;
  selectedLessonParts: LessonPartSelectionMap;
  setSelectedLessonParts: (
    parts: LessonPartSelectionMap | ((prev: LessonPartSelectionMap) => LessonPartSelectionMap)
  ) => void;
  /** Last lesson the learner opened, per book id (drives the Books highlight). */
  lastOpenedLessons: Record<number, number>;
  setLastOpenedLesson: (bookId: number, lessonId: number) => void;
}

type SetState = (partial: Partial<NavigationState> | ((state: NavigationState) => Partial<NavigationState>)) => void;

export function createNavigationSlice(set: SetState): NavigationState {
  return {
    activeTab: 'path',
    setActiveTab: (tab) => set({ activeTab: tab }),
    activeActivity: null,
    practiceContext: null,
    setActiveActivity: (activity, context) => set((state) => ({
      activeActivity: activity,
      practiceContext: !activity || activity === 'create-card' ? null
        : activity === 'flashcards-library' || activity === 'flashcards-review' ? 'independent'
        : context ?? (state.activeActivity ? state.practiceContext : null) ?? 'independent',
    })),
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
    lastOpenedLessons: {},
    setLastOpenedLesson: (bookId, lessonId) => set((state) => ({
      lastOpenedLessons: { ...state.lastOpenedLessons, [bookId]: lessonId },
    })),
  };
}

/** Persisted slices owned by this domain. */
export const NAVIGATION_PERSISTED_KEYS = [
  'activeTab',
  'activeActivity',
  'practiceContext',
  'activeQuizMode',
  'selectedBooks',
  'selectedLessonParts',
  'lastOpenedLessons',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const NAVIGATION_ACCOUNT_SWITCH_DEFAULTS = {
  activeActivity: null,
  practiceContext: null,
  selectedBooks: [],
  selectedLessonParts: {},
  lastOpenedLessons: {},
};
