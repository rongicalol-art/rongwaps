import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SideNav, type SideNavProps } from './SideNav';
import { SAMPLE_BOOKS } from '../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface LayoutShellProps {
  children: React.ReactNode;
  activeTab: SideNavProps['activeTab'];
  activeActivity?: string | null;
  /** True while an overlay window that only covers the workspace column (not
   *  the whole viewport) sits on the practice canvas — e.g. the dictionary
   *  detail overlay. The shell must match its tone so the lane beside the
   *  sidebar never shows a different canvas. Reader/Grammar do NOT need this:
   *  they paint their own full-viewport canvas. */
  practiceCanvasOpen?: boolean;
  activeBook: CourseBook;
  isNavOpen: boolean;
  setIsNavOpen: (open: boolean) => void;
  onTabChange: SideNavProps['onTabChange'];
  onSettingsClick: () => void;
  activityModals?: React.ReactNode;
  isOverlayActive?: boolean;
}

export function LayoutShell({
  children,
  activeTab,
  activeActivity,
  activeBook,
  isNavOpen,
  setIsNavOpen,
  onTabChange,
  onSettingsClick,
  activityModals,
  isOverlayActive = false,
  practiceCanvasOpen = false,
}: LayoutShellProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--workspace-desktop-nav-width', isNavOpen ? '288px' : '0px');
    return () => {
      root.style.removeProperty('--workspace-desktop-nav-width');
    };
  }, [isNavOpen]);

  // This shell root is the ONLY owner of the workspace canvas tone. Every
  // child column (sidebar lane, content) is transparent and shows it through.
  // Swap to the practice tone only when the open surface is practice-toned:
  // a practice activity (activeActivity) or a column-only practice overlay
  // (practiceCanvasOpen, e.g. dictionary detail). Reader/Grammar paint their
  // own full-viewport canvas, so they never touch this swap. No color
  // transition here: the swap applies instantly so nothing ever fades.
  return (
    <div
      className={`font-sans relative flex h-[100dvh] w-full overflow-hidden overscroll-none ${
        activeActivity || practiceCanvasOpen ? 'bg-ui-practice-canvas' : 'bg-ui-canvas'
      }`}
    >
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
              className="absolute inset-y-3 left-3 z-[600] flex shrink-0 flex-col overflow-hidden rounded-[28px] border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface md:inset-y-4 md:left-4"
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
        <main className={`flex-1 w-full relative overflow-y-auto overflow-x-hidden overscroll-none flex flex-col ${isOverlayActive ? 'hidden' : ''}`} aria-hidden={isOverlayActive}>
          {children}
        </main>

        <div className={isOverlayActive ? 'hidden' : undefined} aria-hidden={isOverlayActive}>
          {activityModals}
        </div>
      </div>
    </div>
  );
}
