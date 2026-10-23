import { useEffect, useState } from 'react';
import type { CurriculumLibrary } from '../../screens/curriculum';
import type { LibraryScreen } from '../../screens/library';
import type { PlayScreen } from '../../screens/play';
import type { ProfileScreen } from '../../screens/profile';
import type { SearchScreen } from '../../screens/search';

/**
 * Tab screens are code-split but not rendered through `React.lazy` (it suspends one tick even
 * with a cached chunk). `TabScreens` waits for `useTabScreenReady` under the open-phase rule,
 * then reads the component synchronously from here.
 */
interface TabScreenMap {
  path: typeof CurriculumLibrary;
  search: typeof SearchScreen;
  library: typeof LibraryScreen;
  profile: typeof ProfileScreen;
  play: typeof PlayScreen;
}
export type TabScreenKey = keyof TabScreenMap;

const loaders: { [K in TabScreenKey]: () => Promise<TabScreenMap[K]> } = {
  path: () => import('../../screens/curriculum').then((m) => m.CurriculumLibrary),
  search: () => import('../../screens/search').then((m) => m.SearchScreen),
  library: () => import('../../screens/library').then((m) => m.LibraryScreen),
  profile: () => import('../../screens/profile').then((m) => m.ProfileScreen),
  play: () => import('../../screens/play').then((m) => m.PlayScreen),
};

const loaded: { [K in TabScreenKey]?: TabScreenMap[K] } = {};
const pending: { [K in TabScreenKey]?: Promise<void> } = {};

function isTabKey(tab: string): tab is TabScreenKey {
  return tab in loaders;
}

export function prefetchTabScreen(tab: string): Promise<void> {
  if (!isTabKey(tab)) return Promise.resolve();
  pending[tab] ??= (loaders[tab]() as Promise<TabScreenMap[TabScreenKey]>).then((component) => {
    (loaded as Record<TabScreenKey, unknown>)[tab] = component;
  });
  return pending[tab];
}

export function getTabScreen<K extends TabScreenKey>(tab: K): TabScreenMap[K] | null {
  return (loaded[tab] as TabScreenMap[K] | undefined) ?? null;
}

/** True once the tab's chunk can render synchronously (warm: true on the first render). */
export function useTabScreenReady(tab: string): boolean {
  const [, bump] = useState(0);
  const ready = !isTabKey(tab) || tab in loaded;
  useEffect(() => {
    if (ready) return;
    let live = true;
    void prefetchTabScreen(tab).then(() => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [tab, ready]);
  return ready;
}
