import { useCallback, useEffect, useState } from 'react';
import { audioService } from '../../../services/audioService';
import type { AudioPreloadProgress } from '../../../services/audio/audioCache';

/** A download this quick (already cached) never shows the screen, so it doesn't flash. */
const SHOW_AFTER_MS = 150;

interface DownloadState {
  progress: AudioPreloadProgress | null;
  ready: boolean;
  error: boolean;
  /** The download has taken long enough to show "Getting audio ready". */
  slow: boolean;
}

/**
 * Downloads every recording the test plays before its listening part starts, like the quiz, so no clip waits on
 * the network mid-question (`progress` drives the quiz's AudioBlocks). A host the audio bucket's CORS list doesn't
 * name can't download: it streams instead, ready at once. A real failure (offline) sets `error`; `retry` tries again.
 */
export function useTestAudioDownload(files: string[]) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DownloadState>({ progress: null, ready: files.length === 0, error: false, slow: false });

  useEffect(() => {
    if (files.length === 0) {
      setState({ progress: null, ready: true, error: false, slow: false });
      return undefined;
    }
    const controller = new AbortController();
    setState({ progress: null, ready: false, error: false, slow: false });
    const timer = window.setTimeout(() => setState((s) => ({ ...s, slow: true })), SHOW_AFTER_MS);
    let last: AudioPreloadProgress | null = null;
    void audioService.preload(files, controller.signal, (progress) => {
      last = progress;
      if (!controller.signal.aborted) setState((s) => ({ ...s, progress: { ...progress } }));
    }).catch(() => {}).then(() => {
      if (controller.signal.aborted) return;
      window.clearTimeout(timer);
      const done = last ?? { ready: 0, failed: 0, total: files.length };
      // Blocked downloads (CORS) stream instead; only failures with a working connection to the host are errors.
      const failed = !done.blocked && done.failed > 0;
      setState((s) => ({ ...s, ready: !failed, error: failed }));
    });
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [files, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
