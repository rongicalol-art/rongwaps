import { useState, useEffect, useCallback } from 'react';

export const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
);

export const isTabletViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
);

export const isExpandedViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
);

export const DESKTOP_NAV_PREFERENCE_KEY = 'rongwaps:desktop-nav-open';
export const SIDEBAR_COLLAPSED_PREFERENCE_KEY = 'rongwaps:sidebar-collapsed';

export const getInitialNavOpen = () => {
  if (!isDesktopViewport()) return false;
  return window.localStorage.getItem(DESKTOP_NAV_PREFERENCE_KEY) !== 'false';
};

export const getInitialSidebarCollapsed = () => {
  if (typeof window === 'undefined') return false;
  // If window is too small (< 1024px), automatically minimize
  if (!isExpandedViewport()) {
    return true;
  }
  const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_PREFERENCE_KEY);
  if (saved !== null) {
    return saved === 'true';
  }
  return false;
};

export function useResponsiveNav() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => getInitialSidebarCollapsed());
  const [isDesktopOrTablet, setIsDesktopOrTablet] = useState(() => isDesktopViewport());

  const setResponsiveNavOpen = useCallback((open: boolean) => {
    setIsNavOpen(open);
  }, []);

  const collapseNav = useCallback(() => {
    setIsCollapsed(true);
    setIsNavOpen(false);
  }, []);

  const expandNav = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const restoreBaseNavPreference = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isExpandedViewport()) {
      setIsCollapsed(true);
    } else {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_PREFERENCE_KEY);
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_PREFERENCE_KEY, String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const expandedQuery = window.matchMedia('(min-width: 1024px)');

    let prevExpanded = expandedQuery.matches;

    const syncNavToViewport = () => {
      const isDt = desktopQuery.matches;
      setIsDesktopOrTablet(isDt);

      if (!isDt) {
        setIsNavOpen(false);
      } else {
        const isExp = expandedQuery.matches;
        if (!isExp) {
          // Window is too small (< 1024px): automatically minimize sidebar
          setIsCollapsed(true);
        } else if (!prevExpanded && isExp) {
          // Restored to large desktop: restore large-screen state
          const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_PREFERENCE_KEY);
          setIsCollapsed(saved === 'true');
        }
        prevExpanded = isExp;
      }
    };

    desktopQuery.addEventListener('change', syncNavToViewport);
    expandedQuery.addEventListener('change', syncNavToViewport);
    window.addEventListener('resize', syncNavToViewport);

    return () => {
      desktopQuery.removeEventListener('change', syncNavToViewport);
      expandedQuery.removeEventListener('change', syncNavToViewport);
      window.removeEventListener('resize', syncNavToViewport);
    };
  }, []);

  return {
    isNavOpen,
    setIsNavOpen,
    setResponsiveNavOpen,
    isDesktop: isDesktopViewport,
    isDesktopOrTablet,
    isCollapsed,
    setIsCollapsed,
    collapseNav,
    expandNav,
    restoreBaseNavPreference,
    toggleCollapse,
  };
}
