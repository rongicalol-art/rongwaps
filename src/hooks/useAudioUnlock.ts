import { useEffect } from 'react';
import { audioService } from '../services/audioService';

export function useAudioUnlock() {
  useEffect(() => {
    // Unlock audio context on iOS on first user interaction
    const unlockAudio = () => {
      audioService.initialize();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
    };
  }, []);
}
