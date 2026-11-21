import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import type { SentenceAudio } from '../../../types/grammarPractice';

/** The pause between two lines when a whole recording plays (the test's turn gap). */
const LINE_GAP_MS = 450;

export interface BookletClip {
  /** The line's key in the booklet (item id and line), lit while it plays. */
  key: string;
  audio?: SentenceAudio;
}

const wait = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms); });

/** One recording, never the browser's voice in its place: false if it couldn't play. */
function playClip(audio: SentenceAudio | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    let played = true;
    audioService.play(audio?.file, 1, undefined, 'zh-TW', 0, { fallback: 'none', onUnavailable: () => { played = false; } })
      .then(() => resolve(played), () => resolve(false));
  });
}

/**
 * The booklet's one player: a line on its own (`say`), or a whole recording line by line (`playAll`), the line
 * being spoken lit. Anything new stops what was playing; pressing the playing thing again stops it.
 */
export function useBookletAudio() {
  /** The line being spoken, and the recording playing through (null for a single line). */
  const [state, setState] = useState<{ line: string | null; all: string | null }>({ line: null, all: null });
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    audioService.stop();
    setState({ line: null, all: null });
  }, []);
  useEffect(() => stop, [stop]);

  const say = useCallback(async (clip: BookletClip) => {
    const id = ++run.current;
    audioService.stop();
    setState({ line: clip.key, all: null });
    await playClip(clip.audio);
    if (run.current === id) setState({ line: null, all: null });
  }, []);

  const playAll = useCallback(async (key: string, clips: BookletClip[]) => {
    const id = ++run.current;
    audioService.stop();
    // A line without a recording is skipped, not the end of the run.
    for (const [index, clip] of clips.filter((each) => each.audio).entries()) {
      if (run.current !== id) return;
      if (index > 0) await wait(LINE_GAP_MS);
      if (run.current !== id) return;
      setState({ line: clip.key, all: key });
      if (!(await playClip(clip.audio))) break;
    }
    if (run.current === id) setState({ line: null, all: null });
  }, []);

  return { line: state.line, all: state.all, say, playAll, stop };
}

export type BookletAudio = ReturnType<typeof useBookletAudio>;
