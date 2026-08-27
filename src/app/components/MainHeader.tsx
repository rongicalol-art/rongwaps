import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { AppIcon } from '../../lib/widgets';
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
    <header className="sticky top-0 z-[100] flex min-h-16 w-full flex-col bg-ui-canvas/95 backdrop-blur-md">
      <div className="relative z-10 mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-4 py-2 sm:px-6 md:px-12">
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
                "shrink-0 whitespace-nowrap font-extrabold tracking-tight text-ui-ink transition-all duration-200",
                "text-[19px] md:text-xl"
              )}
            >
              {title}
            </div>
          </motion.div>
        </motion.div>
        <motion.div layout transition={{ type: "spring", stiffness: 450, damping: 30 }} className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {rightContent !== undefined ? (
            rightContent
          ) : (
            showPlayButton ? (
              <button
                type="button"
                onClick={onPlayClick}
                aria-label="Start practice"
                title="Start practice"
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] text-white outline-none transition-transform active:scale-95 focus-visible:ring-4 focus-visible:ring-brand-primary/25',
                  activeBook.accentBg,
                )}
              >
                <AppIcon name="play" size={18} />
              </button>
            ) : <span />
          )}

          {extraRightContent}
        </motion.div>
      </div>
    </header>
  );
}
