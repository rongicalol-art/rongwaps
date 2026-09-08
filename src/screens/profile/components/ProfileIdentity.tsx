import React from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { UserSnapshot } from '../../../store/useAppStore';

interface ProfileIdentityProps {
  currentUser: UserSnapshot | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}

/**
 * Calm, centered identity hero. Unframed on the canvas: a soft avatar, the
 * learner's name, one muted status line, and a single primary action. Guests
 * get a neutral person mark and a "Sign in" action — never a story character
 * or a Chinese glyph.
 */
export function ProfileIdentity({
  currentUser,
  onOpenSignIn,
  onSignOut,
  isSigningOut,
}: ProfileIdentityProps) {
  const isSignedIn = Boolean(currentUser);
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url;
  const displayName =
    currentUser?.fullName || currentUser?.name || currentUser?.email?.split('@')[0] || 'Guest';
  const handle = currentUser?.email ? `@${currentUser.email.split('@')[0]}` : 'guest';

  return (
    <section className="flex w-full flex-col items-center pt-2 text-center sm:pt-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full ring-4 ring-brand-primary/10 sm:h-24 sm:w-24">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-primary/10">
            <AppIcon name="profile" size={40} className="text-brand-primary-deep" />
          </span>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-black tracking-tight text-ui-ink-strong sm:text-3xl">
        {isSignedIn ? displayName : 'Guest'}
      </h1>
      <p className="mt-1 text-sm font-bold text-ui-muted">
        {isSignedIn ? handle : 'Progress is saved on this device'}
      </p>

      {isSignedIn ? (
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-feedback-success-edge">
            <span className="h-2 w-2 rounded-full bg-feedback-success" />
            Progress synced
          </span>
          <span className="h-3 w-px bg-ui-divider" />
          <ActionButton
            variant="quiet"
            size="sm"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="text-ui-muted-strong"
          >
            <AppIcon name="signOut" size={16} />
            <span>Sign out</span>
          </ActionButton>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-[260px]">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={onOpenSignIn}
            className="font-black uppercase tracking-wider"
          >
            <AppIcon name="signIn" size={20} />
            <span>Sign in</span>
          </ActionButton>
        </div>
      )}
    </section>
  );
}
