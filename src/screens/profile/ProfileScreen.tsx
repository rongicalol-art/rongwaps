import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';
import {
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { SignInWindow } from '../auth';
import { ProfileHeroCard } from './components/ProfileHeroCard';
import { ReviewHubCard } from './components/ReviewHubCard';
import { LearningStatsGrid } from './components/LearningStatsGrid';
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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
      console.error('ProfileScreen: sign-out failed:', error);
      setAccountError("Couldn't sign you out. Check your connection and try again.");
    }
  }, [logout]);

  return (
    <div className="relative flex w-full flex-1 flex-col text-ui-ink">
      <StickyWorkspaceHeader title="Profile" align="left" menuToggle={menuToggle} />

      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-6 px-4 pb-32 pt-2 sm:gap-7 sm:px-6 md:pb-24 lg:max-w-2xl">
        {isAuthLoading ? (
          <div className="flex w-full flex-col gap-6">
            <div className="h-32 w-full animate-pulse rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface" />
            <div className="h-56 w-full animate-pulse rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="h-24 animate-pulse rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface" />
              <div className="h-24 animate-pulse rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface" />
            </div>
          </div>
        ) : (
          <>
            {/* 1. Identity & Cloud Sync */}
            <ProfileHeroCard
              currentUser={currentUser}
              onOpenSignIn={() => setIsAuthOpen(true)}
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
          </>
        )}
      </div>

      <AnimatePresence>
        {isAuthOpen && <SignInWindow onClose={() => setIsAuthOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
