import { useMemo, useCallback } from 'react';
import { PiUserFill, PiGearBold } from 'react-icons/pi';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from './useAuth';

export type TabType = 'path' | 'search' | 'library' | 'profile';
export type ActivityType = 'flashcards' | 'flashcards-review' | 'flashcards-library' | 'listening' | 'quiz' | 'writing' | 'create-card' | 'personal-vocab' | null;

/**
 * Profile avatar component — shows user avatar or placeholder icon.
 */
function ProfileAvatar({ user }: { user: any }) {
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  if (avatarUrl) {
    return (
      <div className="rounded-full flex items-center justify-center shrink-0 transition-all duration-300 h-10 w-10 overflow-hidden bg-white border-2 border-b-[4px] border-[#E5E5E5] active:border-b-[2px] active:translate-y-[2px] text-[#4B4B4B]">
        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 transition-all duration-300 h-10 w-10 bg-[#F7F7F7] border-[2px] border-dashed border-[#AFB6BB] text-[#AFB6BB] hover:border-[#1CB0F6] hover:text-[#1CB0F6] shadow-sm">
      <PiUserFill size={22} />
    </div>
  );
}

/**
 * Settings button component — opens the settings modal.
 */
function SettingsButton() {
  return (
    <button
      onClick={() => useAppStore.getState().setIsSettingsOpen(true)}
      className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border-[3px] border-b-[5px] border-[#E5E5E5] text-[#AFB6BB] hover:text-[#4B4B4B] hover:border-[#1CB0F6] hover:bg-[#F7F7F7] active:border-b-[3px] active:translate-y-[2px] transition-all cursor-pointer shadow-sm"
      title="Settings"
    >
      <PiGearBold size={22} />
    </button>
  );
}

export function useAppNavigation() {
  const {
    lastActivity, setLastActivity,
    activeTab, setActiveTab: _setActiveTab,
    activeActivity, setActiveActivity: _setActiveActivity,
    selectedLessons, setSelectedLessons,
    selectedBooks, setSelectedBooks
  } = useAppStore();

  const { currentUser } = useAuth();

  const handleSetActiveActivity = useCallback((activity: ActivityType) => {
    _setActiveActivity(activity);
    if (activity && activity !== 'flashcards-library' && activity !== 'create-card' && activity !== 'flashcards-review') {
      setLastActivity(activity);
    }
  }, [_setActiveActivity, setLastActivity]);

  const clearReviewContext = useCallback(() => {
    useAppStore.getState().setIsReviewMode(false);
    useAppStore.getState().setActiveReviewSessionCards(null);
  }, []);

  const handleSetActiveTab = useCallback((tab: TabType) => {
    _setActiveTab(tab);
  }, [_setActiveTab]);

  // Determine header props dynamically based on the current mode
  const headerProps = useMemo(() => {
    switch (activeTab) {
      case 'search':
        return {
          title: "Dictionary",
          leftIcon: <ProfileAvatar user={currentUser} />,
          rightContent: <span />
        };
      case 'profile':
        return {
          title: "Profile",
          leftIcon: null,
          rightContent: <SettingsButton />
        };
      case 'library':
        return {
          title: "Library Vault",
          leftIcon: <ProfileAvatar user={currentUser} />,
          showPlayButton: true,
          onPlayClick: () => {
            clearReviewContext();
            handleSetActiveActivity('flashcards-library');
          }
        };
      case 'path':
      default:
        return {
          leftIcon: <ProfileAvatar user={currentUser} />,
          showPlayButton: selectedLessons.length > 0,
          onPlayClick: () => {
            clearReviewContext();
            const fallbackActivity = (lastActivity === 'flashcards-review' || (lastActivity as string) === 'flashcards-library') ? 'flashcards' : (lastActivity || 'flashcards');
            handleSetActiveActivity(fallbackActivity as ActivityType);
          }
        };
    }
  }, [activeTab, selectedLessons, lastActivity, currentUser, clearReviewContext, handleSetActiveActivity]);

  const toggleLesson = (id: number) => {
    setSelectedLessons(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const toggleBook = (id: number) => {
    setSelectedBooks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return {
    activeTab,
    setActiveTab: handleSetActiveTab,
    activeActivity,
    setActiveActivity: handleSetActiveActivity,
    selectedLessons,
    toggleLesson,
    selectedBooks,
    toggleBook,
    headerProps
  };
}
