import { memo } from 'react';
import { AppIcon, BrandWordmark, PlayfulNavIcon, type PlayfulNavIconName } from '../../lib/widgets';

export interface SideNavProps {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  activeActivity?: string | null;
  onTabChange: (tab: 'path' | 'search' | 'library' | 'profile') => void;
  onSettingsClick: () => void;
  onToggleCollapse?: () => void;
  accentClass?: string;
  buttonEdgeClass?: string;
  isCollapsed?: boolean;
  showCollapseButton?: boolean;
}

/** Top-level workspace names. One owner: the nav renders them, and the shell
 *  titles the document with the same label, so a tab never has two names. */
export const NAV_TABS: ReadonlyArray<{
  id: SideNavProps['activeTab'];
  label: string;
  icon: PlayfulNavIconName;
}> = [
  { id: 'path', label: 'Books', icon: 'books' },
  { id: 'search', label: 'Dictionary', icon: 'dictionary' },
  { id: 'library', label: 'Library', icon: 'library' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
] as const;

export function navTabLabel(tab: SideNavProps['activeTab']): string {
  return NAV_TABS.find((entry) => entry.id === tab)?.label ?? '';
}

const PRACTICE_ACTIVITIES = new Set([
  'flashcards',
  'listening',
  'quiz',
  'writing',
  'flashcards-review',
  'flashcards-library',
]);

export const SideNav = memo(function SideNav({ 
  activeTab,
  activeActivity, 
  onTabChange, 
  onSettingsClick,
  onToggleCollapse,
  accentClass = 'text-brand-primary',
  buttonEdgeClass = 'border-brand-primary-edge',
  isCollapsed = false,
  showCollapseButton = false,
}: SideNavProps) {
  const isPracticeActivityActive = Boolean(activeActivity && PRACTICE_ACTIVITIES.has(activeActivity));

  return (
    // The bar shell (LayoutShell) paints bg-ui-surface; this nav stays
    // transparent so the white card shows through. Active items use a soft
    // canvas chip so they stay visible on the white bar.
    <nav
      aria-label="Main navigation"
      className={`z-50 flex h-full shrink-0 flex-col bg-transparent pb-4 transition-[width,padding] duration-200 ${
        isCollapsed
          ? 'w-[76px] items-center px-2.5 pt-6'
          : 'w-[256px] px-4 pt-7'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'mb-6 justify-center w-full' : showCollapseButton ? 'mb-7 justify-between gap-2 px-1' : 'mb-7 justify-start px-2'}`}>
        {isCollapsed ? (
          onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="group relative flex items-center justify-center rounded-control focus-ring transition-transform active:scale-95"
            >
              <BrandWordmark collapsed />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-control border-b-2 border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ui-ink-strong shadow-md whitespace-nowrap group-hover:flex items-center"
              >
                Expand sidebar
              </span>
            </button>
          ) : (
            <BrandWordmark collapsed />
          )
        ) : (
          <>
            <BrandWordmark />
            {showCollapseButton && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink-strong focus-ring active:scale-95"
              >
                <AppIcon name="sidebarToggle" size={19} />
              </button>
            )}
          </>
        )}
      </div>
      
      <div className={`flex w-full flex-col ${isCollapsed ? 'items-center gap-2.5' : 'gap-2'}`}>
        {NAV_TABS.map((tab) => {
          const isActuallyActive = activeTab === tab.id && !isPracticeActivityActive;
          
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={`group relative flex items-center rounded-feature border-b-4 focus-ring transition-[transform,background-color,border-color] duration-150 active:translate-y-1 active:border-b-0 ${
                isCollapsed
                  ? 'h-13 w-13 justify-center'
                  : 'h-16 w-full px-1'
              } ${
                isActuallyActive 
                  ? `${buttonEdgeClass} bg-ui-canvas`
                  : 'border-transparent hover:bg-ui-hover'
              }`}
              aria-current={isActuallyActive ? 'page' : undefined}
            >
              <div
                className={`relative z-10 flex shrink-0 items-center justify-center transition-transform group-hover:scale-105 ${
                  isCollapsed ? 'w-auto' : 'w-[60px]'
                }`}
              >
                <PlayfulNavIcon
                  name={tab.icon}
                  className={
                    isCollapsed
                      ? isActuallyActive
                        ? 'h-9 w-9'
                        : 'h-8.5 w-8.5'
                      : isActuallyActive
                        ? 'h-11 w-11'
                        : 'h-10 w-10'
                  }
                />
              </div>

              {!isCollapsed && (
                <span className={`relative z-10 text-sm font-black uppercase tracking-wide transition-colors ${
                  isActuallyActive ? accentClass : 'text-ui-ink-strong'
                }`}>
                  {tab.label}
                </span>
              )}

              {isCollapsed && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-control border-b-2 border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ui-ink-strong shadow-md whitespace-nowrap group-hover:flex items-center"
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={`mt-auto pt-5 ${isCollapsed ? 'flex justify-center w-full' : ''}`}>
        <button
          type="button"
          onClick={onSettingsClick}
          className={`group relative flex items-center rounded-feature text-ui-muted transition-colors hover:bg-ui-hover hover:text-ui-ink-strong focus-ring active:scale-[0.98] ${
            isCollapsed
              ? 'h-12 w-12 justify-center'
              : 'h-12 w-full gap-5 px-4'
          }`}
          aria-label="Open app settings"
          title={isCollapsed ? undefined : 'Settings'}
        >
          <AppIcon name="appSettings" size={23} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-black text-ui-ink-strong">Settings</span>
          )}
          {isCollapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-control border-b-2 border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ui-ink-strong shadow-md whitespace-nowrap group-hover:flex items-center"
            >
              Settings
            </span>
          )}
        </button>
      </div>
    </nav>
  );
});
