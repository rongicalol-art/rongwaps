import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export interface VideoBackgroundProps {
  /** Path to MP4 source */
  mp4Src?: string;
  /** Path to WebM source (smaller, preferred for modern browsers) */
  webmSrc?: string;
  /** Static poster image fallback */
  posterSrc: string;
  /** Custom overlay/scrim class names */
  scrimClassName?: string;
  /** Additional container classes */
  className?: string;
  /** Optional content rendered over the video backdrop */
  children?: React.ReactNode;
}

/**
 * Bulletproof, high-performance video background loop.
 *
 * Implements professional standards:
 * - Silent stripped audio with `muted playsInline autoPlay loop`
 * - Dual-source delivery (WebM first, then MP4)
 * - Zero Layout Shift (CLS) via instant poster backdrop
 * - Smooth crossfade once video keyframes decode
 * - Respects `prefers-reduced-motion`
 * - Automatic pause/resume on document tab visibility change
 * - Silent recovery if mobile Low-Power Mode blocks autoplay
 */
export function VideoBackground({
  mp4Src,
  webmSrc,
  posterSrc,
  scrimClassName = 'bg-gradient-to-b from-brand-primary-soft-edge/70 via-ui-canvas/80 to-ui-canvas/95 backdrop-blur-[1px]',
  className = '',
  children,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;

    // Handle tab visibility changes to save battery & CPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {
          // Handled silently if autoplay restricted
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial play attempt with error suppression
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked by Low-Power Mode or browser policy
          setIsPlaying(false);
        });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reduceMotion]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      {/* 1. Instant poster fallback (zero layout shift, battery-friendly) */}
      <img
        src={posterSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />

      {/* 2. Looping Video element (crossfades in when ready & motion allowed) */}
      {!reduceMotion && (mp4Src || webmSrc) && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setIsPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {webmSrc && <source src={webmSrc} type="video/webm" />}
          {mp4Src && <source src={mp4Src} type="video/mp4" />}
        </video>
      )}

      {/* 3. Contrast Scrim / Tint Layer */}
      {scrimClassName && (
        <div className={`absolute inset-0 ${scrimClassName}`} />
      )}

      {/* 4. Optional decorative children overlay */}
      {children}
    </div>
  );
}
