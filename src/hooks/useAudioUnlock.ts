import { useEffect } from 'react';
import { audioService } from '../services/audioService';

/**
 * iOS only resumes audio inside a tap. The audio context suspends after idle and
 * on interruptions (app switch, lock screen, calls), so every tap re-unlocks it,
 * capture phase, before the tap's own handler starts playback.
 */
export function useAudioUnlock() {
  useEffect(() => {
    const unlockAudio = () => audioService.initialize();
    const events = ['click', 'touchend', 'keydown'] as const;
    for (const event of events) document.addEventListener(event, unlockAudio, true);
    return () => {
      for (const event of events) document.removeEventListener(event, unlockAudio, true);
    };
  }, []);
}
