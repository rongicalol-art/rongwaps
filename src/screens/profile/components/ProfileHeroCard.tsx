import React, { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { SyncStatus, UserSnapshot } from '../../../store/useAppStore';

interface ProfileHeroCardProps {
  currentUser: UserSnapshot | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
  onOpenSettings?: () => void;
  /** Cloud-sync state of the signed-in account. */
  syncStatus: SyncStatus;
  /** User-facing message from the last failed cloud operation, if any. */
  syncError: string | null;
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
  syncStatus,
  syncError,
}: ProfileHeroCardProps) {
  const isSignedIn = Boolean(currentUser);
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url;
  const emailPrefix = currentUser?.email ? currentUser.email.split('@')[0] : null;
  const displayName =
    currentUser?.fullName || currentUser?.name || emailPrefix || 'Guest Learner';
  const handle = emailPrefix ? `@${emailPrefix}` : null;
  // `syncError` is also written by non-sync failures (e.g. a folder delete that
  // the server rejected), so it outranks the status flag when deciding the pill.
  const hasSyncIssue = Boolean(syncError) || syncStatus === 'error';

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
              <>
                <div className="mt-0.5 flex items-center gap-2 text-xs font-bold text-ui-muted">
                  {handle && <span className="truncate">{handle}</span>}
                  <SyncStatusPill hasIssue={hasSyncIssue} isSyncing={syncStatus === 'syncing'} />
                </div>
                {syncError && (
                  <p role="alert" className="mt-1.5 text-xs font-bold leading-snug text-feedback-danger-edge">
                    {syncError}
                  </p>
                )}
              </>
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

/**
 * Cloud-sync pill. Reports what the store actually knows: a failed sync is
 * never labelled "Synced", and a save in flight is visible while it runs.
 */
function SyncStatusPill({ hasIssue, isSyncing }: { hasIssue: boolean; isSyncing: boolean }) {
  if (hasIssue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-feedback-danger-surface px-2 py-0.5 text-[11px] font-black text-feedback-danger-edge">
        <AppIcon name="error" size={12} />
        Sync issue
      </span>
    );
  }

  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ui-border bg-ui-canvas px-2 py-0.5 text-[11px] font-black text-ui-muted-strong">
        <span className="h-1.5 w-1.5 rounded-full bg-ui-muted motion-safe:animate-pulse" />
        Syncing
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-feedback-success-surface px-2 py-0.5 text-[11px] font-black text-feedback-success-edge">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-feedback-success opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-feedback-success" />
      </span>
      Synced
    </span>
  );
}
