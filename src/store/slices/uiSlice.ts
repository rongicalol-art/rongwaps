import type {
  PartSegment,
  PracticeHeaderActions,
} from '../../types/models';

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
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
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
    isOverlayOpen: false,
    setIsOverlayOpen: (open) => set({ isOverlayOpen: open }),
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

/** Persisted slices owned by this domain. */
export const UI_PERSISTED_KEYS = [
  'activeBookId',
  'characterPreference',
  'isReviewMode',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const UI_ACCOUNT_SWITCH_DEFAULTS = {};
