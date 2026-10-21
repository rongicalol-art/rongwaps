import type { ReactNode } from 'react';

export interface VideoBackgroundProps {
  /** Static poster image fallback */
  posterSrc: string;
  /** Custom overlay/scrim class names */
  scrimClassName?: string;
  /** Additional container classes */
  className?: string;
  /** Optional content rendered over the video backdrop */
  children?: ReactNode;
}

/** Decorative backgrounds use the existing poster without continuous video decoding. */
export function VideoBackground({
  posterSrc, scrimClassName = 'bg-gradient-to-b from-brand-primary-soft-edge/70 via-ui-canvas/80 to-ui-canvas/95',
  className = '', children,
}: VideoBackgroundProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}>
      <img src={posterSrc} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" />
      {scrimClassName && <div className={`absolute inset-0 ${scrimClassName}`} />}
      {children}
    </div>
  );
}
