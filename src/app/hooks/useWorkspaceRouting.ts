import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';
import { prefetchTabScreen } from '../components/TabScreens';
import { TAB_ROUTES, tabFromPathname, type TabRoute } from '../routes';
import type { useAppNavigation } from '../../hooks/useAppNavigation';
import type { useResponsiveNav } from './useResponsiveNav';
import type { useGrammarLauncher } from './useGrammarLauncher';

type Navigation = ReturnType<typeof useAppNavigation>;
type ResponsiveNav = ReturnType<typeof useResponsiveNav>;
type Grammar = ReturnType<typeof useGrammarLauncher>;

interface WorkspaceRoutingOptions {
  activeTab: Navigation['activeTab'];
  setActiveTab: Navigation['setActiveTab'];
  setActiveActivity: Navigation['setActiveActivity'];
  closeReader: () => void;
  setActiveGrammarPartId: Grammar['setActiveGrammarPartId'];
  isDesktop: ResponsiveNav['isDesktop'];
  isDesktopOrTablet: ResponsiveNav['isDesktopOrTablet'];
  toggleCollapse: ResponsiveNav['toggleCollapse'];
  setIsNavOpen: ResponsiveNav['setIsNavOpen'];
}

/**
 * Route <-> workspace wiring for the app shell: the URL is the source of
 * truth for the top-level tab, and navigating runs the same side effects
 * everywhere (sidebar click, back/forward, deep link) — dismissing open
 * full-viewport windows and prefetching the destination tab chunk.
 */
export function useWorkspaceRouting({
  activeTab,
  setActiveTab,
  setActiveActivity,
  closeReader,
  setActiveGrammarPartId,
  isDesktop,
  isDesktopOrTablet,
  toggleCollapse,
  setIsNavOpen,
}: WorkspaceRoutingOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeTab = tabFromPathname(location.pathname);

  useEffect(() => {
    if (!routeTab || routeTab === activeTab) return;
    // Sidebar navigation is workspace-level: dismiss every open
    // full-viewport/column window (Reading Mode, grammar lesson,
    // dictionary word detail) so the destination tab actually comes
    // to the front instead of switching behind the still-open window.
    closeReader();
    setActiveActivity(null);
    setActiveGrammarPartId(null);
    const store = useAppStore.getState();
    store.setDictionaryWord(null);
    setActiveTab(routeTab);
    // Kick off the destination tab's chunk immediately so the switch is
    // instant when the user actually lands there (the browser dedupes
    // the import with React.lazy's own fetch).
    prefetchTabScreen(routeTab);
    store.setIsReviewMode(false);
    store.setActiveReviewSessionCards(null);
    store.setIsSearchOpen(false);
  }, [routeTab, activeTab, closeReader, setActiveActivity, setActiveGrammarPartId, setActiveTab]);

  const handleTabChange = useCallback((tab: TabRoute) => {
    navigate(TAB_ROUTES[tab]);
    if (!isDesktop()) setIsNavOpen(false);
  }, [navigate, isDesktop, setIsNavOpen]);

  const handleNavToggle = useCallback(() => {
    if (isDesktopOrTablet) {
      toggleCollapse();
    } else {
      setIsNavOpen((open) => !open);
    }
  }, [isDesktopOrTablet, toggleCollapse, setIsNavOpen]);

  return { handleTabChange, handleNavToggle };
}
