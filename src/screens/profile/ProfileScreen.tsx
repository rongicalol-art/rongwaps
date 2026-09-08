import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';
import {
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { SignInWindow } from '../auth';
import { ProfileIdentity } from './components/ProfileIdentity';
import { ProgressSummary } from './components/ProgressSummary';
import { useReviewOverview } from './hooks/useReviewOverview';

interface ProfileScreenProps {
  /** Launches the review session over all SRS-due words. */
  onStartReview: () => void;
  /** Mobile hamburger shown overlaid left in the sticky header. */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
}

export function ProfileScreen({ onStartReview, menuToggle }: ProfileScreenProps) {
  const { currentUser, isLoading: isAuthLoading, logout, isAuthActionLoading } = useAuth();
  const overview = useReviewOverview();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const favorites = useAppStore((state) => state.favorites);

  return (
    <div className="relative flex w-full flex-1 flex-col text-ui-ink">
      <StickyWorkspaceHeader title="Profile" align="left" menuToggle={menuToggle} />

      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-4 pb-32 pt-2 sm:gap-8 sm:px-6 md:pb-24 lg:max-w-2xl">
        {isAuthLoading ? (
          <div className="flex w-full flex-col gap-6">
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-ui-surface" />
            <div className="mx-auto h-8 w-40 animate-pulse rounded-full bg-ui-surface" />
            <div className="h-16 w-full animate-pulse rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface" />
          </div>
        ) : (
          <>
            <ProfileIdentity
              currentUser={currentUser}
              onOpenSignIn={() => setIsAuthOpen(true)}
              onSignOut={logout}
              isSigningOut={isAuthActionLoading}
            />

            <ProgressSummary
              overview={overview}
              favoriteCount={favorites.length}
              onStartReview={onStartReview}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {isAuthOpen && <SignInWindow onClose={() => setIsAuthOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
