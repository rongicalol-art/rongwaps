import { memo } from 'react';
import { AppIcon, UserAvatar } from '../../../lib/widgets';
import type { SyncStatus, UserSnapshot } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';

interface ProfileHeroCardProps {
  currentUser: UserSnapshot | null;
  /** Cloud-sync state of the signed-in account. */
  syncStatus: SyncStatus;
  /** User-facing message from the last failed cloud operation, if any. */
  syncError: string | null;
  /** User-facing message from the last failed account action (e.g. sign-out). */
  accountError?: string | null;
}

/**
 * Identity row: a large avatar, the name, the handle and a quiet sync dot. No
 * card around it; failures show as one alert underneath.
 */
export const ProfileHeroCard = memo(function ProfileHeroCard({
  currentUser,
  syncStatus,
  syncError,
  accountError,
}: ProfileHeroCardProps) {
  const avatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url;
  const emailPrefix = currentUser?.email ? currentUser.email.split('@')[0] : null;
  const displayName = currentUser?.fullName || currentUser?.name || emailPrefix || 'Learner';
  const handle = emailPrefix ? `@${emailPrefix}` : null;
  // `syncError` is also written by non-sync failures (e.g. a folder delete that
  // the server rejected), so it outranks the status flag when deciding the state.
  const hasSyncIssue = Boolean(syncError) || syncStatus === 'error';
  const isSyncing = syncStatus === 'syncing';

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <UserAvatar src={avatarUrl} alt={displayName} size="xl" ring className="h-16 w-16 shrink-0 bg-brand-primary/10" />
        <div className="min-w-0 text-left">
          <h1 className="truncate text-[22px] font-black leading-tight text-ui-ink-strong">{displayName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-ui-muted">
            {handle && <span className="truncate">{handle}</span>}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-black',
                hasSyncIssue ? 'text-feedback-danger-edge' : isSyncing ? 'text-ui-muted-strong' : 'text-feedback-success-edge',
              )}
            >
              {hasSyncIssue ? (
                <AppIcon name="error" size={13} />
              ) : (
                <span
                  aria-hidden
                  className={cn('h-2 w-2 rounded-full', isSyncing ? 'bg-ui-muted motion-safe:animate-pulse' : 'bg-feedback-success')}
                />
              )}
              {hasSyncIssue ? 'Sync issue' : isSyncing ? 'Syncing' : 'Synced'}
            </span>
          </div>
        </div>
      </div>

      {(accountError || syncError) && (
        <div role="alert" className="flex flex-col gap-1 rounded-control bg-feedback-danger-surface px-3.5 py-3 text-sm font-extrabold leading-snug text-feedback-danger-edge">
          {accountError && <p>{accountError}</p>}
          {syncError && <p>{syncError}</p>}
        </div>
      )}
    </section>
  );
});
