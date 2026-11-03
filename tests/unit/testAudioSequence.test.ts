import assert from 'node:assert/strict';
import test from 'node:test';
import type { DialogueItem, LessonTestSounds } from '../../src/types/lessonTest';
import { listeningSteps } from '../../src/screens/lesson-test/testAudioSequence';

/** What a listening question plays: dialogue, a long beat, the ding, the question, then the answers. */

const clip = (file: string) => ({ voice: 'studio' as const, file });
const line = (speaker: 'F' | 'M' | 'N', text: string) =>
  ({ speaker, traditional: text, simplified: text, pinyin: '', english: '', audio: clip(text) });
const sounds: LessonTestSounds = { ding: clip('ding'), letters: { A: clip('A'), B: clip('B'), C: clip('C') } };

const item: DialogueItem = {
  id: 'd1',
  kind: 'dialogue',
  answerLine: 1,
  lines: [line('F', '你要喝咖啡還是茶？'), line('M', '我要一杯綠茶。')],
  questions: [{
    id: 'q1', key: 1, why: '', focus: { zh: '', en: '' }, lesson: 4, wordIds: [],
    prompt: line('N', '他要喝什麼？'),
    choices: ['咖啡', '綠茶', '紅茶'].map((text) => ({ ...line('N', text) })),
  }],
};

const describe = (steps: ReturnType<typeof listeningSteps>) =>
  steps.map((step) => (step.pauseMs ? `${step.pauseMs}ms` : step.audio?.file ?? '?'));

test('a dialogue waits two seconds before the ding, then reads the question and the answers', () => {
  const steps = listeningSteps(item, item.questions[0], undefined, sounds, 'traditional');
  assert.deepEqual(describe(steps), [
    '你要喝咖啡還是茶？', '450ms', '我要一杯綠茶。',
    '2000ms', 'ding', '800ms', '他要喝什麼？',
    '1000ms', 'A', '800ms', '咖啡', '1300ms', 'B', '800ms', '綠茶', '1300ms', 'C', '800ms', '紅茶',
  ]);
});

test('answers follow the shown order and light up their letter', () => {
  const steps = listeningSteps(item, item.questions[0], [2, 0, 1], sounds, 'traditional');
  const spoken = steps.filter((step) => step.mark !== undefined && step.audio).map((step) => `${step.mark}:${step.audio?.file}`);
  assert.deepEqual(spoken, ['0:A', '0:紅茶', '1:B', '1:咖啡', '2:C', '2:綠茶']);
});

test('printed answers are not read aloud, and a missing ding keeps the pauses', () => {
  const steps = listeningSteps({ ...item, printed: true }, item.questions[0], undefined, {}, 'traditional');
  assert.deepEqual(describe(steps), ['你要喝咖啡還是茶？', '450ms', '我要一杯綠茶。', '2000ms', '800ms', '他要喝什麼？']);
});
