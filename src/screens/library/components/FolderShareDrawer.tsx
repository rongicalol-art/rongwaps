import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, Avatar, ConfirmationDialog, Drawer, IconActionButton, LoadingScreen } from '../../../lib/widgets';
import type { UserFolder } from '../../../types/models';
import type { FolderMember } from '../../../services/folderCollabService';
import { memberAvatarColor, isFolderOwner } from '../../../utils/vocabulary/folderCollaboration';

interface Props {
  folder: UserFolder | undefined;
  currentUserId?: string;
  members: FolderMember[] | null;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onRetry: () => void;
  onRemove: (userId: string) => void;
  onSetRole: (userId: string, role: 'viewer' | 'editor') => void;
  onCopyLink: () => Promise<boolean>;
  onLeave: () => void;
}

export function FolderShareDrawer({ folder, currentUserId, members, error, busy, onClose, onRetry, onRemove, onSetRole, onCopyLink, onLeave }: Props) {
  const owner = isFolderOwner(folder);
  const [copied, setCopied] = useState(false);
  const [confirmation, setConfirmation] = useState<FolderMember | null>(null);
  useEffect(() => { setCopied(false); setConfirmation(null); }, [folder?.id]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return <>
    <Drawer isOpen={Boolean(folder)} onClose={onClose} title={`Share “${folder?.name ?? ''}”`} size="md" mdPlacement="side" tone="canvas">
      {folder && <>
        <ActionButton fullWidth size="lg" loading={busy} loadingLabel="Updating…" onClick={async () => { if (await onCopyLink()) setCopied(true); }} className="normal-case tracking-normal">
          <AppIcon name="link" size={20} /><span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
        </ActionButton>
        <h3 className="mb-4 mt-7 text-sm font-extrabold text-ui-muted-strong">People</h3>
        {error ? <div role="alert"><p className="text-sm font-bold text-ui-muted-strong">{error}</p><ActionButton variant="quiet" onClick={onRetry}>Try again</ActionButton></div>
          : !members ? <LoadingScreen inline message="Loading people…" />
          : <ul className="space-y-4">
            {members.map((member) => {
              const name = member.display_name || 'Learner';
              return <li key={member.user_id} className="flex items-center gap-2 sm:gap-3">
                <Avatar name={name} color={memberAvatarColor(member.avatar_color)} />
                <p className="min-w-0 flex-1 break-words text-sm font-extrabold text-ui-ink">{name}{member.user_id === currentUserId ? ' (you)' : ''}</p>
                {member.role === 'owner' ? <span className="text-sm font-bold text-ui-muted">Owner</span>
                  : owner ? <div className="flex shrink-0 items-center gap-1">
                    <div className="flex gap-1" role="group" aria-label={`Access for ${name}`}>
                      {(['viewer', 'editor'] as const).map((role) => <ActionButton
                        key={role} variant="secondary" size="sm" aria-pressed={member.role === role} disabled={busy}
                        edgeColor={member.role === role ? 'var(--color-brand-primary)' : undefined}
                        frontClassName={member.role === role ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep normal-case tracking-normal' : 'normal-case tracking-normal'}
                        onClick={() => { if (member.role !== role) onSetRole(member.user_id, role); }}
                      >{role === 'viewer' ? 'View' : 'Edit'}</ActionButton>)}
                    </div>
                    <IconActionButton size="sm" variant="quiet" label={`Remove ${name}`} icon={<AppIcon name="close" size={16} />} disabled={busy} onClick={() => setConfirmation(member)} />
                  </div> : <span className="shrink-0 text-sm font-bold text-ui-muted">{member.role === 'viewer' ? 'Can view' : 'Can edit'}</span>}
              </li>;
            })}
          </ul>}
        {!owner && <div className="mt-8 pb-6">
          <ActionButton variant="quiet" size="sm" disabled={busy} className="normal-case tracking-normal text-feedback-danger-text hover:bg-feedback-danger/10" onClick={onLeave}>
            Leave folder
          </ActionButton>
        </div>}
      </>}
    </Drawer>
    {folder && confirmation && <ConfirmationDialog
      title={`Remove ${confirmation.display_name || 'Learner'}?`}
      description="They will lose access to this folder."
      confirmLabel="Remove" cancelLabel="Cancel"
      onCancel={() => setConfirmation(null)}
      onConfirm={() => { onRemove(confirmation.user_id); setConfirmation(null); }}
    />}
  </>;
}
