import { lazy, Suspense } from 'react';
import { Route, Routes, useMatch, useNavigate } from 'react-router';
import { ActionButton, EmptyState, LoadingScreen } from '../../lib/widgets';
import { TAB_ROUTES, type TabRoute } from '../routes';
import { TabScreens } from './TabScreens';

const JoinFolderScreen = lazy(() => import('../../screens/join-folder').then((m) => ({ default: m.JoinFolderScreen })));

type TabScreensProps = React.ComponentProps<typeof TabScreens>;

interface AppRoutesProps extends Omit<TabScreensProps, 'activeTab'> {
  /** Persisted tab; a bare '/' boots it. */
  activeTab: string;
}

/**
 * Top-level workspace routes. '/' renders the persisted tab (boot restore
 * keeps working); any other unknown URL shows a not-found state.
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return <EmptyState
    icon="search"
    title="This page doesn’t exist"
    description="The link may be old or mistyped."
    action={<ActionButton onClick={() => navigate(TAB_ROUTES.path, { replace: true })}>Go to Learn</ActionButton>}
    className="min-h-full"
  />;
}
