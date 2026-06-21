import React from 'react';
import { PiSignInBold, PiUserFill } from 'react-icons/pi';
import { BottomDrawer, Soft3DButton, LottiePlayer } from '../../lib/widgets';
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
    } catch (error: any) {
      console.error("Login failed", error);
      setAuthError(error.message || 'Failed to login with Google.');
      setIsSigningIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    onClose();
  };

  return (
    <BottomDrawer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center pb-6">
        {/* Lottie Animation Logo */}
        <div className="w-32 h-32 mb-4">
          <LottiePlayer animationData={rainbowAnimation} loop={true} />
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black text-[#4B4B4B] tracking-tight mb-2">
          Tactile Chinese
        </h2>
        <p className="text-[#AFB6BB] text-[14px] font-bold max-w-xs mb-6 leading-relaxed">
          Sign in to sync your progress across devices and contribute mnemonics to the community.
        </p>

        {/* Auth Error Display */}
        {authError && (
          <div className="w-full mb-4 p-4 bg-red-50 text-red-500 text-sm font-bold rounded-[16px] border border-red-200">
            {authError}
          </div>
        )}

        {/* Login actions */}
        <div className="w-full flex flex-col gap-3">
          <Soft3DButton 
            variant="custom" 
            className="w-full bg-[#1CB0F6] border-[#1899D6] text-white hover:brightness-110 active:brightness-95 uppercase tracking-widest font-extrabold py-4"
            onClick={handleGoogleLogin}
            disabled={isSigningIn || isLoading}
          >
            {isSigningIn ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing In...
              </>
            ) : (
              <>
                <PiSignInBold size={20} />
                Sign In with Google
              </>
            )}
          </Soft3DButton>

          <Soft3DButton 
            variant="custom" 
            className="w-full bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-gray-50 uppercase tracking-widest font-extrabold py-4"
            onClick={handleContinueAsGuest}
          >
            <PiUserFill size={20} className="text-[#AFB6BB]" />
            Browse as Guest
          </Soft3DButton>
        </div>

        {/* Info footer */}
        <div className="mt-6 text-xs font-bold text-[#AFB6BB] max-w-xs leading-relaxed">
          By signing in, your progress will sync automatically across all devices.
        </div>
      </div>
    </BottomDrawer>
  );
}