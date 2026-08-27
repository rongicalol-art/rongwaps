import React from 'react';
import { ActionButton, AppIcon, BottomDrawer, LottiePlayer } from '../../lib/widgets';
import { useAuth } from '../../hooks/useAuth';
import rainbowAnimation from '../../assets/animations/rainbow_twist.json';

interface AuthScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthScreen({ isOpen, onClose }: AuthScreenProps) {
  const { loginWithGoogle, isLoading, currentUser } = useAuth();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  // Auto-close when user successfully signs in
  React.useEffect(() => {
    if (currentUser && isOpen) {
      onClose();
    }
  }, [currentUser, isOpen, onClose]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setIsSigningIn(true);
      await loginWithGoogle();
      // Auth change listener in useAuth will update Zustand store
    } catch (error: unknown) {
      console.error("Login failed", error);
      setAuthError(error instanceof Error ? error.message : 'Failed to login with Google.');
      setIsSigningIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    onClose();
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose} workspaceBound={false}>
      <div className="flex flex-col items-center text-center pb-6">
        {/* Lottie Animation Logo */}
        <div className="w-32 h-32 mb-4">
          <LottiePlayer animationData={rainbowAnimation} loop={true} />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-2xl font-black tracking-tight text-ui-ink-strong md:text-3xl">
          Tactile Chinese
        </h2>
        <p className="mb-6 max-w-xs text-[14px] font-bold leading-relaxed text-ui-muted">
          Sign in to sync your learning progress across devices.
        </p>

        {/* Auth Error Display */}
        {authError && (
          <div className="mb-4 w-full rounded-[16px] border border-feedback-danger/30 bg-feedback-danger-surface p-4 text-sm font-bold text-feedback-danger">
            {authError}
          </div>
        )}

        {/* Login actions */}
        <div className="w-full flex flex-col gap-3">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
            loading={isSigningIn || isLoading}
            loadingLabel="Signing in"
            className="uppercase tracking-widest"
          >
            <AppIcon name="signIn" size={20} />
            Sign In with Google
          </ActionButton>

          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleContinueAsGuest}
            className="uppercase tracking-widest"
          >
            <AppIcon name="profile" size={20} className="text-ui-muted-strong" />
            Browse as Guest
          </ActionButton>
        </div>

        {/* Info footer */}
        <div className="mt-6 max-w-xs text-xs font-bold leading-relaxed text-ui-muted">
          By signing in, your progress will sync automatically across all devices.
        </div>
      </div>
    </BottomDrawer>
  );
}
