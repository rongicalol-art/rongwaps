import { useState, useSyncExternalStore } from 'react';
import { playbackWaiting } from '../services/audio/playbackWaiting';

export type SpeakerStatus = 'loading' | 'playing' | null;

/**
 * For speaker buttons: `claim(key)` right before playing, then `status(key)` is `loading` while that
 * playback is still fetching (after a short beat) and `playing` while it sounds.
 * `key` tells apart several buttons in one component (e.g. one per example).
 */
export function useAudioPending() {
  const [token] = useState(() => Symbol('speaker'));
  const state = useSyncExternalStore(playbackWaiting.subscribe, playbackWaiting.snapshot, playbackWaiting.snapshot);
  return {
    claim: (key = '') => playbackWaiting.claimNext({ token, key }),
    status: (key = ''): SpeakerStatus => (
      state.owner?.token === token && state.owner.key === key && (state.phase === 'loading' || state.phase === 'playing')
        ? state.phase
        : null
    ),
  };
}
