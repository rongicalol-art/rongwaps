import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appendUniqueId } from '../utils/lessonProgress';

interface ReadingLessonStoreState {
  startedPartIds: string[];
  completedPartIds: string[];
  savedIntroductions: Record<string, string>;
  startPart: (partId: string) => void;
  completePart: (partId: string, introduction: string) => void;
  resetProgress: () => void;
}

export const useReadingLessonStore = create<ReadingLessonStoreState>()(
  persist(
    (set) => ({
      startedPartIds: [],
      completedPartIds: [],
      savedIntroductions: {},
      startPart: (partId) => set((state) => ({
        startedPartIds: appendUniqueId(state.startedPartIds, partId),
      })),
      completePart: (partId, introduction) => set((state) => ({
        completedPartIds: appendUniqueId(state.completedPartIds, partId),
        savedIntroductions: { ...state.savedIntroductions, [partId]: introduction },
      })),
      resetProgress: () => set({
        startedPartIds: [],
        completedPartIds: [],
        savedIntroductions: {},
      }),
    }),
    {
      name: 'rongwaps-reading-lesson-progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
