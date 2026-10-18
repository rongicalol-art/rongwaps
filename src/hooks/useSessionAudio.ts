import { useEffect } from 'react';
import { audioService } from '../services/audioService';

/** Stop session audio on completion or unmount, without interrupting card transitions. */
export function useAudioSessionLifecycle(completed: boolean) {
  useEffect(() => () => audioService.stop(), [completed]);
}
