import type { PracticeResult, PracticeStatus } from './practiceTypes';

/** One item's place in the exercise: what the learner left it at. */
export interface PracticeStep {
  status: PracticeStatus;
  result: PracticeResult | null;
  ready: boolean;
  /** Check pressed, result not in yet. */
  checking: boolean;
  /** Increments on Try again: wrong words go back to the bank. */
  retryKey: number;
}

export interface PracticeSteps {
  index: number;
  /** Items opened so far, in the order first seen. They stay mounted, so going back shows them as left. */
  visited: number[];
  steps: Record<number, PracticeStep>;
}

export type PracticeStepAction =
  | { type: 'forward' }
  | { type: 'back' }
  | { type: 'ready'; index: number; ready: boolean }
  | { type: 'check' }
  | { type: 'result'; index: number; result: PracticeResult }
  | { type: 'retry' };

const FRESH: PracticeStep = { status: 'idle', result: null, ready: false, checking: false, retryKey: 0 };

export const stepAt = (state: PracticeSteps, index = state.index): PracticeStep => state.steps[index] ?? FRESH;

export function startSteps(initialIndex = 0): PracticeSteps {
  return { index: initialIndex, visited: [initialIndex], steps: {} };
}

const open = (state: PracticeSteps, index: number): PracticeSteps => ({
  ...state,
  index,
  visited: state.visited.includes(index) ? state.visited : [...state.visited, index],
});
const patch = (state: PracticeSteps, index: number, change: Partial<PracticeStep>): PracticeSteps => ({
  ...state,
  steps: { ...state.steps, [index]: { ...stepAt(state, index), ...change } },
});

/**
 * Moving between items never changes an item's answer or result: an answered item stays answered (locked),
 * a skipped one stays as left. The caller ends the exercise when `forward` is pressed on the last item.
 */
export function practiceStepsReducer(state: PracticeSteps, action: PracticeStepAction): PracticeSteps {
  const current = stepAt(state);
  switch (action.type) {
    case 'forward':
      return current.checking ? state : open(state, state.index + 1);
    case 'back':
      return state.index === 0 || current.checking ? state : open(state, state.index - 1);
    case 'ready':
      return stepAt(state, action.index).ready === action.ready ? state : patch(state, action.index, { ready: action.ready });
    case 'check':
      return current.status !== 'idle' || !current.ready ? state : patch(state, state.index, { checking: true });
    case 'result': {
      // An answered item is final: a late or repeated result never re-scores it.
      if (stepAt(state, action.index).status === 'correct') return state;
      return patch(state, action.index, { checking: false, result: action.result, status: action.result.correct ? 'correct' : 'wrong' });
    }
    case 'retry':
      return current.status !== 'wrong' ? state : patch(state, state.index, { status: 'idle', result: null, retryKey: current.retryKey + 1 });
  }
}
