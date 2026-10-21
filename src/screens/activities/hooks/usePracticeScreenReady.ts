import { useEffect, useState } from 'react';
import type { ActivityType } from '../../../types/models';
import { isPracticeScreenLoaded, loadPracticeScreen, practiceScreenKey } from '../practiceScreens';

/** A failed chunk always offers retry instead of an indefinitely spinning loader. */
export function usePracticeScreenReady(activity: ActivityType) {
  const key = practiceScreenKey(activity);
  const [, bump] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const loaded = key === null || isPracticeScreenLoaded(key);
  useEffect(() => {
    if (key === null || loaded) return;
    let live = true;
    const timer = window.setTimeout(() => { if (live) setFailure({ key, message: 'Study screen could not load.' }); }, 20_000);
    void loadPracticeScreen(key).then(() => { if (live) bump((n) => n + 1); })
      .catch(() => { if (live) setFailure({ key, message: 'Study screen could not load.' }); })
      .finally(() => window.clearTimeout(timer));
    return () => { live = false; window.clearTimeout(timer); };
  }, [key, loaded, attempt]);
  return { ready: loaded, error: failure?.key === key && !loaded ? failure.message : null,
    retry: () => { setFailure(null); setAttempt((value) => value + 1); } };
}
