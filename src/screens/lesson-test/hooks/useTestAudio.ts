import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import type { AudioStep } from '../testAudioSequence';

const wait = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
/** TOCFL Novice/Band A: every recording plays twice, with a short gap. */
const EXAM_PLAYS = 2;
const BETWEEN_PLAYS_MS = 1500;

/**
 * Plays a question's audio steps at normal speed. In the test (`exam`) it plays on its own, twice, and can't
 * be replayed; in the Fix round it plays once and `replay` plays it again.
 */
export function useTestAudio(steps: AudioStep[], key: string, mode: 'exam' | 'replay', script: 'traditional' | 'simplified') {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [mark, setMark] = useState<number | null>(null);
  const run = useRef(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const playOnce = useCallback(async (id: number) => {
    for (const step of stepsRef.current) {
      if (run.current !== id) return false;
      setMark(step.mark ?? null);
      if (step.pauseMs) await wait(step.pauseMs);
      else await playSentence(step.text ?? '', step.audio, script, 1).catch(() => {});
    }
    return run.current === id;
  }, [script]);

  const start = useCallback(async (times: number) => {
    const id = ++run.current;
    audioService.stop();
    setPlaying(true);
    for (let index = 0; index < times; index += 1) {
      setPlays(index + 1);
      if (!(await playOnce(id))) return;
      if (index < times - 1) await wait(BETWEEN_PLAYS_MS);
      if (run.current !== id) return;
    }
    setPlaying(false);
    setMark(null);
  }, [playOnce]);

  const stop = useCallback(() => {
    run.current += 1;
    audioService.stop();
    setPlaying(false);
    setMark(null);
  }, []);

  useEffect(() => {
    setPlays(0);
    if (stepsRef.current.length === 0) return undefined;
    const timer = window.setTimeout(() => { void start(mode === 'exam' ? EXAM_PLAYS : 1); }, 450);
    return () => { window.clearTimeout(timer); stop(); };
  }, [key, mode, start, stop]);

  return { playing, plays, mark, replay: () => { void start(1); }, stop, maxPlays: mode === 'exam' ? EXAM_PLAYS : null };
}
