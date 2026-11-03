import { useEffect, useState } from 'react';
import { audioService } from '../../../services/audioService';

/** Screens downloaded beyond the one on screen. */
const AHEAD = 2;
/** Longest wait for a screen's downloads before it plays anyway (streaming): a slow network never stalls the test. */
const MAX_WAIT_MS = 6000;
/** Downloads were refused once (the audio host's CORS rules, ~1.6 s to find out): stream from then on, at once. */
let downloadsBlocked = false;
const preload = (files: string[], signal: AbortSignal) =>
  audioService.preload(files, signal, (progress) => { if (progress.blocked) downloadsBlocked = true; }).catch(() => {});

/**
 * Downloads the test's recordings ahead, the way the quiz does: this screen's first (and prepares them, so each
 * clip starts at once), then the next two while this one is answered. Starts on the part intro, so the first
 * question is usually ready before it appears. `ready` turns true once this screen's clips are in, after
 * MAX_WAIT_MS, or at once when downloading is blocked (the audio host's CORS rules): playback then streams.
 */
export function useTestAudioPreparation(recordings: string[][], index: number, screenKey: string): boolean {
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const markReady = () => { if (!signal.aborted) setReadyKey(screenKey); };
    if (downloadsBlocked) {
      markReady();
      return () => controller.abort();
    }
    const timer = window.setTimeout(markReady, MAX_WAIT_MS);
    void (async () => {
      const current = recordings[index] ?? [];
      await preload(current, signal);
      for (const [position, file] of current.entries()) {
        if (signal.aborted) return;
        // Decoded clips start without a gap; the first also primes the media element for the opening clip.
        await audioService.prepareRecording(file, signal, position === 0).catch(() => {});
      }
      window.clearTimeout(timer);
      markReady();
      for (const files of recordings.slice(index + 1, index + 1 + AHEAD)) {
        if (signal.aborted || downloadsBlocked) return;
        await preload(files, signal);
      }
    })();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [recordings, index, screenKey]);

  return readyKey === screenKey || (recordings[index]?.length ?? 0) === 0;
}
