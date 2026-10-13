import { useEffect } from 'react';
import { audioService } from '../services/audioService';

export function useAudioUnlock() {
  useEffect(() => {
    // Run before click handlers start playback on the reused iOS audio elements.
    const unlockAudio = () => {
      audioService.initialize();
      document.removeEventListener('click', unlockAudio, true);
      document.removeEventListener('touchend', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
    document.addEventListener('click', unlockAudio, true);
    document.addEventListener('touchend', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
    
    return () => {
      document.removeEventListener('click', unlockAudio, true);
      document.removeEventListener('touchend', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
  }, []);
}
