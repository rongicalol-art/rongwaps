import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import type { AudioStep } from '../testAudioSequence';

const wait = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms); });
/** TOCFL Novice/Band A: every recording plays twice (the mocks leave ~5 s between; the app lets you answer meanwhile, so 3 s). */
const EXAM_PLAYS = 2;
const BETWEEN_PLAYS_MS = 3000;

/**
 * What the speaker key shows: `voice` while playing (pressed state), `loading` while the screen's recordings
 * download, or `retry` when a recording couldn't play (tap to try again).
 */
export type TestFace = 'voice' | 'loading' | 'retry';

/** One recording, never the browser's voice in its place (a test reads only recordings): false if it couldn't play. */
function playClip(step: AudioStep): Promise<boolean> {
  return new Promise((resolve) => {
    let played = true;
    audioService.play(step.audio?.file, 1, undefined, 'zh-TW', 0, { fallback: 'none', onUnavailable: () => { played = false; } })
      .then(() => resolve(played), () => resolve(false));
  });
}

/**
 * Plays a screen's audio steps at normal speed. In the test (`exam`) it plays on its own, `examPlays` times (twice at
 * Band A, once at Band B), and can't be replayed; in the Fix round it plays once and `replay` plays it again. It
 * starts once the screen's recordings
 * are `ready` (downloaded ahead), so no clip starts late. A clip that can't play stops the play without using it
 * up: the key shows `retry`, and `retry()` plays it again.
 */
export function useTestAudio(steps: AudioStep[], key: string, mode: 'exam' | 'replay', ready: boolean, examPlays: 1 | 2 = EXAM_PLAYS) {
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [mark, setMark] = useState<number | null>(null);
  /** Which of the screen's questions `mark` belongs to (a recording with several questions). */
  const [markQuestion, setMarkQuestion] = useState(0);
  /** Null between plays: the key pops back up. */
  const [face, setFace] = useState<TestFace | null>(null);
  const [failed, setFailed] = useState(false);
  /** How many of the screen's questions the narrator has asked (each printed question appears on its cue). */
  const [asked, setAsked] = useState(0);
  /** The recording's line being spoken (the Fix round's script lights it), held through the gap to the next. */
  const [line, setLine] = useState<number | null>(null);
  const run = useRef(0);
  /** Plays finished in this screen's run; a failed play doesn't count. */
  const done = useRef(0);
  const total = useRef(1);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const playOnce = useCallback(async (id: number): Promise<'done' | 'stopped' | 'failed'> => {
    setFace('voice');
    for (const step of stepsRef.current) {
      if (run.current !== id) return 'stopped';
      setMark(step.mark ?? null);
      setMarkQuestion(step.question ?? 0);
      if (step.line !== undefined) setLine(step.line);
      else if (!step.pauseMs) setLine(null);
      if (step.cue === 'question') setAsked((count) => Math.max(count, (step.question ?? 0) + 1));
      if (step.pauseMs) await wait(step.pauseMs);
      else if (!(await playClip(step))) return run.current === id ? 'failed' : 'stopped';
    }
    return run.current === id ? 'done' : 'stopped';
  }, []);

  /** Plays until `total` plays have finished, picking up after the last finished one. */
  const start = useCallback(async () => {
    // Already played (or ended by the Script): nothing to start, and whatever plays now keeps playing.
    if (done.current >= total.current) return;
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
      setLine(null);
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
    setLine(null);
  }, []);

  /** Stop and count the recording as played, so it never starts again on its own (the Script took over). */
  const finish = useCallback(() => {
    done.current = total.current;
    stop();
  }, [stop]);

  /** One clip on its own (a revealed answer or a script line in the Fix round), lit while it plays. */
  const say = useCallback(async (step: AudioStep) => {
    const id = ++run.current;
    audioService.stop();
    setPlaying(false);
    setFace(null);
    setMark(step.mark ?? null);
    setMarkQuestion(step.question ?? 0);
    setLine(step.line ?? null);
    await playClip(step);
    if (run.current === id) {
      setMark(null);
      setLine(null);
    }
  }, []);

  /** Some steps once, start to end (the script's lines, read along line by line); a tap on a line or Play all again stops it. */
  const playThrough = useCallback(async (list: AudioStep[]) => {
    const id = ++run.current;
    audioService.stop();
    setPlaying(true);
    setFace(null);
    setMark(null);
    for (const step of list) {
      if (run.current !== id) return;
      if (step.line !== undefined) setLine(step.line);
      if (step.pauseMs) await wait(step.pauseMs);
      else if (!(await playClip(step))) break;
    }
    if (run.current === id) {
      setPlaying(false);
      setLine(null);
    }
  }, []);

  useEffect(() => {
    setPlays(0);
    setAsked(0);
    setFailed(false);
    done.current = 0;
    total.current = mode === 'exam' ? examPlays : 1;
  }, [key, mode, examPlays]);

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
    markQuestion,
    face: failed ? 'retry' as const : waiting ? 'loading' as const : face,
    failed,
    asked,
    line,
    replay,
    playThrough,
    retry: () => { void start(); },
    say,
    stop,
    finish,
    maxPlays: mode === 'exam' ? examPlays : null,
  };
}
