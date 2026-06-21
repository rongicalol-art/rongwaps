import { useState } from 'react';
import { motion } from 'motion/react';
import { PiBookOpenFill, PiCheckCircleFill, PiUserFill, PiSignInBold, PiSignOutBold, PiFireFill, PiLightningFill, PiMedalFill, PiTrashBold } from 'react-icons/pi';
import { useAppStore } from '../../store/useAppStore';
import { Soft3DButton, BottomDrawer, GardenVisualization } from '../../lib/widgets';
import { useAuth } from '../../hooks/useAuth';

interface ProfileScreenProps {
  onStartReview: () => void;
  onSignInClick: () => void;
}

export function ProfileScreen({ onStartReview, onSignInClick }: ProfileScreenProps) {
  const {
    learnedCards,
    srsData,
    characterPreference,
    setCharacterPreference,
    isSettingsOpen,
    setIsSettingsOpen,
    currentStreak,
    totalXp,
    sessionProgress,
  } = useAppStore();
  const { currentUser, logout, isLoading } = useAuth();
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

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

  const handleResetProgress = () => {
    useAppStore.getState().resetProgress();
    setIsConfirmResetOpen(false);
    setIsSettingsOpen(false);
  };

  const cardsToReview = Object.values(srsData).filter(
    (card) => card.nextReviewDate <= Date.now()
  ).length;

  if (isLoading) {
    return (
      <div className="px-4 py-8 pb-32 flex flex-col items-center justify-start text-center min-h-screen pt-12 md:pt-16">
        <div className="w-24 h-24 rounded-full bg-[#E5E5E5]/60 animate-pulse mb-6" />
        <div className="w-48 h-8 rounded-full bg-[#E5E5E5]/60 animate-pulse mb-3" />
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4 my-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const displayXp = totalXp + sessionProgress.xpEarned;
  const displayStreak = currentStreak;

  return (
    <div className="px-4 py-6 md:py-10 pb-32 flex flex-col items-center justify-start min-h-screen">
      
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* User Header Section */}
        <div className="flex flex-col items-center relative w-full mb-10 pt-4">

          <div className="relative mb-4">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[4px] border-white shadow-[0_0_0_3px_#E5E5E5] flex items-center justify-center overflow-hidden bg-[#F7F7F7] z-10">
              {avatarUrl ? (
                 <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                 <PiUserFill size={64} className="text-[#AFB6BB] mt-4" />
              )}
            </div>
            {/* Status indicator badge */}
            {currentUser && (
               <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#58CC02] border-[3px] border-white rounded-full z-20 flex items-center justify-center shadow-sm">
                  <PiCheckCircleFill className="text-white" size={16} />
               </div>
            )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#4B4B4B] tracking-tight">
            {displayName}
          </h2>
          <p className="text-[#AFB6BB] text-[16px] font-bold mt-1">
            {displayEmail || 'Guest Account'}
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="w-full mb-8">
           <h3 className="text-xl font-extrabold text-[#4B4B4B] text-left mb-4 px-1">Statistics</h3>
           <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
              
              <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-[#FF9600]/10 flex items-center justify-center mt-1">
                   <PiFireFill className="text-[#FF9600]" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{displayStreak}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Day Streak</p>
                 </div>
              </div>

              <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-[#FFC800]/10 flex items-center justify-center mt-1">
                   <PiLightningFill className="text-[#FFC800]" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{displayXp}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total XP</p>
                 </div>
              </div>

              <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-[#1CB0F6]/10 flex items-center justify-center mt-1">
                   <PiBookOpenFill className="text-[#1CB0F6]" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{learnedCards.length}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Words Learned</p>
                 </div>
              </div>

              <div className="bg-white border-[3px] border-b-[4px] border-[#E5E5E5] rounded-[24px] p-4 flex items-start gap-3 hover:bg-[#F7F7F7] transition-all cursor-default overflow-hidden">
                 <div className="w-10 h-10 shrink-0 rounded-full bg-[#58CC02]/10 flex items-center justify-center mt-1">
                   <PiCheckCircleFill className="text-[#58CC02]" size={24} />
                 </div>
                 <div className="text-left flex flex-col justify-center min-w-0">
                   <h3 className="text-xl md:text-2xl font-extrabold text-[#4B4B4B] truncate">{Object.keys(srsData).length}</h3>
                   <p className="text-[13px] md:text-[14px] font-bold uppercase tracking-widest text-[#AFB6BB] truncate mt-0.5">Total Reviews</p>
                 </div>
              </div>

           </div>
        </div>

        {/* Action / Review Box / Garden */}
        <div className="w-full mb-10">
          <GardenVisualization onWaterGarden={onStartReview} />
        </div>


        {/* Account / Community Area */}
        <div className="w-full bg-white border-[3px] border-[#E5E5E5] rounded-[24px] p-5 overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#CE82FF] flex items-center justify-center shrink-0">
               <PiMedalFill size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-[18px] font-extrabold text-[#4B4B4B]">Community Sync</h3>
              <p className="text-[#AFB6BB] text-[14px] font-bold">Help cache AI mnemonics</p>
            </div>
          </div>
          
          <div className="bg-[#F7F7F7] rounded-2xl p-4 mb-4">
             <p className="text-[#AFB6BB] text-[14px] font-medium leading-relaxed">
                By signing in with Google, any smart mnemonics you generate will be cached to the public community pool, helping everyone save on generation times and AI tokens.
             </p>
          </div>

          {!currentUser ? (
            <div className="flex flex-col gap-3">
              <Soft3DButton 
                variant="custom" 
                className="w-full bg-[#1CB0F6] border-[#1899D6] text-white hover:brightness-110 active:brightness-95 uppercase tracking-widest font-extrabold py-4"
                onClick={onSignInClick}
              >
                <PiSignInBold size={20} />
                Sign In to Sync
              </Soft3DButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                 onClick={handleLogout}
                 className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-[3px] border-b-[4px] border-[#E5E5E5] text-[#FF4B4B] font-extrabold hover:bg-[#FFF0F0] hover:border-[#FF4B4B]/30 active:border-b-[3px] active:translate-y-[1px] transition-all"
              >
                 <PiSignOutBold size={20} /> SIGN OUT
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Settings Bottom Drawer */}
      <BottomDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="flex flex-col gap-6 pb-6 text-left">
          {/* Header */}
          <div className="border-b-[3px] border-[#F0F0F0] pb-4">
            <h3 className="text-2xl font-extrabold text-[#4B4B4B] tracking-tight">Settings</h3>
            <p className="text-[#AFB6BB] text-sm font-bold mt-1">Customize your learning experience</p>
          </div>

          {/* Character Preference setting */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#AFB6BB]">Chinese Character Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCharacterPreference('simplified')}
                className={`py-4 rounded-[20px] font-extrabold border-[3px] border-b-[5px] active:border-b-[0px] active:translate-y-[5px] transition-all text-center
                  ${characterPreference === 'simplified'
                    ? 'bg-[#1CB0F6] border-[#1899D6] text-white'
                    : 'bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-[#F7F7F7]'
                  }`}
              >
                Simplified (简体)
              </button>
              <button
                onClick={() => setCharacterPreference('traditional')}
                className={`py-4 rounded-[20px] font-extrabold border-[3px] border-b-[5px] active:border-b-[0px] active:translate-y-[5px] transition-all text-center
                  ${characterPreference === 'traditional'
                    ? 'bg-[#1CB0F6] border-[#1899D6] text-white'
                    : 'bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-[#F7F7F7]'
                  }`}
              >
                Traditional (繁體)
              </button>
            </div>
          </div>

          <div className="w-full h-[3px] bg-[#F7F7F7]" />

          {/* Reset Progress Danger Button */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#FF4B4B]">Danger Zone</label>
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="w-full py-4 rounded-[20px] bg-[#FFF0F0] hover:bg-[#FFE5E5] border-[3px] border-b-[5px] border-[#FF4B4B]/20 hover:border-[#FF4B4B]/30 text-[#FF4B4B] font-extrabold transition-all text-center flex items-center justify-center gap-2 active:border-b-[0px] active:translate-y-[5px]"
            >
              <PiTrashBold size={18} />
              RESET ALL LEARNING PROGRESS
            </button>
          </div>
        </div>
      </BottomDrawer>

      {/* Reset Confirmation Overlay Modal */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] px-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] max-w-sm w-full p-6 text-center shadow-2xl relative z-10"
          >
            <div className="w-16 h-16 rounded-full bg-[#FFF0F0] flex items-center justify-center mx-auto mb-4">
               <PiTrashBold className="text-[#FF4B4B]" size={28} />
            </div>
            <h4 className="text-xl md:text-2xl font-extrabold text-[#FF4B4B] mb-2">Are you sure?</h4>
            <p className="text-[#4B4B4B] font-bold text-sm mb-6 leading-relaxed">
              This will permanently delete your word stats, SRS intervals, and daily learning history. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <Soft3DButton
                variant="custom"
                className="w-full bg-[#FF4B4B] border-[#EA2B2B] text-white font-extrabold uppercase py-3.5 tracking-wider text-sm"
                onClick={handleResetProgress}
              >
                Yes, Reset Everything
              </Soft3DButton>
              <button
                onClick={() => setIsConfirmResetOpen(false)}
                className="w-full py-3 rounded-xl border border-transparent font-extrabold text-[#AFB6BB] hover:bg-[#F7F7F7] hover:text-[#4B4B4B] transition-all text-[15px]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
