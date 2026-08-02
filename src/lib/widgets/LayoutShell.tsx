import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SideNav, type SideNavProps } from './SideNav';
import { DynamicBackground } from './DynamicBackground';
import { AppIcon } from './AppIcon';
import { MainHeader, type MainHeaderProps } from './MainHeader';
import { ExpandableSearch } from './ExpandableSearch';
import { useAppStore } from '../../store/useAppStore';
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
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

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
              className="absolute inset-y-3 left-3 z-[260] flex shrink-0 overflow-hidden rounded-[28px] border-b-[6px] border-ui-divider bg-ui-surface md:inset-y-4 md:left-4"
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
      
      <div className="absolute inset-y-0 left-0 right-0 z-10 flex flex-col overflow-hidden md:left-[288px]">
        {activeTab === 'path' ? (
          <button
            type="button"
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="absolute left-3 top-[calc(0.5rem+env(safe-area-inset-top,0px))] z-[100] flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ui-muted transition-colors hover:bg-ui-surface hover:text-ui-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 md:hidden"
            aria-label="Toggle navigation"
          >
            <AppIcon name="menu" size={24} />
          </button>
        ) : (
          <div className="shrink-0 z-50 md:hidden">
            <MainHeader
              activeBook={activeBook}
              {...headerProps}
              onLeftIconClick={onProfileClick}
              extraLeftContent={
                <button
                  type="button"
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ui-muted transition-colors hover:bg-ui-canvas hover:text-ui-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
                  aria-label="Toggle navigation"
                >
                  <AppIcon name="menu" size={24} />
                </button>
              }
              extraRightContent={
                activeTab === 'search' ? (
                  <motion.div className="flex items-center ml-2 justify-end flex-1 max-w-full">
                    <ExpandableSearch
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search dictionary..."
                      isExpanded={isSearchOpen}
                      onExpandedChange={setIsSearchOpen}
                    />
                  </motion.div>
                ) : null
              }
            />
          </div>
        )}

        <main 
          className={`flex-1 w-full relative overflow-x-hidden overscroll-none flex flex-col ${
            activeTab === 'search' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>

        {activityModals}
      </div>
    </div>
  );
}
