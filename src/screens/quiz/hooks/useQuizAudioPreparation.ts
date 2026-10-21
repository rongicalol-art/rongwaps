import { useEffect, useState } from 'react';
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

/** Publish current readiness before waiting for lookahead. Cancellation never publishes readiness. */
export async function prepareQuizAudio(
  questions: readonly QuizBeat[], signal: AbortSignal,
  onProgress: (progress: AudioPreloadProgress) => void, onReady: (question: QuizBeat) => void,
): Promise<void> {
  for (const question of questions) {
    if (signal.aborted) return;
    const files = await recordingsFor(question);
    if (signal.aborted) return;
    let failed = false;
    await audioService.preload(files, signal, (progress) => {
      failed = progress.failed > 0;
      if (question === questions[0]) onProgress(progress);
    });
    if (signal.aborted) return;
    if (failed) throw new Error('Recording download failed');
    if (question === questions[0]) await audioService.prepareRecording(files[0], signal);
    if (signal.aborted) return;
    onReady(question);
  }
}

/** Gate the current question; the next question warms only after it is ready. */
export function useQuizAudioPreparation(questions: readonly QuizBeat[], roundKey: string, completed: boolean) {
  const [prepared, setPrepared] = useState<{ round: string; beats: Set<QuizBeat> }>({ round: '', beats: new Set() });
  const [preparation, setPreparation] = useState<{ beat: QuizBeat; progress: AudioPreloadProgress | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const first = questions[0];

  useEffect(() => {
    if (!first || completed) return;
    const controller = new AbortController();
    const { signal } = controller;
    setPreparation({ beat: first, progress: null, error: false });
    // Metadata lookups also need a deadline, even when no audio fetch has started.
    const deadline = window.setTimeout(() => {
      controller.abort();
      setPreparation((state) => ({ beat: first, progress: state?.progress ?? null, error: true }));
    }, 15_000);
    void prepareQuizAudio(questions, signal,
      (progress) => setPreparation({ beat: first, progress, error: progress.failed > 0 }),
      (question) => {
        setPrepared((state) => ({
          round: roundKey,
          beats: new Set([...(state.round === roundKey ? state.beats : []), question]),
        }));
        if (question === first) window.clearTimeout(deadline);
      },
    ).catch(() => {
      if (!signal.aborted) setPreparation((state) => ({ beat: first, progress: state?.progress ?? null, error: true }));
    }).finally(() => window.clearTimeout(deadline));
    return () => { window.clearTimeout(deadline); controller.abort(); };
  }, [questions, first, roundKey, completed, attempt]);

  const state = preparation?.beat === first ? preparation : null;
  return {
    ready: completed || !first || (prepared.round === roundKey && prepared.beats.has(first)),
    progress: state?.progress ?? null,
    error: state?.error ?? false,
    retry: () => { setPreparation(null); setAttempt((value) => value + 1); },
  };
}
