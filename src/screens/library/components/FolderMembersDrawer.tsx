import { ActionButton, Avatar, Drawer, LoadingScreen } from '../../../lib/widgets';
import type { UserFolder } from '../../../types/models';
import type { FolderMember } from '../../../services/folderCollabService';
import { memberAvatarColor, ownsFolder } from '../../../utils/vocabulary/folderCollaboration';

interface Props {
  folder: UserFolder | undefined;
  members: FolderMember[] | null;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onRetry: () => void;
  onRemove: (userId: string) => void;
  onInvite: (rotate: boolean) => void;
  onLeave: () => void;
}

export function FolderMembersDrawer({ folder, members, error, busy, onClose, onRetry, onRemove, onInvite, onLeave }: Props) {
  const owner = ownsFolder(folder);
  return <Drawer isOpen={Boolean(folder)} onClose={onClose} title="Members" size="sm" mdPlacement="side" tone="canvas">
    {folder && <>
      <p className="mb-4 break-words text-sm font-bold text-ui-muted-strong">{folder.name}</p>
      {error ? <div role="alert"><p className="text-sm font-bold text-ui-muted-strong">{error}</p><ActionButton variant="quiet" onClick={onRetry}>Try again</ActionButton></div>
        : !members ? <LoadingScreen inline message="Loading members…" />
        : <ul className="space-y-4">
          {members.map((member) => <li key={member.user_id} className="flex items-center gap-3">
            <Avatar name={member.display_name || 'Learner'} color={memberAvatarColor(member.avatar_color)} />
            <div className="min-w-0 flex-1"><p className="break-words font-extrabold text-ui-ink">{member.display_name || 'Learner'}</p><p className="text-xs font-bold text-ui-muted">{member.role === 'owner' ? 'Owner' : 'Editor'}</p></div>
            {owner && member.role === 'editor' && <ActionButton variant="quiet" size="sm" disabled={busy} onClick={() => onRemove(member.user_id)}>Remove</ActionButton>}
          </li>)}
        </ul>}
      <div className="mt-6 flex flex-col items-start gap-2 pb-6">
        {owner ? <ActionButton variant="quiet" size="sm" onClick={() => onInvite(true)}>Reset invite link</ActionButton>
          : <>
            {folder.inviteCode && <ActionButton variant="quiet" size="sm" onClick={() => onInvite(false)}>Copy invite link</ActionButton>}
            <ActionButton variant="danger" size="sm" onClick={onLeave}>Leave folder</ActionButton>
          </>}
      </div>
    </>}
  </Drawer>;
}
