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
  /** When true, offsets by workspace nav width on desktop for full-viewport overlay windows */
  windowOverlay?: boolean;
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
  windowOverlay = false,
  inline = false,
  tone = 'canvas',
}) => {
  const toneClass = tone === 'practice' ? 'bg-ui-practice-canvas' : 'bg-ui-canvas';
  const containerClass = fullScreen
    ? 'fixed inset-0 z-window w-full h-full'
    : windowOverlay
      ? 'fixed inset-0 z-window w-full h-full transition-[padding-left] duration-300 ease-out'
      : inline
        ? 'flex w-full min-h-[45vh] flex-col items-center justify-center px-4 py-16'
        : 'absolute inset-0 z-content w-full h-full';

  const overlayStyle = windowOverlay
    ? { paddingLeft: 'var(--workspace-nav-width, 0px)' }
    : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={overlayStyle}
      className={`${containerClass} ${inline ? '' : `${toneClass} `}flex flex-col justify-center items-center overflow-hidden animate-in fade-in duration-200 select-none`}
    >
      <div className="flex flex-col items-center justify-center">
        <LottiePlayer 
          loadAnimationData={loadSandyLoadingAnimation} 
          width={180} 
          height={180} 
          loop={true} 
        />
        <p className="mt-2 text-ui-muted-strong font-black tracking-widest text-xs uppercase animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};
