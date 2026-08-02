import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appendUniqueId } from '../utils/lessonProgress';

interface GrammarLessonStoreState {
  startedPartIds: string[];
  completedPageIds: string[];
  completedPartIds: string[];
  markPartStarted: (partId: string) => void;
  markPageComplete: (pageId: string) => void;
  markPartComplete: (partId: string) => void;
  resetPage: (pageId: string) => void;
  resetProgress: () => void;
}

export const useGrammarLessonStore = create<GrammarLessonStoreState>()(
  persist(
    (set) => ({
      startedPartIds: [],
      completedPageIds: [],
      completedPartIds: [],
      markPartStarted: (partId) => set((state) => ({
        startedPartIds: appendUniqueId(state.startedPartIds, partId),
      })),
      markPageComplete: (pageId) => set((state) => ({
        completedPageIds: appendUniqueId(state.completedPageIds, pageId),
      })),
      markPartComplete: (partId) => set((state) => ({
        completedPartIds: appendUniqueId(state.completedPartIds, partId),
      })),
      resetPage: (pageId) => set((state) => ({
        completedPageIds: state.completedPageIds.filter((id) => id !== pageId),
      })),
      resetProgress: () => set({
        startedPartIds: [],
        completedPageIds: [],
        completedPartIds: [],
      }),
    }),
    {
      name: 'rongwaps-grammar-lesson-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
