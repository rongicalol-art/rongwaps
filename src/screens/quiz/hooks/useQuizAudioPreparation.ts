import { useEffect, useRef, useState } from 'react';
import { audioService } from '../../../services/audioService';
import type { AudioPreloadProgress } from '../../../services/audio/audioCache';
import { getCourseVocabLookupMap } from '../../../services/courseVocabLookup';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { fetchPronunciationIndex } from '../../../services/contentPacks';
import type { QuizBeat } from '../../../utils/vocabulary/quizDirector';
import { resolveWordBuildTileAudio } from '../utils/wordBuildAudio';

async function recordingsFor(question: QuizBeat): Promise<(string | undefined)[]> {
  const files = new Set(question.cards.map((card) => card.audio));
  if (question.format === 'word-build') {
    const [recordings, sounds, readings] = await Promise.all([
      getCourseVocabLookupMap(), getPronunciationAudioIndex(), fetchPronunciationIndex(),
    ]);
    for (const char of new Set(question.tiles ?? [])) {
      files.add(resolveWordBuildTileAudio(question.cards[0], char, recordings, sounds, readings));
    }
  }
  if ((question.format === 'listen-pick' || question.format === 'sound-match')
    && question.cards.some((card) => !card.audio || !audioService.isAudioFileName(card.audio))) {
    throw new Error('Listening question has no recording');
  }
  return [...files];
}

// Stop extending lookahead once compressed clips reach 2 MB; the shared cache also caps retained bytes.
const BUFFER_BYTES = 2 * 1024 * 1024;

/** Publish each question after its downloads and optional decoding. Cancellation never publishes readiness. */
export async function prepareQuizAudio(
  questions: readonly QuizBeat[], signal: AbortSignal,
  onProgress: (progress: AudioPreloadProgress) => void, onReady: (question: QuizBeat, files: (string | undefined)[], bytes: number) => void,
  decodeCount = 2, primeFirst = true,
): Promise<void> {
  for (const question of questions) {
    if (signal.aborted) return;
    const files = await recordingsFor(question);
    if (signal.aborted) return;
    let failed = false;
    let bytes = 0;
    await audioService.preload(files, signal, (progress) => {
      failed = progress.failed > 0 || Boolean(progress.blocked) || progress.ready + progress.failed < progress.total;
      bytes = progress.bytes ?? 0;
      if (question === questions[0]) onProgress(progress);
    });
    if (signal.aborted) return;
    if (failed) throw new Error('Recording download failed');
    for (const [index, file] of (questions.indexOf(question) < decodeCount ? files : []).entries()) {
      await audioService.prepareRecording(file, signal, primeFirst && question === questions[0] && index === 0);
      if (signal.aborted) return;
    }
    if (signal.aborted) return;
    onReady(question, files, bytes);
  }
}

/** Keep one worker alive across question changes: advancing never restarts useful downloads. */
export function useQuizAudioPreparation(questions: readonly QuizBeat[], roundKey: string, completed: boolean, waitForBuffer = false) {
  const [prepared, setPrepared] = useState<{ round: string; decoded: Set<QuizBeat>; downloaded: Set<QuizBeat>; bytes: number }>({ bytes: 0, round: '', decoded: new Set(), downloaded: new Set() });
  const [preparation, setPreparation] = useState<{ round: string; beat: QuizBeat; progress: AudioPreloadProgress | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [decodeError, setDecodeError] = useState<{ round: string; beat: QuizBeat } | null>(null);
  const work = useRef<{
    round: string; attempt: number; controller: AbortController; running: boolean;
    questions: readonly QuizBeat[]; files: Map<QuizBeat, number>;
  } | null>(null);
  const first = questions[0];

  useEffect(() => () => { work.current?.controller.abort(); work.current = null; }, []);
  useEffect(() => {
    if (completed || !first) { work.current?.controller.abort(); work.current = null; return; }
    if (!work.current || work.current.round !== roundKey || work.current.attempt !== attempt) {
      work.current?.controller.abort();
      work.current = { round: roundKey, attempt, controller: new AbortController(), running: false, questions, files: new Map() };
    }
    const job = work.current;
    job.questions = questions;
    if (job.running || job.controller.signal.aborted) return;
    const { signal } = job.controller;
    const bufferedBytes = () => job.questions.reduce((sum, question) => sum + (job.files.get(question) ?? 0), 0);
    const publish = () => {
      if (!signal.aborted) setPrepared(state => ({ round: roundKey, decoded: state.round === roundKey ? state.decoded : new Set(), downloaded: new Set(job.files.keys()), bytes: bufferedBytes() }));
    };
    publish();
    job.running = true;
    void (async () => {
      while (!signal.aborted) {
        const question = bufferedBytes() < BUFFER_BYTES ? job.questions.find(question => !job.files.has(question)) : undefined;
        if (!question) return;
        const active = job.questions[0];
        setPreparation({ round: roundKey, beat: active, progress: null, error: false });
        // Covers metadata, downloads and decoder preparation, including APIs that ignore cancellation.
        const deadline = window.setTimeout(() => {
          if (signal.aborted) return;
          job.controller.abort();
          setPreparation({ round: roundKey, beat: job.questions[0], progress: null, error: true });
        }, 15_000);
        try {
          await prepareQuizAudio([question], signal, (progress) => {
            if (!signal.aborted && job.questions[0] === active) {
              const downloaded = job.questions.filter(item => job.files.has(item)).length;
              setPreparation({ round: roundKey, beat: active, progress: {
                ...progress, ready: downloaded + (progress.total ? progress.ready / progress.total : 0), total: job.questions.length,
              }, error: progress.failed > 0 || Boolean(progress.blocked) });
            }
          }, (_question, _files, bytes) => {
            job.files.set(question, bytes);
          }, 0);
          if (signal.aborted) return;
          publish();
        } catch {
          if (!signal.aborted && job.questions.includes(question)) setPreparation({ round: roundKey, beat: job.questions[0], progress: null, error: true });
          return;
        } finally { window.clearTimeout(deadline); }
      }
    })().finally(() => { job.running = false; });
  }, [questions, first, roundKey, completed, attempt]);

  useEffect(() => {
    if (completed || !first) return;
    // Decoding the next playable question must never wait behind a slow lookahead download.
    const controller = new AbortController();
    const { signal } = controller;
    let currentReady = false;
    setDecodeError(null);
    const fail = () => {
      if (!currentReady) setDecodeError({ round: roundKey, beat: first });
    };
    const deadline = window.setTimeout(() => { controller.abort(); fail(); }, 15_000);
    void prepareQuizAudio(questions.slice(0, 2), signal, () => {}, question => {
      setPrepared(state => ({
        ...state, round: roundKey,
        decoded: new Set([...(state.round === roundKey ? state.decoded : []), question]),
      }));
      if (question === first) currentReady = true;
    }).catch(() => { if (!signal.aborted) fail(); }).finally(() => window.clearTimeout(deadline));
    return () => { window.clearTimeout(deadline); controller.abort(); };
  }, [questions, first, roundKey, completed, attempt]);

  const current = prepared.round === roundKey && prepared.decoded.has(first);
  const buffered = prepared.round === roundKey && (questions.every(question => prepared.downloaded.has(question)) || prepared.bytes >= BUFFER_BYTES);
  const state = preparation?.round === roundKey && preparation.beat === first ? preparation : null;
  const ready = completed || !first || (current && (!waitForBuffer || buffered));
  useEffect(() => {
    if (!waitForBuffer || ready || !first) return;
    // Leave room for recovery before the server's 60-second preparation deadline.
    const deadline = window.setTimeout(() => {
      work.current?.controller.abort();
      setPreparation({ round: roundKey, beat: first, progress: null, error: true });
    }, 45_000);
    return () => window.clearTimeout(deadline);
  }, [waitForBuffer, ready, first, roundKey, attempt]);
  return {
    ready,
    progress: state?.progress ?? null,
    error: Boolean(state?.error || (decodeError?.round === roundKey && decodeError.beat === first)),
    retry: () => { setPreparation(null); setAttempt((value) => value + 1); },
  };
}
