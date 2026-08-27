import { AppIcon, PlayfulNavIcon, type PlayfulNavIconName } from '../../lib/widgets';
import { BrandWordmark } from './BrandWordmark';

export interface SideNavProps {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  activeActivity?: string | null;
  onTabChange: (tab: 'path' | 'search' | 'library' | 'profile') => void;
  onSettingsClick: () => void;
  accentClass?: string;
  buttonEdgeClass?: string;
}

export function SideNav({ 
  activeTab,
  activeActivity, 
  onTabChange, 
  onSettingsClick,
  accentClass = 'text-brand-primary',
  buttonEdgeClass = 'border-brand-primary-edge',
}: SideNavProps) {
  const tabs: ReadonlyArray<{
    id: SideNavProps['activeTab'];
    label: string;
    icon: PlayfulNavIconName;
  }> = [
    { id: 'path', label: 'Books', icon: 'books' },
    { id: 'search', label: 'Dictionary', icon: 'dictionary' },
    { id: 'library', label: 'Library', icon: 'library' },
    { id: 'profile', label: 'Profile', icon: 'profile' },
  ] as const;

  return (
    <nav className="z-50 flex h-full w-[256px] shrink-0 flex-col bg-ui-surface px-4 pb-4 pt-7">
      <div className="mb-7 flex items-center justify-between gap-2 px-2">
        <BrandWordmark />
      </div>
      
      <div className="flex w-full flex-col gap-2">
        {tabs.map((tab) => {
          const isPracticeActivityActive = activeActivity && ['flashcards', 'listening', 'quiz', 'writing', 'flashcards-review', 'flashcards-library'].includes(activeActivity);
          const isActuallyActive = activeTab === tab.id && !isPracticeActivityActive;
          
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex h-16 w-full items-center overflow-hidden rounded-[20px] border-b-4 px-1 outline-none transition-[transform,background-color,border-color] duration-150 focus-visible:ring-4 focus-visible:ring-brand-primary/20 active:translate-y-1 active:border-b-0 ${
                isActuallyActive 
                  ? `${buttonEdgeClass} bg-ui-canvas`
                  : 'border-transparent hover:bg-ui-canvas'
              }`}
              aria-current={isActuallyActive ? 'page' : undefined}
            >
              <div className="relative z-10 flex w-[60px] shrink-0 items-center justify-center transition-transform group-hover:scale-105">
                <PlayfulNavIcon
                  name={tab.icon}
                  className={isActuallyActive ? 'h-11 w-11' : 'h-10 w-10'}
                />
              </div>
              <span className={`relative z-10 text-[14px] font-black uppercase tracking-wide transition-colors ${
                isActuallyActive ? accentClass : 'text-ui-ink-strong'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-5">
        <button
          type="button"
          onClick={onSettingsClick}
          className="group flex h-12 w-full items-center gap-5 rounded-[18px] px-4 text-ui-muted transition-colors hover:bg-ui-canvas hover:text-ui-ink-strong active:scale-[0.98]"
          aria-label="Open app settings"
          title="Settings"
        >
          <AppIcon name="appSettings" size={23} className="shrink-0" />
          <span className="text-[14px] font-black text-ui-ink-strong">Settings</span>
        </button>
      </div>
    </nav>
  );
}
