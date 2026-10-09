import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from './UserAvatar';

/** The signed-in user's avatar as a button; sits at the right of top-level workspace headers. */
export function ProfileAvatarButton({ onClick }: { onClick: () => void }) {
  const { currentUser } = useAuth();
  const avatarValue = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
  const avatarUrl = typeof avatarValue === 'string' ? avatarValue : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile"
      className="flex shrink-0 items-center justify-center rounded-full focus-ring"
    >
      <UserAvatar src={avatarUrl} size="md" />
    </button>
  );
}
