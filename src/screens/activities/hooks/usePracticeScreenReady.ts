import { useEffect, useState } from 'react';
import type { ActivityType } from '../../../types/models';
import { isPracticeScreenLoaded, loadPracticeScreen, practiceScreenKey } from '../practiceScreens';

/** True once the activity's screen chunk can render synchronously (warm: true on the first render). */
export function usePracticeScreenReady(activity: ActivityType): boolean {
  const key = practiceScreenKey(activity);
  const [, bump] = useState(0);
  const loaded = key === null || isPracticeScreenLoaded(key);
  useEffect(() => {
    if (key === null || loaded) return;
    let live = true;
    void loadPracticeScreen(key).then(() => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [key, loaded]);
  return loaded;
}
