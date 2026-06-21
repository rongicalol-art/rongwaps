import { create } from 'zustand';

interface NavigationState {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  setActiveTab: (tab: 'path' | 'search' | 'library' | 'profile') => void;
  activeActivity: 'flashcards' | 'flashcards-review' | 'flashcards-library' | 'listening' | 'quiz' | 'writing' | 'create-card' | 'personal-vocab' | null;
  setActiveActivity: (activity: 'flashcards' | 'flashcards-review' | 'flashcards-library' | 'listening' | 'quiz' | 'writing' | 'create-card' | 'personal-vocab' | null) => void;
  selectedLessons: number[];
  setSelectedLessons: (lessons: number[] | ((prev: number[]) => number[])) => void;
  selectedBooks: number[];
  setSelectedBooks: (books: number[] | ((prev: number[]) => number[])) => void;
}

export const useNavigationStore = create<NavigationState>()((set) => ({
  activeTab: 'path',
  setActiveTab: (tab) => set({ activeTab: tab }),
  activeActivity: null,
  setActiveActivity: (activity) => set({ activeActivity: activity }),
  selectedLessons: [],
  setSelectedLessons: (lessons) => set((state) => ({
    selectedLessons: typeof lessons === 'function' ? lessons(state.selectedLessons) : lessons,
  })),
  selectedBooks: [],
  setSelectedBooks: (books) => set((state) => ({
    selectedBooks: typeof books === 'function' ? books(state.selectedBooks) : books,
  })),
}));