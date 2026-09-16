import React from 'react';
import { LottiePlayer } from './LottiePlayer';

// The branded loader animation is 108 KB of JSON; loading it on demand keeps it
// out of the entry chunk (every route pays for this widget's chunk). Module-level
// loader keeps a stable identity for LottiePlayer.
const loadSandyLoadingAnimation = () =>
  import('../../assets/animations/sandy-loading.json').then((m) => m.default);

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  /** Render as an in-flow, transparent block (no own canvas fill) — used
   *  INSIDE an already-mounted window (grammar lesson, Reader) whose canvas
   *  is already painted, so the window appears first and content loads under
   *  the spinner. Do not use inline outside a painted window. */
  inline?: boolean;
  /** Canvas tone the loader sits on. Must match the window it preloads:
   *  'canvas' for shell/grammar (bg-ui-canvas), 'practice' for Reader and
   *  other practice-toned windows (bg-ui-practice-canvas) — otherwise the
   *  loaded screen flips tone. Never paint a third surface here. */
  tone?: 'canvas' | 'practice';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = false,
  inline = false,
  tone = 'canvas',
}) => {
  const toneClass = tone === 'practice' ? 'bg-ui-practice-canvas' : 'bg-ui-canvas';
  const containerClass = fullScreen
    ? 'fixed z-window inset-0 w-full h-full'
    : inline
      ? 'flex w-full min-h-[45vh] flex-col items-center justify-center px-4 py-16'
      : 'absolute z-content inset-0 w-full h-full';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${containerClass} ${inline ? '' : `${toneClass} `}flex flex-col justify-center items-center overflow-hidden`}
    >
      <LottiePlayer 
        loadAnimationData={loadSandyLoadingAnimation} 
        width={200} 
        height={200} 
        loop={true} 
      />
      <p className="mt-2 text-ui-muted font-bold tracking-widest text-sm uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};
