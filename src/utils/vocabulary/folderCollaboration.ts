import type { UserFolder } from '../../types/models';
import type { AvatarColor } from '../../lib/widgets';

/** Legacy/guest folders have no role and remain locally owned. */
export function ownsFolder(folder: UserFolder | undefined): boolean {
  return Boolean(folder && folder.role !== 'editor');
}

export function memberAvatarColor(color: string | null): AvatarColor {
  return color === 'honey' || color === 'jade' || color === 'plum' || color === 'ink' ? color : 'blue';
}
