import React from 'react';
import { SpeakerIcon } from './SpeakerIcon';

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

/**
 * The app's one loading look: the audio bars a loading button shows (`ActionButton loading`),
 * drawn large, with a short message under them. Plain CSS, so it is the same on every device.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = false,
  inline = false,
  tone = 'canvas',
}) => {
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
      <div className="flex animate-in fade-in flex-col items-center justify-center gap-6 duration-200">
        <SpeakerIcon status="playing" size={56} className="text-brand-primary" />
        <p className="text-ui-muted-strong font-black tracking-widest text-xs uppercase">
          {message}
        </p>
      </div>
    </div>
  );
};
