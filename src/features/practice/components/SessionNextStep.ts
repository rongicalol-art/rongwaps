import { createContext, useContext } from 'react';
import type { PlayfulNavIconName } from '../../../lib/widgets';

/** One fitting next activity the end screen offers above Continue (e.g. practise sentences, practise tones). */
export interface SessionNextStep {
  icon: PlayfulNavIconName;
  title: string;
  /** What it is, in a few words. */
  line: string;
  onSelect: () => void;
}

const SessionNextStepContext = createContext<SessionNextStep | null>(null);

/** The practice window provides it for lesson sessions; the quiz's Session complete shows it. */
export const SessionNextStepProvider = SessionNextStepContext.Provider;

export function useSessionNextStep(): SessionNextStep | null {
  return useContext(SessionNextStepContext);
}
