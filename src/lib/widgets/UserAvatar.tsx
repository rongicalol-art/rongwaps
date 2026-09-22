import { useState } from 'react';
import { AppIcon, type AppIconName } from './AppIcon';
import { cn } from '../../utils/cn';

export type UserAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface UserAvatarProps {
  /** Image URL for the user profile picture. */
  src?: string | null;
  /** Alt text for accessibility. */
  alt?: string;
  /** Size preset for the avatar container. */
  size?: UserAvatarSize;
  /** Whether to show a brand ring border. */
  ring?: boolean;
  /** Fallback icon when no image is supplied or load fails. Defaults to 'profile'. */
  fallbackIcon?: AppIconName;
  /** Additional container classes. */
  className?: string;
}

const SIZE_CONFIG: Record<
  UserAvatarSize,
  {
    container: string;
    iconSize: number;
  }
> = {
  sm: { container: 'h-8 w-8', iconSize: 18 },
  md: { container: 'h-10 w-10', iconSize: 22 },
  lg: { container: 'h-12 w-12', iconSize: 24 },
  xl: { container: 'h-14 w-14', iconSize: 28 },
};

export function UserAvatar({
  src,
  alt = 'User avatar',
  size = 'md',
  ring = false,
  fallbackIcon = 'profile',
  className,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const config = SIZE_CONFIG[size];

  const showImage = Boolean(src && !hasError);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-surface text-ui-muted-strong select-none',
        config.container,
        ring && 'ring-2 ring-brand-primary/20',
        className
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <AppIcon name={fallbackIcon} size={config.iconSize} className="text-brand-primary-deep" />
      )}
    </div>
  );
}
