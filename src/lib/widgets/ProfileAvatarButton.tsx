import { UserAvatar } from './UserAvatar';

/** The signed-in user's avatar as a button; sits at the right of top-level workspace headers. */
export function ProfileAvatarButton({ onClick, src }: { onClick: () => void; src?: string | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile"
      className="flex shrink-0 items-center justify-center rounded-full focus-ring"
    >
      <UserAvatar src={src} size="md" />
    </button>
  );
}
