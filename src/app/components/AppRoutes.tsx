import { Navigate, Route, Routes } from 'react-router';
import { TAB_ROUTES, type TabRoute } from '../routes';
import { TabScreens } from './TabScreens';

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
  return (
    <Routes>
      <Route index element={<TabScreens activeTab={activeTab} {...tabScreenProps} />} />
      {(Object.keys(TAB_ROUTES) as TabRoute[]).map((tab) => (
        <Route
          key={tab}
          path={TAB_ROUTES[tab].slice(1)}
          element={<TabScreens activeTab={tab} {...tabScreenProps} />}
        />
      ))}
      <Route path="*" element={<Navigate to={`/${activeTab}`} replace />} />
    </Routes>
  );
}
