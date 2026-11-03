import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import type { AudioStep } from '../testAudioSequence';

const wait = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
/** TOCFL Novice/Band A: every recording plays twice (the mocks leave ~5 s between; the app lets you answer meanwhile, so 3 s). */
const EXAM_PLAYS = 2;
const BETWEEN_PLAYS_MS = 3000;
/** A pause this long (the 2 s beat before the ding, not the gaps between answers) shows as waiting dots on the speaker key. */
const WAIT_MS = 1500;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

/**
 * What the speaker key shows: a voice, the long pause, the ding, the question or the letter being read; `loading`
 * while the screen's recordings download; `retry` when a recording couldn't play (tap to try again).
 */
export type TestFace = 'voice' | 'wait' | 'ding' | 'question' | 'loading' | 'retry' | (typeof LETTERS)[number];

function faceOf(step: AudioStep, previous: TestFace | null): TestFace | null {
  if (step.mark !== undefined) return LETTERS[step.mark];
  if (step.cue) return step.cue;
  if (step.pauseMs && step.pauseMs >= WAIT_MS) return 'wait';
  return previous;
}

/** One recording, never the browser's voice in its place (a test reads only recordings): false if it couldn't play. */
function playClip(step: AudioStep): Promise<boolean> {
  return new Promise((resolve) => {
    let played = true;
    audioService.play(step.audio?.file, 1, undefined, 'zh-TW', 0, { fallback: 'none', onUnavailable: () => { played = false; } })
      .then(() => resolve(played), () => resolve(false));
  });
}

/**
 * Plays a question's audio steps at normal speed. In the test (`exam`) it plays on its own, twice, and can't
 * be replayed; in the Fix round it plays once and `replay` plays it again. It starts once the screen's recordings
 * are `ready` (downloaded ahead), so no clip starts late. A clip that can't play stops the play without using it
 * up: the key shows `retry`, and `retry()` plays it again.
 */
export function useTestAudio(steps: AudioStep[], key: string, mode: 'exam' | 'replay', ready: boolean) {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [mark, setMark] = useState<number | null>(null);
  /** Null between plays: the key pops back up. */
  const [face, setFace] = useState<TestFace | null>(null);
  const [failed, setFailed] = useState(false);
  /** The narrator has asked the question (a printed question appears on that cue). */
  const [asked, setAsked] = useState(false);
  const run = useRef(0);
  /** Plays finished in this screen's run; a failed play doesn't count. */
  const done = useRef(0);
  const total = useRef(1);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const playOnce = useCallback(async (id: number): Promise<'done' | 'stopped' | 'failed'> => {
    let shown: TestFace | null = null;
    for (const step of stepsRef.current) {
      if (run.current !== id) return 'stopped';
      setMark(step.mark ?? null);
      shown = faceOf(step, shown) ?? 'voice';
      setFace(shown);
      if (step.cue === 'question') setAsked(true);
      if (step.pauseMs) await wait(step.pauseMs);
      else if (!(await playClip(step))) return run.current === id ? 'failed' : 'stopped';
    }
    return run.current === id ? 'done' : 'stopped';
  }, []);

  /** Plays until `total` plays have finished, picking up after the last finished one. */
  const start = useCallback(async () => {
    const id = ++run.current;
    audioService.stop();
    setFailed(false);
    setPlaying(true);
    while (done.current < total.current) {
      setPlays(done.current + 1);
      const outcome = await playOnce(id);
      if (outcome === 'stopped') return;
      setMark(null);
      if (outcome === 'failed') {
        setPlays(done.current);
        setFace(null);
        setFailed(true);
        setPlaying(false);
        return;
      }
      done.current += 1;
      setFace(null);
      if (done.current < total.current) await wait(BETWEEN_PLAYS_MS);
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
    await playClip(step);
    if (run.current === id) setMark(null);
  }, []);

  useEffect(() => {
    setPlays(0);
    setAsked(false);
    setFailed(false);
    done.current = 0;
    total.current = mode === 'exam' ? EXAM_PLAYS : 1;
  }, [key, mode]);

  useEffect(() => {
    if (!ready || stepsRef.current.length === 0) return undefined;
    const timer = window.setTimeout(() => { void start(); }, 450);
    return () => { window.clearTimeout(timer); stop(); };
  }, [key, mode, ready, start, stop]);

  const replay = useCallback(() => {
    done.current = 0;
    total.current = 1;
    void start();
  }, [start]);

  const waiting = !ready && steps.length > 0 && !failed;
  return {
    playing,
    plays,
    mark,
    face: failed ? 'retry' as const : waiting ? 'loading' as const : face,
    failed,
    asked,
    replay,
    retry: () => { void start(); },
    say,
    stop,
    maxPlays: mode === 'exam' ? EXAM_PLAYS : null,
  };
}
