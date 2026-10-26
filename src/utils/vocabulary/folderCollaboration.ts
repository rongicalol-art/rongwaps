import type { UserFolder } from '../../types/models';
import type { AvatarColor } from '../../lib/widgets';

/** Legacy/guest folders have no role and remain locally owned. */
export function isFolderOwner(folder: UserFolder | undefined): boolean {
  return Boolean(folder && (folder.role === undefined || folder.role === 'owner'));
}

export function memberAvatarColor(color: string | null): AvatarColor {
  return color === 'honey' || color === 'jade' || color === 'plum' || color === 'ink' ? color : 'blue';
}

/** View-only memberships cannot change cards or receive new cards. */
export function canEditFolder(folder: UserFolder | undefined): boolean {
  return folder?.role !== 'viewer';
}
