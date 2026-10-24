import assert from 'node:assert/strict';
import test from 'node:test';
import { audioService } from '../../src/services/audioService';
import { prepareQuizAudio } from '../../src/screens/quiz/hooks/useQuizAudioPreparation';
import type { QuizBeat } from '../../src/utils/vocabulary/quizDirector';

const question = (id: string): QuizBeat => ({
  format: 'listen-pick', cards: [{ id, bookId: 1, lessonId: 1, front: '字', back: 'character', audio: `${id}.mp3` }],
});

test('the current question opens before lookahead finishes, and lookahead cannot hide its progress', async () => {
  const preload = audioService.preload;
  const first = question('first');
  const next = question('next');
  const ready: QuizBeat[] = [];
  const progress: number[] = [];
  let finishNext!: () => void;
  audioService.preload = async (files, _signal, onProgress) => {
    onProgress?.({ ready: 0, failed: 0, total: files.length });
    if (files[0] === 'next.mp3') await new Promise<void>((resolve) => { finishNext = resolve; });
    onProgress?.({ ready: files.length, failed: 0, total: files.length });
  };
  try {
    const pending = prepareQuizAudio([first, next], new AbortController().signal,
      (state) => progress.push(state.ready), (beat) => ready.push(beat));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(ready, [first]);
    assert.deepEqual(progress, [0, 1]);
    finishNext();
    await pending;
    assert.deepEqual(ready, [first, next]);
    assert.deepEqual(progress, [0, 1]);
  } finally { audioService.preload = preload; }
});

test('a failed first download blocks readiness; retry succeeds and cancellation never opens a question', async () => {
  const preload = audioService.preload;
  const first = question('retry');
  const next = question('lookahead');
  const ready: QuizBeat[] = [];
  const controller = new AbortController();
  let mode: 'fail' | 'ready' | 'cancel' = 'fail';
  let calls = 0;
  audioService.preload = async (_files, _signal, onProgress) => {
    calls++;
    if (mode === 'cancel') controller.abort();
    onProgress?.({ ready: mode === 'ready' ? 1 : 0, failed: mode === 'fail' ? 1 : 0, total: 1 });
  };
  try {
    await assert.rejects(prepareQuizAudio([first, next], controller.signal, () => {}, (beat) => ready.push(beat)));
    assert.equal(ready.length, 0);
    assert.equal(calls, 1, 'failed current audio must not launch lookahead');
    mode = 'ready';
    await prepareQuizAudio([first, next], controller.signal, () => {}, (beat) => ready.push(beat));
    assert.deepEqual(ready, [first, next]);
    ready.length = 0;
    mode = 'cancel';
    await prepareQuizAudio([first, next], controller.signal, () => {}, (beat) => ready.push(beat));
    assert.equal(ready.length, 0);
    assert.equal(calls, 4, 'canceled preparation must not start lookahead');
  } finally { audioService.preload = preload; }
});

test('missing listening recordings block the question instead of treating an empty download as ready', async () => {
  const first = question('missing');
  delete first.cards[0].audio;
  await assert.rejects(prepareQuizAudio([first], new AbortController().signal, () => {}, () => {
    assert.fail('a listening question without a recording must never open');
  }), /no recording/);
});


test('every current clip prepares before readiness; lookahead does not repeatedly replace the native decoder', async () => {
  const preload = audioService.preload;
  const prepare = audioService.prepareRecording;
  const first = question('full-word');
  first.cards.push({ ...first.cards[0], id: 'tile', audio: 'tile.mp3' });
  const next = question('next-word');
  const prepared: Array<[string | undefined, boolean | undefined]> = [];
  const ready: QuizBeat[] = [];
  let release!: () => void;
  audioService.preload = async () => {};
  audioService.prepareRecording = async (file, _signal, primeMedia) => {
    prepared.push([file, primeMedia]);
    if (file === 'tile.mp3') await new Promise<void>((resolve) => { release = resolve; });
  };
  try {
    const pending = prepareQuizAudio([first, next], new AbortController().signal, () => {}, (beat) => ready.push(beat));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(prepared, [['full-word.mp3', true], ['tile.mp3', false]]);
    assert.deepEqual(ready, [], 'downloading alone must not open unprepared tiles');
    release();
    await pending;
    assert.deepEqual(ready, [first, next]);
    assert.deepEqual(prepared.at(-1), ['next-word.mp3', false]);
  } finally { audioService.preload = preload; audioService.prepareRecording = prepare; }
});
