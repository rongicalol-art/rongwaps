import type {
  PartSegment,
  PracticeHeaderActions,
} from '../../types/models';

/**
 * In-activity overlays that paint above the practice dock and header. Each one
 * is an independent source its owner registers while open, so two overlays can
 * never close each other on the way out — a single shared boolean made that
 * impossible to express, because the last writer won.
 *
 * The app shell's own overlays (Reading Mode, grammar lesson, dictionary word
 * detail) are not registered here: `App.tsx` derives them from state it owns
 * and passes them to `ActivityModals` as a prop.
 */
export type ActivityOverlaySource = 'character-breakdown' | 'practice-settings';

export interface UiState {
  // App Config
  activeBookId: number;
  setActiveBookId: (id: number) => void;
  characterPreference: 'traditional' | 'simplified';
  setCharacterPreference: (pref: 'traditional' | 'simplified') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // UI State
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  activityOverlaySources: ActivityOverlaySource[];
  setActivityOverlayOpen: (source: ActivityOverlaySource, open: boolean) => void;
  isInteractionActive: boolean;
  setIsInteractionActive: (active: boolean) => void;
  swipeFeedback: { text: string; type: 'learned' | 'review' } | null;
  setSwipeFeedback: (feedback: UiState['swipeFeedback']) => void;
  isReviewMode: boolean;
  setIsReviewMode: (review: boolean) => void;
  activeReviewSessionCards: string[] | null;
  setActiveReviewSessionCards: (cards: string[] | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  librarySearchQuery: string;
  setLibrarySearchQuery: (query: string) => void;
  practiceHeader: {
    progress: number;
    currentIndex: number;
    totalCount: number;
    showLightbulb: boolean;
    partSegments: PartSegment[];
  };
  setPracticeHeader: (state: Partial<UiState['practiceHeader']>) => void;
  practiceHeaderActions: PracticeHeaderActions;
  setPracticeHeaderActions: (actions: Partial<UiState['practiceHeaderActions']>) => void;
}

type SetState = (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void;

export function createUiSlice(set: SetState): UiState {
  return {
    activeBookId: 1,
    setActiveBookId: (id) => set({ activeBookId: id }),
    characterPreference: 'traditional',
    setCharacterPreference: (pref) => set({ characterPreference: pref }),
    isSettingsOpen: false,
    setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),

    isSearchOpen: false,
    setIsSearchOpen: (open) => set({ isSearchOpen: open }),
    activityOverlaySources: [],
    setActivityOverlayOpen: (source, open) => set((state) => {
      const isOpen = state.activityOverlaySources.includes(source);
      if (isOpen === open) return {};
      return {
        activityOverlaySources: open
          ? [...state.activityOverlaySources, source]
          : state.activityOverlaySources.filter((id) => id !== source),
      };
    }),
    isInteractionActive: false,
    setIsInteractionActive: (active) => set({ isInteractionActive: active }),
    swipeFeedback: null,
    setSwipeFeedback: (feedback) => set({ swipeFeedback: feedback }),
    isReviewMode: false,
    setIsReviewMode: (review) => set({ isReviewMode: review }),
    activeReviewSessionCards: null,
    setActiveReviewSessionCards: (cards) => set({ activeReviewSessionCards: cards }),
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    librarySearchQuery: '',
    setLibrarySearchQuery: (query) => set({ librarySearchQuery: query }),
    practiceHeader: { progress: 0, currentIndex: 0, totalCount: 0, showLightbulb: false, partSegments: [] },
    setPracticeHeader: (headerState) => set((state) => ({
      practiceHeader: { ...state.practiceHeader, ...headerState },
    })),
    practiceHeaderActions: {},
    setPracticeHeaderActions: (actions) => set((state) => ({
      practiceHeaderActions: { ...state.practiceHeaderActions, ...actions },
    })),
  };
}

/**
 * True while an in-activity overlay is open. The union is derived here — never
 * stored — so a writer can only ever describe its own source, and one overlay
 * closing cannot clear another that is still open.
 */
export function selectIsActivityOverlayOpen(
  state: Pick<UiState, 'activityOverlaySources'>,
): boolean {
  return state.activityOverlaySources.length > 0;
}

/** Persisted slices owned by this domain. */
export const UI_PERSISTED_KEYS = [
  'activeBookId',
  'characterPreference',
  'isReviewMode',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const UI_ACCOUNT_SWITCH_DEFAULTS = {
  // A pinned review deck's due-set snapshot is session-scoped learner data:
  // it must never survive an account switch.
  activeReviewSessionCards: null,
};
