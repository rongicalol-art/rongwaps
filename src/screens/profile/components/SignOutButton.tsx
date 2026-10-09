import { useEffect, useState } from 'react';
import { cn } from '../../../utils/cn';

const CONFIRM_MS = 3000;

/** Sign out as quiet text at the bottom; the first tap asks, the second signs out. */
export function SignOutButton({ onSignOut, isSigningOut }: { onSignOut: () => void | Promise<void>; isSigningOut: boolean }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return undefined;
    const timer = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        disabled={isSigningOut}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          setConfirming(false);
          void onSignOut();
        }}
        className={cn(
          'min-h-11 rounded-control px-4 text-[15px] font-black transition-colors focus-ring disabled:opacity-60',
          confirming
            ? 'bg-feedback-danger text-white'
            : 'text-ui-muted hover:bg-feedback-danger-surface hover:text-feedback-danger-edge',
        )}
      >
        {isSigningOut ? 'Signing out…' : confirming ? 'Tap again to sign out' : 'Sign out'}
      </button>
    </div>
  );
}
