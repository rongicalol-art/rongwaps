import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SideNav, type SideNavProps } from './SideNav';
import { AppIcon, DynamicBackground } from '../../lib/widgets';
import { MainHeader, type MainHeaderProps } from './MainHeader';
import { SAMPLE_BOOKS } from '../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface LayoutShellProps {
  children: React.ReactNode;
  activeTab: SideNavProps['activeTab'];
  activeActivity?: string | null;
  activeBook: CourseBook;
  isNavOpen: boolean;
  setIsNavOpen: (open: boolean) => void;
  headerProps: Omit<MainHeaderProps, 'activeBook'>;
  onTabChange: SideNavProps['onTabChange'];
  onProfileClick: () => void;
  onSettingsClick: () => void;
  activityModals?: React.ReactNode;
}

export function LayoutShell({
  children,
  activeTab,
  activeActivity,
  activeBook,
  isNavOpen,
  setIsNavOpen,
  headerProps,
  onTabChange,
  onProfileClick,
  onSettingsClick,
  activityModals
}: LayoutShellProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--workspace-desktop-nav-width', isNavOpen ? '288px' : '0px');
    return () => {
      root.style.removeProperty('--workspace-desktop-nav-width');
    };
  }, [isNavOpen]);

  return (
    <div className={`font-sans flex h-[100dvh] w-full relative overflow-hidden transition-colors duration-700 overscroll-none`}>
      <DynamicBackground variant={activeActivity ? 'practice' : 'default'} />

      <AnimatePresence>
        {isNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/20 z-[250] md:hidden"
              onClick={() => setIsNavOpen(false)}
            />
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute inset-y-3 left-3 z-[600] flex shrink-0 overflow-hidden rounded-[28px] border-b-[6px] border-ui-divider bg-ui-surface md:inset-y-4 md:left-4"
            >
              <SideNav 
                activeTab={activeTab}
                activeActivity={activeActivity}
                onTabChange={onTabChange} 
                onSettingsClick={onSettingsClick}
                accentClass={activeBook.accent}
                buttonEdgeClass={activeBook.buttonEdge}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        data-workspace-content
        className="absolute inset-y-0 right-0 z-10 flex flex-col overflow-hidden transition-[left] duration-300 ease-out"
        style={{ left: 'var(--workspace-nav-width)' }}
      >
        {activeTab === 'profile' && (
          <div className="shrink-0 z-50">
            <MainHeader
              activeBook={activeBook}
              {...headerProps}
              onLeftIconClick={onProfileClick}
              extraLeftContent={
                headerProps.extraLeftContent ?? (
                  <button
                    type="button"
                    onClick={() => setIsNavOpen(!isNavOpen)}
                    className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ui-muted transition-colors hover:bg-ui-canvas hover:text-ui-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
                    aria-label="Toggle navigation"
                  >
                    <AppIcon name="menu" size={24} />
                  </button>
                )
              }
              extraRightContent={null}
            />
          </div>
        )}

        <main className="flex-1 w-full relative overflow-y-auto overflow-x-hidden overscroll-none flex flex-col">
          {children}
        </main>

        {activityModals}
      </div>
    </div>
  );
}
