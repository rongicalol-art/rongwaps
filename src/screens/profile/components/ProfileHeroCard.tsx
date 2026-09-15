import React, { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { UserSnapshot } from '../../../store/useAppStore';

interface ProfileHeroCardProps {
  currentUser: UserSnapshot | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  onOpenSettings?: () => void;
}

/**
 * Elevated learner hero card. Displays avatar, name, handle, cloud sync status,
 * and sign-in / backup actions.
 */
export const ProfileHeroCard = memo(function ProfileHeroCard({
  currentUser,
  onOpenSignIn,
  onSignOut,
  isSigningOut,
}: ProfileHeroCardProps) {
  const isSignedIn = Boolean(currentUser);
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url;
  const emailPrefix = currentUser?.email ? currentUser.email.split('@')[0] : null;
  const displayName =
    currentUser?.fullName || currentUser?.name || emailPrefix || 'Guest Learner';
  const handle = emailPrefix ? `@${emailPrefix}` : null;

  return (
    <section className="relative w-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Avatar + Identity info */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-primary/10 ring-2 ring-brand-primary/20">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <AppIcon name="profile" size={26} className="text-brand-primary-deep" />
            )}
          </div>

          <div className="min-w-0 text-left">
            <h1 className="truncate text-lg font-black tracking-tight text-ui-ink-strong sm:text-xl">
              {displayName}
            </h1>
            {isSignedIn ? (
              <div className="mt-0.5 flex items-center gap-2 text-xs font-bold text-ui-muted">
                {handle && <span className="truncate">{handle}</span>}
                <span className="inline-flex items-center gap-1 rounded-full bg-feedback-success-surface px-2 py-0.5 text-[11px] font-black text-feedback-success-edge">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-feedback-success opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-feedback-success" />
                  </span>
                  Synced
                </span>
              </div>
            ) : (
              <p className="mt-0.5 truncate text-xs font-bold text-ui-muted sm:text-sm">
                Sync progress & unlock features
              </p>
            )}
          </div>
        </div>

        {/* Right: Primary account action */}
        <div className="shrink-0">
          {isSignedIn ? (
            <ActionButton
              variant="quiet"
              size="sm"
              onClick={onSignOut}
              disabled={isSigningOut}
              className="font-black uppercase tracking-wider text-ui-muted-strong hover:text-feedback-danger"
            >
              <AppIcon name="signOut" size={16} />
              <span>Sign out</span>
            </ActionButton>
          ) : (
            <ActionButton
              variant="primary"
              size="sm"
              onClick={onOpenSignIn}
              className="font-black uppercase tracking-wider"
            >
              <AppIcon name="signIn" size={16} />
              <span>Sign in</span>
            </ActionButton>
          )}
        </div>
      </div>
    </section>
  );
});
