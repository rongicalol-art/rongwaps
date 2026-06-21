import React, { useState } from 'react';
import { PiPlayFill, PiGearBold, PiSignInBold } from 'react-icons/pi';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';

interface MainHeaderProps {
  activeBook: any; // Using any for simplicity here to access .accentBgLight, .accent, etc.
  title?: string;
  leftIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  onSignInClick?: () => void;
  extraLeftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  extraRightContent?: React.ReactNode;
  showPlayButton?: boolean;
  onPlayClick?: () => void;
  compact?: boolean;
}

export function MainHeader({ 
  activeBook, 
  title = "Study Space",
  leftIcon,
  onLeftIconClick,
  onSignInClick,
  extraLeftContent,
  rightContent,
  extraRightContent,
  showPlayButton, 
  onPlayClick,
  compact = false
}: MainHeaderProps) {
  const { characterPreference, setCharacterPreference, isSearchOpen } = useAppStore();
  const { currentUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className={`flex flex-col w-full sticky top-0 z-[100] bg-white transition-all duration-200 ease-out border-b-[4px] border-[#E5E5E5]`}>
      <div className={cn(
        "flex items-center justify-between px-6 md:px-12 w-full max-w-5xl mx-auto relative z-10 transition-all duration-200 ease-out",
        compact ? "py-2" : "py-3 md:py-4"
      )}>
        <motion.div layout transition={{ type: "spring", stiffness: 450, damping: 30 }} className="flex items-center gap-3 relative overflow-hidden">
          <div className="relative z-10 shrink-0">
             {extraLeftContent}
          </div>
          <motion.div 
            layout
            initial={false}
            animate={{
               opacity: isSearchOpen ? 0 : 1,
               width: isSearchOpen ? 0 : 'auto',
               scale: isSearchOpen ? 0.8 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="flex items-center gap-3 origin-left whitespace-nowrap"
          >
            <div 
              onClick={onLeftIconClick} 
              className={onLeftIconClick ? "cursor-pointer hover:opacity-80 active:scale-95 transition-all" : ""}
            >
              {leftIcon !== undefined ? leftIcon : (
                (currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture) ? (
                  <img 
                    src={currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture} 
                    alt="Profile" 
                    className={cn(
                      "rounded-full shrink-0 transition-all duration-200 object-cover border-[2px] border-[#E5E5E5] bg-white shadow-sm",
                      compact ? "h-8 w-8" : "h-10 w-10"
                    )}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={cn(
                    `rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${activeBook.accentBg}`,
                    compact ? "h-8 w-8" : "h-10 w-10"
                  )}>
                    <span className="text-white font-bold">{activeBook.title?.[0] || 'S'}</span>
                  </div>
                )
              )}
            </div>
            <h1 
              className={cn(
                "font-extrabold text-[#4B4B4B] tracking-tight whitespace-nowrap shrink-0 transition-all duration-200",
                compact ? "text-[15px] md:text-[16px]" : "text-[19px] md:text-xl"
              )}
            >
              {title}
            </h1>
          </motion.div>
        </motion.div>
        <motion.div layout transition={{ type: "spring", stiffness: 450, damping: 30 }} className="flex items-center gap-2 justify-end flex-1 max-w-full">
          {/* If user is not signed in and onSignInClick is provided, show a "Sign In" button in the header */}
          {!currentUser && onSignInClick ? (
            <button
              onClick={onSignInClick}
              className={cn(
                "flex items-center gap-2 rounded-[16px] bg-[#1CB0F6] text-white font-extrabold border-b-[3px] border-[#1899D6] active:border-b-[0px] active:translate-y-[3px] transition-all hover:brightness-110",
                compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              )}
            >
              <PiSignInBold size={16} />
              Sign In
            </button>
          ) : rightContent !== undefined ? (
            rightContent
          ) : (
            /* Header Play Button (2 States: Active / Inactive) */
            <motion.div
              initial={false}
              animate={{ 
                scale: showPlayButton ? 1 : 0.8,
                opacity: showPlayButton ? 1 : 0.8,
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 25,
                mass: 1
              }}
              className="flex items-center justify-center shrink-0"
            >
              <motion.button 
                disabled={!showPlayButton}
                onClick={showPlayButton ? onPlayClick : undefined}
                aria-label={showPlayButton ? "Start practice" : "Practice not available"}
                animate={{
                  borderBottomWidth: 4
                }}
                whileTap={showPlayButton ? { y: 4, borderBottomWidth: 0, transition: { duration: 0.05 } } : {}}
                className={cn(
                   "relative rounded-full flex items-center justify-center outline-none group border-[3px] transition-colors duration-150 w-full h-full",
                   showPlayButton
                      ? `text-white ${activeBook.accentBg} ${activeBook.buttonEdge} border-transparent cursor-pointer`
                      : `bg-[#F7F7F7] text-[#AFB6BB] border-[#E5E5E5] cursor-not-allowed`
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div 
                   className={cn("ml-0.5 transition-transform duration-300", !showPlayButton ? 'scale-90 opacity-70' : 'scale-100 group-active:scale-95')}
                >
                  <PiPlayFill size={20} />
                </div>
              </motion.button>
            </motion.div>
          )}
          {extraRightContent}
        </motion.div>
      </div>
    </header>
  );
}
