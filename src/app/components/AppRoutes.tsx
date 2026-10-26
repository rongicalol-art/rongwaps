import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useMatch } from 'react-router';
import { LoadingScreen } from '../../lib/widgets';
import { TAB_ROUTES, type TabRoute } from '../routes';
import { TabScreens } from './TabScreens';

const JoinFolderScreen = lazy(() => import('../../screens/join-folder').then((m) => ({ default: m.JoinFolderScreen })));

type TabScreensProps = React.ComponentProps<typeof TabScreens>;

interface AppRoutesProps extends Omit<TabScreensProps, 'activeTab'> {
  /** Persisted tab, used by the catch-all redirect for unknown URLs. */
  activeTab: string;
}

/**
 * Top-level workspace routes. '/' renders the persisted tab (boot restore
 * keeps working) and the catch-all sends unknown URLs to it too.
 */
export function AppRoutes({ activeTab, ...tabScreenProps }: AppRoutesProps) {
  const joinFolderMatch = useMatch('/join/:code');
  // A persisted tab that is no longer routed (e.g. hidden Play) boots Books.
  const bootTab = activeTab in TAB_ROUTES ? activeTab : 'path';
  if (joinFolderMatch) return <Suspense fallback={<LoadingScreen message="Opening folder invite…" />}>
    <JoinFolderScreen code={joinFolderMatch.params.code ?? ''} />
  </Suspense>;
  return (
    <Routes>
      <Route index element={<TabScreens activeTab={bootTab} {...tabScreenProps} />} />
      {(Object.keys(TAB_ROUTES) as TabRoute[]).map((tab) => (
        <Route
          key={tab}
          path={TAB_ROUTES[tab].slice(1)}
          element={<TabScreens activeTab={tab} {...tabScreenProps} />}
        />
      ))}
      <Route path="*" element={<Navigate to={`/${bootTab}`} replace />} />
    </Routes>
  );
}
