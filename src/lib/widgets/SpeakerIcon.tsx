import { AppIcon } from './AppIcon';

/** Bar heights as a share of the icon: a small hill, like the quiz's audio blocks. */
const BARS = [0.45, 0.8, 0.45];

/**
 * The speaker on every tap-to-hear button. `status` (from `useAudioPending`): `loading` shows a small
 * spinner while the recording is fetched, `playing` shows three sound bars rising and falling while it plays.
 */
export function SpeakerIcon({ status = null, size = 20, className }: { status?: 'loading' | 'playing' | null; size?: number; className?: string }) {
  if (status === 'loading') {
    const ring = Math.round(size * 0.72);
    return (
      <span aria-hidden className={`inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size }}>
        <span
          className="block animate-spin rounded-full border-current border-r-transparent opacity-80 motion-reduce:animate-none"
          style={{ width: ring, height: ring, borderWidth: Math.max(2, Math.round(size * 0.11)) }}
        />
      </span>
    );
  }
  if (status !== 'playing') return <AppIcon name="audio" size={size} className={className} />;
  const bar = Math.max(2, Math.round(size * 0.16));
  return (
    <span aria-hidden className={`inline-flex items-center justify-center ${className ?? ''}`} style={{ width: size, height: size, gap: bar * 0.75 }}>
      {BARS.map((height, i) => (
        <i
          key={i}
          className="rw-sound-bars block rounded-full bg-current motion-reduce:animate-none"
          style={{ width: bar, height: size * height, '--i': i } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
