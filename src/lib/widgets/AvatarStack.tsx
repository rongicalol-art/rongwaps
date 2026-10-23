import type { CSSProperties } from 'react';

/** Profile avatar palette key (see `AVATAR_COLORS`). */
export type AvatarColor = 'blue' | 'honey' | 'jade' | 'plum' | 'ink';

export function avatarStyle(color: AvatarColor): CSSProperties {
  const background = color === 'blue' ? 'avatar-blue-bg' : color === 'ink' ? 'ui-ink-strong' : `cover-${color}-bg`;
  const ink = color === 'ink' ? 'ui-surface' : `avatar-${color}-ink`;
  return { backgroundColor: `var(--color-${background})`, color: `var(--color-${ink})` };
}

const SIZE = { sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm', lg: 'h-10 w-10 text-base', xl: 'h-12 w-12 text-lg' } as const;
export type AvatarSize = keyof typeof SIZE;

/** Initials on the profile colour; `src` replaces them. `live` adds the small online dot. */
export function Avatar({ name, color, size = 'md', live = false, src, className = '' }: {
  name: string; color: AvatarColor; size?: AvatarSize; live?: boolean; src?: string; className?: string;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full font-black leading-none ring-2 ring-ui-surface overflow-hidden ${SIZE[size]} ${className}`}
      style={avatarStyle(color)}
      title={name}
    >
      <span aria-hidden className="select-none">{(name.trim()[0] || '?').toUpperCase()}</span>
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
      {live && <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-feedback-success ring-2 ring-ui-surface z-10" />}
    </span>
  );
}

/** Overlapping faces, at most `max`, then "+N". Renders nothing for an empty list. */
export function AvatarStack({ people, total, max = 3, size = 'sm', className = '' }: {
  people: ReadonlyArray<{ name: string; color: AvatarColor; src?: string }>; total?: number; max?: number; size?: AvatarSize; className?: string;
}) {
  if (people.length === 0) return null;
  const extra = Math.max(0, (total ?? people.length) - Math.min(max, people.length));
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="flex -space-x-2">
        {people.slice(0, max).map((person, index) => <Avatar key={index} name={person.name} color={person.color} src={person.src} size={size} />)}
      </span>
      {extra > 0 && <span className="ml-1 text-xs font-black tabular-nums text-ui-muted-strong">+{extra}</span>}
    </span>
  );
}
