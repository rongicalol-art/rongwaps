import { useEffect, useRef, useState } from 'react';
import { lookupSoundHook, type SoundHookEntry } from '../../services/contentPacks';

export interface SoundHookState {
  /** undefined while loading, null when the character has no sound entry. */
  sound: SoundHookEntry | null | undefined;
  loaded: boolean;
}

/** Reads one pre-generated Sound entry from the static pack. */
export function useSoundHook(character: string, enabled: boolean): SoundHookState {
  const [sound, setSound] = useState<SoundHookEntry | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    setSound(undefined);
    setLoaded(false);
    requestedRef.current = null;
  }, [character]);

  useEffect(() => {
    if (!enabled) return;
    if (requestedRef.current === character) return;
    requestedRef.current = character;
    let cancelled = false;
    void lookupSoundHook(character).then((entry) => {
      if (cancelled) return;
      setSound(entry);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, character]);

  return { sound, loaded };
}
