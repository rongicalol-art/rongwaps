import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PiListBold, PiXBold } from 'react-icons/pi';
import { SideNav } from './SideNav';
import { DynamicBackground } from './DynamicBackground';
import { MainHeader } from './MainHeader';
import { ExpandableSearch } from './ExpandableSearch';
import { useAppStore } from '../../store/useAppStore';

interface LayoutShellProps {
  children: React.ReactNode;
  activeTab: string;
  activeActivity?: string | null;
  activeBook: any;
  isNavOpen: boolean;
  setIsNavOpen: (open: boolean) => void;
  headerProps: any;
  onTabChange: (tab: any) => void;
  onProfileClick: () => void;
  onSignInClick?: () => void;
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
  onSignInClick,
  activityModals
}: LayoutShellProps) {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    isMainHeaderCompact,
    setIsMainHeaderCompact
  } = useAppStore();

  useEffect(() => {
    setIsMainHeaderCompact(false);
  }, [activeTab, setIsMainHeaderCompact]);

  const handleMainScroll = (event: React.UIEvent<HTMLElement>) => {
    if (activeTab === 'search') return;
    const nextIsCompact = event.currentTarget.scrollTop > 24;
    if (nextIsCompact !== isMainHeaderCompact) {
      setIsMainHeaderCompact(nextIsCompact);
    }
  };

  return (
    <div className={`font-sans flex h-[100dvh] w-full relative overflow-hidden transition-colors duration-700 overscroll-none`}>
      <DynamicBackground 
        color={activeBook.accentHex}
        patternOpacity={activeBook.patternOpacity}
      />

      {/* Desktop Side Nav */}
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
              className="flex shrink-0 h-full overflow-hidden absolute md:relative z-[260] md:z-auto border-r-2 border-[#E5E5E5] shadow-2xl md:shadow-none bg-white md:bg-transparent"
            >
              <SideNav 
                activeTab={activeTab as any}
                activeActivity={activeActivity}
                onTabChange={onTabChange} 
                accentClass={activeBook.accent}
                accentBgClass={activeBook.accentBgLight}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <div className="flex flex-col flex-1 relative overflow-hidden w-full">
        {/* Global Main Header */}
        <div className="shrink-0 z-50">
          <MainHeader 
            activeBook={activeBook} 
            compact={isMainHeaderCompact}
            {...headerProps}
            onLeftIconClick={onProfileClick}
            onSignInClick={activeTab === 'search' ? undefined : onSignInClick}
            extraLeftContent={
              <div className="flex items-center">
                <button 
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className="flex p-2 -ml-2 rounded-xl text-[#AFB6BB] hover:bg-[#F7F7F7] hover:text-[#4B4B4B] transition-colors"
                  aria-label="Toggle Menu"
                >
                  <PiListBold size={24} />
                </button>
              </div>
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

        {/* Main Scrollable Content */}
        <main 
          className={`flex-1 w-full relative overflow-x-hidden overscroll-none flex flex-col ${
            activeTab === 'search' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
          onScroll={handleMainScroll}
        >
          {children}
        </main>
        
        {/* Render activities here so they fill the right side (flex-1) and cover the header but NOT the side nav */}
        {activityModals}
      </div>
    </div>
  );
}
