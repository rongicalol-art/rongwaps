import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { GardenVisualization } from './components/GardenVisualization';
import { useAuth } from '../../hooks/useAuth';
import { AuthScreen } from '../auth';

interface ProfileScreenProps {
  onStartReview: () => void;
}

export function ProfileScreen({ onStartReview }: ProfileScreenProps) {
  const {
    learnedCards,
    currentStreak,
    totalXp,
    totalCardsReviewed,
  } = useAppStore();
  const { currentUser, logout, isLoading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Derive display info from useAuth
  const avatarUrl = currentUser?.user_metadata?.avatar_url
    || currentUser?.user_metadata?.picture;
  const displayName = currentUser?.user_metadata?.full_name
    || currentUser?.user_metadata?.name
    || currentUser?.email?.split('@')[0]
    || 'Learner';
  const displayEmail = currentUser?.email;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 pb-32 flex flex-col items-center justify-start text-center min-h-screen pt-12 md:pt-16">
        <div className="w-24 h-24 rounded-full bg-ui-border/60 animate-pulse mb-6" />
        <div className="w-48 h-8 rounded-full bg-ui-border/60 animate-pulse mb-3" />
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4 my-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-ui-surface rounded-feature border-b-[length:var(--depth-md)] border-ui-divider h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const displayXp = totalXp;
  const displayStreak = currentStreak;

  return (
    <div className="px-4 py-6 md:py-10 pb-32 flex flex-col items-center justify-start min-h-screen">
      
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* User Header Section */}
        <div className="flex flex-col items-center relative w-full mb-10 pt-4">

          <div className="relative mb-4">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-ui-surface shadow-[0_0_0_3px_var(--color-ui-divider)] flex items-center justify-center overflow-hidden bg-ui-canvas z-10">
              {avatarUrl ? (
                 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                 <AppIcon name="profile" size={54} className="text-ui-muted mt-2" />
              )}
            </div>
            {/* Status indicator badge */}
            {currentUser && (
               <div className="absolute bottom-1 right-1 w-8 h-8 bg-feedback-success border-2 border-ui-surface rounded-full z-20 flex items-center justify-center">
                  <AppIcon name="check" className="text-white" size={16} />
               </div>
            )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold text-ui-ink tracking-normal">
            {displayName}
          </h2>
          <p className="text-ui-muted text-[16px] font-bold mt-1">
            {displayEmail || 'Guest Account'}
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="w-full mb-8">
           <h3 className="text-xl font-extrabold text-ui-ink text-left mb-4 px-1">Statistics</h3>
           <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
              
              <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-brand-secondary/10 flex items-center justify-center mt-1">
                   <AppIcon name="flame" className="text-brand-secondary" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{displayStreak}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Day Streak</p>
                 </div>
              </div>

              <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-warning/10 flex items-center justify-center mt-1">
                   <AppIcon name="actions" className="text-feedback-warning" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{displayXp}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Total XP</p>
                 </div>
              </div>

              <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary/10 flex items-center justify-center mt-1">
                   <AppIcon name="book" className="text-brand-primary" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{learnedCards.length}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Words Learned</p>
                 </div>
              </div>

              <div className="bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-4 flex items-start gap-3 hover:bg-ui-hover transition-[background-color,border-color] cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-feedback-success/10 flex items-center justify-center mt-1">
                   <AppIcon name="check" className="text-feedback-success" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-ui-ink truncate">{totalCardsReviewed}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-ui-muted truncate mt-0.5">Total Reviews</p>
                 </div>
              </div>

           </div>
        </div>

        {/* Action / Review Box / Garden */}
        <div className="w-full mb-10">
          <GardenVisualization onWaterGarden={onStartReview} />
        </div>


        {/* Account Area */}
        <div className="w-full bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider rounded-feature p-5 overflow-hidden">
          {currentUser ? (
            <ActionButton
              variant="danger"
              size="lg"
              fullWidth
              onClick={handleLogout}
              className="uppercase tracking-widest"
            >
              <AppIcon name="signOut" size={20} /> Sign Out
            </ActionButton>
          ) : (
            <ActionButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setIsAuthOpen(true)}
              className="uppercase tracking-widest"
            >
              <AppIcon name="signIn" size={20} /> Sign In with Google
            </ActionButton>
          )}
        </div>

      </div>

      <AuthScreen isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

    </div>
  );
}
