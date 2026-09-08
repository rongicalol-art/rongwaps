import { useState, useEffect, useCallback } from 'react';

export const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
);

export const DESKTOP_NAV_PREFERENCE_KEY = 'rongwaps:desktop-nav-open';

export const getInitialNavOpen = () => {
  if (!isDesktopViewport()) return false;
  return window.localStorage.getItem(DESKTOP_NAV_PREFERENCE_KEY) !== 'false';
};

export function useResponsiveNav(activeTab: string) {
  const [isNavOpen, setIsNavOpen] = useState(() => (
    activeTab === 'path' && isDesktopViewport() ? true : getInitialNavOpen()
  ));

  const setResponsiveNavOpen = useCallback((open: boolean) => {
    setIsNavOpen(open);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const syncNavToViewport = (event: MediaQueryListEvent) => {
      setIsNavOpen(
        event.matches
          ? window.localStorage.getItem(DESKTOP_NAV_PREFERENCE_KEY) !== 'false'
          : false,
      );
    };

    desktopQuery.addEventListener('change', syncNavToViewport);
    return () => {
      desktopQuery.removeEventListener('change', syncNavToViewport);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopViewport()) return;
    window.localStorage.setItem(DESKTOP_NAV_PREFERENCE_KEY, String(isNavOpen));
  }, [activeTab, isNavOpen]);

  return {
    isNavOpen,
    setIsNavOpen,
    setResponsiveNavOpen,
    isDesktop: isDesktopViewport,
  };
}
