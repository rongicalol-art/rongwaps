import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { Soft3DButton } from './Soft3DButton';
import { AppIcon } from './AppIcon';
import { SAMPLE_BOOKS } from '../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

export interface MainHeaderProps {
  activeBook: CourseBook;
  title?: string;
  leftIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  extraLeftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  extraRightContent?: React.ReactNode;
  showPlayButton?: boolean;
  onPlayClick?: () => void;
}

export function MainHeader({ 
  activeBook, 
  title = "Study Space",
  leftIcon,
  onLeftIconClick,
  extraLeftContent,
  rightContent,
  extraRightContent,
  showPlayButton, 
  onPlayClick
}: MainHeaderProps) {
  const { isSearchOpen } = useAppStore();
  const { currentUser } = useAuth();
  const resolvedLeftIcon = leftIcon !== undefined ? leftIcon : (
    (currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture) ? (
      <img
        src={currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border-2 border-ui-border bg-ui-surface object-cover transition-all duration-200"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activeBook.accentBg}`}>
        <span className="font-bold text-white">{activeBook.title?.[0] || 'S'}</span>
      </span>
    )
  );

  return (
    <header className="window-header sticky top-0 z-[100] flex w-full flex-col border-b-2 border-ui-border bg-ui-surface">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6 md:px-12">
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
            {resolvedLeftIcon !== null && (
              onLeftIconClick ? (
                <button
                  type="button"
                  onClick={onLeftIconClick}
                  aria-label="Open profile"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-all hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
                >
                  {resolvedLeftIcon}
                </button>
              ) : resolvedLeftIcon
            )}
            <div
              className={cn(
                "font-extrabold text-[#4B4B4B] tracking-tight whitespace-nowrap shrink-0 transition-all duration-200",
                "text-[19px] md:text-xl"
              )}
            >
              {title}
            </div>
          </motion.div>
        </motion.div>
        <motion.div layout transition={{ type: "spring", stiffness: 450, damping: 30 }} className="flex items-center gap-2 justify-end flex-1 max-w-full">
          {rightContent !== undefined ? (
            rightContent
          ) : (
            <motion.div
              initial={false}
              animate={{
                scale: showPlayButton ? 1 : 0.96,
                opacity: showPlayButton ? 1 : 0.82,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 25,
                mass: 1
              }}
              className="flex items-center justify-center shrink-0"
            >
              <Soft3DButton
                type="button"
                disabled={!showPlayButton}
                onClick={showPlayButton ? onPlayClick : undefined}
                aria-label={showPlayButton ? "Start practice" : "Practice not available"}
                variant={showPlayButton ? "custom" : "locked"}
                depth="sm"
                className={cn(
                  "min-h-11 w-auto rounded-full px-3 py-2 text-[11px] shadow-sm transition-all duration-150 md:px-4 md:py-2.5 md:text-[12px]",
                  showPlayButton
                    ? `${activeBook.accentBg} ${activeBook.buttonEdge} text-white`
                    : "bg-[#F7F7F7] text-[#AFB6BB] border-[#E5E5E5]"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 font-black tracking-wide uppercase transition-transform duration-300",
                  "text-[12px] md:text-[13px]",
                  !showPlayButton ? 'scale-95 opacity-80' : 'scale-100 group-active:scale-95'
                )}>
                  <AppIcon name="play" size={16} className="shrink-0" />
                  <span>Practice</span>
                </div>
              </Soft3DButton>
            </motion.div>
          )}

          {extraRightContent}
        </motion.div>
      </div>
    </header>
  );
}
