import React, { useEffect, useState } from 'react';
import { LottiePlayer, preloadAnimation, preloadLottie } from './LottiePlayer';

// The branded loader animation is 108 KB of JSON; loading it on demand keeps it
// out of the entry chunk (every route pays for this widget's chunk). Module-level
// loader keeps a stable identity for LottiePlayer.
const loadSandyLoadingAnimation = () =>
  import('../../assets/animations/sandy-loading.json').then((m) => m.default);

/** Warm the loader's animation + player so the first loader ever shown has no swap. Call at idle after boot. */
export function preloadLoadingScreen(): void {
  void preloadLottie();
  void preloadAnimation(loadSandyLoadingAnimation);
}

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  /** Render as an in-flow, transparent block (no own canvas fill) */
  inline?: boolean;
  /** Canvas tone the loader sits on. Must match the window it preloads:
   *  'canvas' for shell/grammar (bg-ui-canvas), 'practice' for Reader and
   *  other practice-toned windows (bg-ui-practice-canvas) — otherwise the
   *  loaded screen flips tone. */
  tone?: 'canvas' | 'practice';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = false,
  inline = false,
  tone = 'canvas',
}) => {
  const [animate, setAnimate] = useState(false);
  const [artReady, setArtReady] = useState(false);
  useEffect(() => {
    // A fast cache hit should not download and initialize a 317 kB animation
    // engine. Small devices keep the inexpensive CSS indicator throughout.
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (memory && memory <= 4)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setAnimate(true), 200);
    return () => window.clearTimeout(timer);
  }, []);
  const toneClass = tone === 'practice' ? 'bg-ui-practice-canvas' : 'bg-ui-canvas';
  const containerClass = fullScreen
    ? 'fixed inset-0 z-window w-full h-full'
    : inline
      ? 'flex w-full min-h-[45vh] flex-col items-center justify-center px-4 py-16'
      : 'absolute inset-0 z-content w-full h-full';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${containerClass} ${inline ? '' : `${toneClass} `}flex flex-col justify-center items-center overflow-hidden select-none`}
    >
      <div className="flex animate-in fade-in flex-col items-center justify-center duration-200">
        <div className="relative flex h-44 w-44 items-center justify-center">
        {!artReady && <span aria-hidden className="absolute h-10 w-10 animate-spin rounded-full border-4 border-brand-primary-track border-t-brand-primary motion-reduce:animate-none" />}
        {animate && <LottiePlayer
          loadAnimationData={loadSandyLoadingAnimation} 
          width="100%"
          height="100%"
          loop={true} 
          onDOMLoaded={() => setArtReady(true)}
        />}
        </div>
        <p className="mt-2 text-ui-muted-strong font-black tracking-widest text-xs uppercase">
          {message}
        </p>
      </div>
    </div>
  );
};
