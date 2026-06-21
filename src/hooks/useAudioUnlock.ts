import { useEffect } from 'react';
import { audioService } from '../services/audioService';

export function useAudioUnlock() {
  useEffect(() => {
    // Unlock audio context on iOS on first user interaction
    const unlockAudio = () => {
      audioService.initialize();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);
}
