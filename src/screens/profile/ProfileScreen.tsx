import { debugLogger } from '../../utils/debug/debugLogger';
import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';
import {
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { ProfileHeroCard } from './components/ProfileHeroCard';
import { ReviewHubCard } from './components/ReviewHubCard';
import { LearningStatsGrid } from './components/LearningStatsGrid';
import { ProfileSkeleton } from './components/ProfileSkeleton';
import { useReviewOverview } from './hooks/useReviewOverview';

interface ProfileScreenProps {
  /** Launches the review session over all SRS-due words. */
  onStartReview: () => void;
  /** Mobile hamburger shown overlaid left in the sticky header. */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
  /** Optional override to navigate back to the curriculum path. */
  onNavigateToPath?: () => void;
  /** Optional navigation callback to favorites */
  onNavigateToFavorites?: () => void;
  /** Optional callback to create custom card */
  onCreateCustomCard?: () => void;
}

export function ProfileScreen({
  onStartReview,
  menuToggle,
  onNavigateToPath,
  onNavigateToFavorites,
  onCreateCustomCard,
}: ProfileScreenProps) {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading, logout, isAuthActionLoading } = useAuth();
  const overview = useReviewOverview();
  const [accountError, setAccountError] = useState<string | null>(null);

  // App store selectors: subscribe to primitive lengths to avoid re-rendering on element updates
  const favoriteCount = useAppStore((state) => state.favorites.length);
  const localCardsCount = useAppStore((state) => state.localFlashcards.length);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const syncError = useAppStore((state) => state.syncError);
  const setIsSettingsOpen = useAppStore((state) => state.setIsSettingsOpen);

  const handleNavigateToPath = useCallback(() => {
    if (onNavigateToPath) {
      onNavigateToPath();
    } else {
      navigate('/path');
    }
  }, [onNavigateToPath, navigate]);

  const handleNavigateToFavorites = useCallback(() => {
    if (onNavigateToFavorites) {
      onNavigateToFavorites();
    } else {
      useAppStore.getState().setLibraryActiveFolder('favorites');
      navigate('/library');
    }
  }, [onNavigateToFavorites, navigate]);

  const handleCreateCustomCard = useCallback(() => {
    if (onCreateCustomCard) {
      onCreateCustomCard();
    }
  }, [onCreateCustomCard]);

  // `useAuth.logout` rethrows on purpose (see authService), and a rejected
  // promise from an event handler is never caught by an error boundary. Without
  // this the button simply stops spinning and the learner stays signed in with
  // no explanation, so the failure is caught here and surfaced on the card.
  const handleSignOut = useCallback(async () => {
    setAccountError(null);
    try {
      await logout();
    } catch (error) {
      debugLogger.error('Auth', 'ProfileScreen: sign-out failed:', error);
      setAccountError("Couldn't sign you out. Check your connection and try again.");
    }
  }, [logout]);

  return (
    <div className="relative flex w-full flex-1 flex-col text-ui-ink">
      <StickyWorkspaceHeader title="Profile" align="left" menuToggle={menuToggle} />

      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-4 pb-32 pt-2 sm:gap-7 sm:px-6 md:pb-24 lg:max-w-2xl">
        <AnimatePresence mode="wait">
          {isAuthLoading ? (
            <motion.div
              key="profile-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full flex flex-col gap-6"
            >
              <ProfileSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="profile-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col gap-6"
            >
              {/* 1. Identity & Cloud Sync */}
              <ProfileHeroCard
                currentUser={currentUser}
                onSignOut={handleSignOut}
                isSigningOut={isAuthActionLoading}
                onOpenSettings={() => setIsSettingsOpen(true)}
                syncStatus={syncStatus}
                syncError={syncError}
                accountError={accountError}
              />

              {/* 2. Spaced Repetition Review */}
              <ReviewHubCard
                overview={overview}
                onStartReview={onStartReview}
                onNavigateToPath={handleNavigateToPath}
              />

              {/* 3. Collections & Quick Access */}
              <LearningStatsGrid
                overview={overview}
                favoriteCount={favoriteCount}
                localCardsCount={localCardsCount}
                onNavigateToFavorites={handleNavigateToFavorites}
                onCreateCustomCard={handleCreateCustomCard}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
