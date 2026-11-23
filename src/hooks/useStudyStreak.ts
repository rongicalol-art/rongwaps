import { useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { computeStreak } from '../utils/srs/profileStats';
import { studyTimes } from '../utils/srs/reviewEvents';

export interface StudyStreak {
  /** Days in a row with study, counting today only once something was studied today. */
  streak: number;
  studiedToday: boolean;
}

/**
 * The learner's study streak for workspace chrome (the Learn header). Same rule as Profile
 * (`computeStreak`): any review event counts. Paused while a practice window is open, so a card
 * swipe doesn't re-render the screen underneath; it catches up when the window closes.
 */
export function useStudyStreak(): StudyStreak {
  const events = useAppStore((state) => (state.activeActivity ? null : state.reviewEvents));
  const archive = useAppStore((state) => (state.activeActivity ? null : state.reviewArchive));
  const stableRef = useRef<StudyStreak | null>(null);
  // The day changes at midnight: recompute when a minute has passed, not on every render.
  const minute = Math.floor(Date.now() / 60_000);
  const fresh = useMemo(() => {
    if (events === null || archive === null) return null;
    return streakOf(events, archive);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `minute` is the clock input
  }, [events, archive, minute]);
  const stable = stableRef.current;
  if (fresh && (!stable || fresh.streak !== stable.streak || fresh.studiedToday !== stable.studiedToday)) {
    stableRef.current = fresh;
  } else if (!stable) {
    const store = useAppStore.getState();
    stableRef.current = streakOf(store.reviewEvents, store.reviewArchive);
  }
  return stableRef.current as StudyStreak;
}

function streakOf(...[events, archive]: Parameters<typeof studyTimes>): StudyStreak {
  const { streak, studiedToday } = computeStreak(studyTimes(events, archive), Date.now());
  return { streak, studiedToday };
}
