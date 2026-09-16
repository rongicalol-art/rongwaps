import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SideNav, navTabLabel, type SideNavProps } from './SideNav';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
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
  isCollapsed?: boolean;
  isDesktopOrTablet?: boolean;
  onToggleCollapse?: () => void;
  setIsNavOpen: (open: boolean) => void;
  onTabChange: SideNavProps['onTabChange'];
  onSettingsClick: () => void;
  activityModals?: React.ReactNode;
  isOverlayActive?: boolean;
  showSidebarCollapse?: boolean;
}

export function LayoutShell({
  children,
  activeTab,
  activeActivity,
  activeBook,
  isNavOpen,
  isCollapsed = false,
  isDesktopOrTablet = true,
  onToggleCollapse,
  setIsNavOpen,
  onTabChange,
  onSettingsClick,
  activityModals,
  isOverlayActive = false,
  practiceCanvasOpen = false,
  showSidebarCollapse = false,
}: LayoutShellProps) {
  useEffect(() => {
    const root = document.documentElement;
    const desktopNavWidth = isDesktopOrTablet
      ? isCollapsed
        ? '108px'
        : '288px'
      : '0px';
    root.style.setProperty('--workspace-desktop-nav-width', desktopNavWidth);
  }, [isDesktopOrTablet, isCollapsed]);

  // The shell owns the workspace view name; the study windows (reader, grammar)
  // override it while they are open and hand it back when they close.
  useDocumentTitle(navTabLabel(activeTab));

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
      {/* WCAG 2.4.1: the first tab stop skips the sidebar + workspace chrome.
          Hidden by translate + opacity (not `display:none`, which would remove
          it from the keyboard order too). `z-50` puts it over the content
          column and its sticky header while staying under the sidebar/drawer
          layers, so an open nav drawer never gets a chip floating over it.
          Omitted while a study window owns the viewport, because the target
          `<main>` is hidden then. */}
      {!isOverlayActive && (
        <a
          href="#main-content"
          className="focus-ring pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2 -translate-y-24 rounded-control border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 text-sm font-black text-ui-ink-strong opacity-0 shadow-ambient-md transition-[transform,opacity] duration-150 motion-reduce:transition-none focus:pointer-events-auto focus:translate-y-0 focus:opacity-100"
        >
          Skip to main content
        </a>
      )}

      {/* Desktop / Tablet permanent floating sidebar (never hidden to 0px) */}
      <div className="hidden md:flex">
        <div
          className={`absolute inset-y-4 left-4 z-shell flex shrink-0 flex-col rounded-modal border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface overflow-visible transition-[width] duration-200 ${
            isCollapsed ? 'w-[76px]' : 'w-[256px]'
          }`}
        >
          <SideNav 
            activeTab={activeTab}
            activeActivity={activeActivity}
            onTabChange={onTabChange} 
            onSettingsClick={onSettingsClick}
            onToggleCollapse={onToggleCollapse}
            accentClass={activeBook.accent}
            buttonEdgeClass={activeBook.buttonEdge}
            isCollapsed={isCollapsed}
            showCollapseButton={showSidebarCollapse}
          />
        </div>
      </div>

      {/* Mobile drawer (< 768px) */}
      <AnimatePresence>
        {!isDesktopOrTablet && isNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ui-ink-strong/20 z-dock md:hidden"
              onClick={() => setIsNavOpen(false)}
            />
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute inset-y-3 left-3 z-shell flex shrink-0 flex-col overflow-hidden rounded-modal border-b-[length:var(--depth-xl)] border-ui-border bg-ui-surface md:hidden"
            >
              <SideNav 
                activeTab={activeTab}
                activeActivity={activeActivity}
                onTabChange={(tab) => {
                  onTabChange(tab);
                  setIsNavOpen(false);
                }} 
                onSettingsClick={() => {
                  onSettingsClick();
                  setIsNavOpen(false);
                }}
                accentClass={activeBook.accent}
                buttonEdgeClass={activeBook.buttonEdge}
                isCollapsed={false}
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
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 w-full relative overflow-y-auto overflow-x-hidden overscroll-none flex flex-col outline-none ${isOverlayActive ? 'hidden' : ''}`}
          aria-hidden={isOverlayActive}
        >
          {children}
        </main>

        <div className={isOverlayActive ? 'hidden' : undefined} aria-hidden={isOverlayActive}>
          {activityModals}
        </div>
      </div>
    </div>
  );
}
