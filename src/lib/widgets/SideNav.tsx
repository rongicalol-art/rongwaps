import { PiHouseFill, PiBrainFill, PiBookOpenFill, PiUserFill, PiBookmarkSimpleFill } from 'react-icons/pi';

export interface SideNavProps {
  activeTab: 'path' | 'search' | 'library' | 'profile';
  activeActivity?: string | null;
  onTabChange: (tab: 'path' | 'search' | 'library' | 'profile') => void;
  accentClass?: string;
  accentBgClass?: string;
}

export function SideNav({ 
  activeTab,
  activeActivity, 
  onTabChange, 
  accentClass = 'text-brand-primary',
  accentBgClass = 'bg-brand-primary/10'
}: SideNavProps) {
  const tabs = [
    { id: 'path', label: 'Learn', icon: PiHouseFill },
    { id: 'search', label: 'Dictionary', icon: PiBookOpenFill },
    { id: 'library', label: 'Library', icon: PiBookmarkSimpleFill },
    { id: 'profile', label: 'Profile', icon: PiUserFill },
  ] as const;

  return (
    <nav className="flex flex-col w-[256px] h-full bg-white pt-8 px-4 z-50 shrink-0">
      <div className="mb-10 px-2 flex justify-start">
        <h1 className={`text-2xl font-black tracking-tight ${accentClass}`}>Ron's Flashcards</h1>
      </div>
      
      <div className="flex flex-col gap-2 w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isPracticeActivityActive = activeActivity && ['flashcards', 'listening', 'quiz', 'writing', 'flashcards-review', 'flashcards-library'].includes(activeActivity);
          const isActuallyActive = activeTab === tab.id && !isPracticeActivityActive;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`relative flex items-center w-full h-[54px] rounded-2xl transition-all duration-200 outline-none group active:scale-95 border-[3px] ${
                isActuallyActive 
                  ? `border-transparent ${accentBgClass.replace('bg-', 'bg-')} bg-opacity-15` 
                  : 'border-transparent hover:bg-[#F7F7F7]'
              }`}
            >
              <div className="w-[50px] lg:w-[48px] shrink-0 flex items-center justify-center transition-transform group-hover:scale-110">
                <Icon size={28} className={isActuallyActive ? accentClass : 'text-[#AFB6BB] group-active:text-[#4B4B4B] transition-colors'} />
              </div>
              <span className={`text-[15px] font-bold tracking-wide transition-colors ${
                isActuallyActive ? accentClass : 'text-[#4B4B4B] opacity-70 group-hover:opacity-100'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
