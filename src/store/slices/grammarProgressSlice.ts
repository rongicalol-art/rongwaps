import { appendUniqueId } from '../../utils/lessonProgress';

export interface GrammarProgressState {
  startedPartIds: string[];
  completedPageIds: string[];
  completedPartIds: string[];
  markPartStarted: (partId: string) => void;
  markPageComplete: (pageId: string) => void;
  markPartComplete: (partId: string) => void;
  resetGrammarPage: (pageId: string) => void;
  resetGrammarProgress: () => void;
}

type SetState = (
  partial:
    | Partial<GrammarProgressState>
    | ((state: GrammarProgressState) => Partial<GrammarProgressState>),
) => void;

export function createGrammarProgressSlice(set: SetState): GrammarProgressState {
  return {
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
    resetGrammarPage: (pageId) => set((state) => ({
      completedPageIds: state.completedPageIds.filter((id) => id !== pageId),
    })),
    resetGrammarProgress: () => set({
      startedPartIds: [],
      completedPageIds: [],
      completedPartIds: [],
    }),
  };
}

export const GRAMMAR_PROGRESS_PERSISTED_KEYS = [
  'startedPartIds',
  'completedPageIds',
  'completedPartIds',
] as const;

export const GRAMMAR_PROGRESS_ACCOUNT_SWITCH_DEFAULTS = {
  startedPartIds: [],
  completedPageIds: [],
  completedPartIds: [],
};
