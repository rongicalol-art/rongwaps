import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import type { AudioStep } from '../testAudioSequence';

const wait = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
/** TOCFL Novice/Band A: every recording plays twice (the mocks leave ~5 s between; the app lets you answer meanwhile, so 3 s). */
const EXAM_PLAYS = 2;
const BETWEEN_PLAYS_MS = 3000;
/** A pause this long (the 2 s beat before the ding, not the gaps between answers) shows as waiting dots on the speaker key. */
const WAIT_MS = 1500;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** What the speaker key shows: a voice, the long pause, the ding, the question, or the letter being read. */
export type TestFace = 'voice' | 'wait' | 'ding' | 'question' | (typeof LETTERS)[number];

function faceOf(step: AudioStep, previous: TestFace | null): TestFace | null {
  if (step.mark !== undefined) return LETTERS[step.mark];
  if (step.cue) return step.cue;
  if (step.pauseMs && step.pauseMs >= WAIT_MS) return 'wait';
  return previous;
}

/**
 * Plays a question's audio steps at normal speed. In the test (`exam`) it plays on its own, twice, and can't
 * be replayed; in the Fix round it plays once and `replay` plays it again.
 */
export function useTestAudio(steps: AudioStep[], key: string, mode: 'exam' | 'replay', script: 'traditional' | 'simplified') {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [mark, setMark] = useState<number | null>(null);
  /** Null between plays: the key pops back up. */
  const [face, setFace] = useState<TestFace | null>(null);
  /** The narrator has asked the question (a printed question appears on that cue). */
  const [asked, setAsked] = useState(false);
  const run = useRef(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const playOnce = useCallback(async (id: number) => {
    let shown: TestFace | null = null;
    for (const step of stepsRef.current) {
      if (run.current !== id) return false;
      setMark(step.mark ?? null);
      shown = faceOf(step, shown) ?? 'voice';
      setFace(shown);
      if (step.cue === 'question') setAsked(true);
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
      setFace(null);
      setMark(null);
      if (index < times - 1) await wait(BETWEEN_PLAYS_MS);
      if (run.current !== id) return;
    }
    setPlaying(false);
  }, [playOnce]);

  const stop = useCallback(() => {
    run.current += 1;
    audioService.stop();
    setPlaying(false);
    setMark(null);
    setFace(null);
  }, []);

  /** One clip on its own (a revealed answer in the Fix round), lit while it plays. */
  const say = useCallback(async (step: AudioStep) => {
    const id = ++run.current;
    audioService.stop();
    setPlaying(false);
    setFace(null);
    setMark(step.mark ?? null);
    await playSentence(step.text ?? '', step.audio, script, 1).catch(() => {});
    if (run.current === id) setMark(null);
  }, [script]);

  useEffect(() => {
    setPlays(0);
    setAsked(false);
    if (stepsRef.current.length === 0) return undefined;
    const timer = window.setTimeout(() => { void start(mode === 'exam' ? EXAM_PLAYS : 1); }, 450);
    return () => { window.clearTimeout(timer); stop(); };
  }, [key, mode, start, stop]);

  return { playing, plays, mark, face, asked, replay: () => { void start(1); }, say, stop, maxPlays: mode === 'exam' ? EXAM_PLAYS : null };
}
