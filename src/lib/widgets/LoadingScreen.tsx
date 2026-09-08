import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import sandyLoadingData from '../../assets/animations/sandy-loading.json';

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
    ? 'fixed z-[500] inset-0 w-full h-full'
    : inline
      ? 'flex w-full min-h-[45vh] flex-col items-center justify-center px-4 py-16'
      : 'absolute z-[100] inset-0 w-full h-full';
  return (
    <div className={`${containerClass} ${inline ? '' : `${toneClass} `}flex flex-col justify-center items-center overflow-hidden`}>
      <LottiePlayer 
        animationData={sandyLoadingData} 
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
