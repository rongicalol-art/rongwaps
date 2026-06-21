import { create } from 'zustand';

interface UiState {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMainHeaderCompact: boolean;
  setIsMainHeaderCompact: (compact: boolean) => void;
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
  isInteractionActive: boolean;
  setIsInteractionActive: (active: boolean) => void;
  swipeFeedback: { text: string; type: 'learned' | 'review' } | null;
  setSwipeFeedback: (feedback: { text: string; type: 'learned' | 'review' } | null) => void;
  isReviewMode: boolean;
  setIsReviewMode: (review: boolean) => void;
  activeReviewSessionCards: string[] | null;
  setActiveReviewSessionCards: (cards: string[] | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  practiceHeader: {
    progress: number;
    currentIndex: number;
    totalCount: number;
    showLightbulb: boolean;
  };
  setPracticeHeader: (state: Partial<UiState['practiceHeader']>) => void;
  practiceHeaderActions: {
    onLightbulbClick?: () => void;
    onSettingsClick?: () => void;
  };
  setPracticeHeaderActions: (actions: Partial<UiState['practiceHeaderActions']>) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  isMainHeaderCompact: false,
  setIsMainHeaderCompact: (compact) => set({ isMainHeaderCompact: compact }),
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
  practiceHeader: {
    progress: 0,
    currentIndex: 0,
    totalCount: 0,
    showLightbulb: false,
  },
  setPracticeHeader: (headerState) => set((s) => ({
    practiceHeader: { ...s.practiceHeader, ...headerState },
  })),
  practiceHeaderActions: {},
  setPracticeHeaderActions: (actions) => set((s) => ({
    practiceHeaderActions: { ...s.practiceHeaderActions, ...actions },
  })),
  isSettingsOpen: false,
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
}));