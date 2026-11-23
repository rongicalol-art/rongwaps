import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getStartHereLesson, READY_CHECK_PASS, READY_CHECK_QUESTIONS, START_HERE_LESSONS, START_HERE_PARTS,
} from '../../src/screens/start-here/data';
import { EXCLUDED_CNS_KEYS, WORD_AUDIO_MAP } from '../../src/screens/start-here/data/audioMap';
import { countSpokenWords, parseTalkLine, sha1Hex } from '../../src/screens/start-here/data/talkParser';
import type { QuestionScreen, StartHereScreen } from '../../src/screens/start-here/data/types';
import { MOUTH_SOUNDS } from '../../src/screens/start-here/mouth/mouthGeometry';

const { items: pronunciation } = JSON.parse(readFileSync(
  new URL('../../public/data/pronunciation-audio/518c0f846f3640c3.json', import.meta.url), 'utf8',
)) as { items: Record<string, string> };

const { items: vocabulary } = JSON.parse(readFileSync(
  new URL('../../public/data/vocabulary/book-1.json', import.meta.url), 'utf8',
)) as { items: Array<{ id: string; examples: string }> };
const lessonZero = vocabulary.filter(({ id }) => id.startsWith('B1L00-'));

const migratedIds = new Set([1, 2, 3, 4, 5, 6, 7, 12, 20]);
// The prototype already recorded these 13-word segments. Rewording them would invalidate the cache.
const legacyLongClips = new Set([
  '1f622ae71a04', '8c827f4db861', '15384f059c0c', '99aacf7c6c05', '551362170ac3', '3644be0503d5',
]);

const lessonScreens = START_HERE_LESSONS.flatMap(({ id, screens }) =>
  screens.map((screen, index) => ({ id, screen, where: `Lesson ${id}, screen ${index + 1} (${screen.title})` })),
);
const allScreens = [
  ...lessonScreens,
  ...READY_CHECK_QUESTIONS.map((screen) => ({ screen, where: `Ready check: ${screen.id}` })),
];

function audioFields(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([field, child]) => {
    if (field !== 'audio' && field !== 'contrast') return audioFields(child);
    return Array.isArray(child) ? child : [child];
  });
}

function screenAudio(screen: StartHereScreen): string[] {
  const clips = 'talk' in screen
    ? (screen.talk ?? []).flatMap((line) => parseTalkLine(line).flatMap((segment) =>
        segment.kind === 'clip' && !segment.isMouth ? [segment.key] : []))
    : [];
  return [...audioFields(screen), ...clips];
}

function assertQuestion(question: QuestionScreen, where: string) {
  assert.ok(question.choices.length >= 2, where);
  assert.equal(question.choices.filter(({ correct }) => correct).length, 1, where);
  assert.ok(question.choices.every(({ label }) => label.trim()), where);
  assert.ok(question.feedback.pinyin.trim() && question.feedback.meaning.trim(), where);
}

test('Start Here has six ordered parts, 24 lessons and a 13-question Ready check', () => {
  assert.deepEqual(START_HERE_PARTS.map(({ id }) => id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(START_HERE_PARTS.map(({ lessonIds }) => lessonIds.length), [5, 4, 4, 4, 3, 4]);
  assert.deepEqual(START_HERE_LESSONS.map(({ id }) => id), Array.from({ length: 24 }, (_, i) => i + 1));
  for (const part of START_HERE_PARTS) {
    assert.deepEqual(part.lessonIds, START_HERE_LESSONS.filter((lesson) => lesson.partId === part.id).map(({ id }) => id));
  }
  for (const lesson of START_HERE_LESSONS) {
    assert.equal(getStartHereLesson(lesson.id), lesson);
    assert.ok(lesson.screens.length > 0, lesson.title);
  }
  assert.equal(getStartHereLesson(25), undefined);
  assert.equal(READY_CHECK_QUESTIONS.length, 13);
  assert.equal(new Set(READY_CHECK_QUESTIONS.map(({ id }) => id)).size, 13);
  assert.equal(READY_CHECK_PASS, 11);
  assert.deepEqual([...new Set(READY_CHECK_QUESTIONS.map(({ partId }) => partId))].sort(), [1, 2, 3, 4, 5, 6]);
});

test('every explicit audio reference resolves to a supported recording', () => {
  const references = [
    ...allScreens.flatMap(({ screen, where }) => screenAudio(screen).map((sequence) => ({ sequence, where }))),
    ...Object.entries(MOUTH_SOUNDS).map(([id, { au }]) => ({ sequence: au, where: `Mouth sound ${id}` })),
  ];
  for (const { sequence, where } of references) {
    assert.equal(typeof sequence, 'string', where);
    for (const key of sequence.split('+')) {
      assert.ok(!EXCLUDED_CNS_KEYS.has(key), `${where}: excluded recording ${key}`);
      assert.ok(Object.hasOwn(WORD_AUDIO_MAP, key) || Object.hasOwn(pronunciation, key), `${where}: unknown recording ${key}`);
    }
  }
});

test('the Ready check uses audio introduced in the lessons', () => {
  for (const part of START_HERE_PARTS) {
    const taught = new Set(START_HERE_LESSONS.filter(({ partId }) => partId === part.id)
      .flatMap(({ screens }) => screens.filter(({ k }) => k !== 'question').flatMap(screenAudio)));
    for (const question of READY_CHECK_QUESTIONS.filter(({ partId }) => partId === part.id)) {
      for (const audio of screenAudio(question)) {
        assert.ok(taught.has(audio), `Part ${part.id} does not introduce ${audio} before ${question.id}`);
      }
    }
  }
});

test('teacher talk stays within the line and ASCII limits and preserves the 67 cached clips', () => {
  const migratedClips = new Set<string>();
  const longClips = new Set<string>();
  for (const { id, screen, where } of lessonScreens) {
    if (!('talk' in screen) || screen.talk === undefined) continue;
    assert.ok(screen.talk.length >= 1 && screen.talk.length <= 3, where);
    for (const line of screen.talk) {
      assert.ok(line.trim(), where);
      for (const segment of parseTalkLine(line)) {
        if (segment.kind === 'clip') {
          if (segment.isMouth) {
            assert.ok(Object.hasOwn(MOUTH_SOUNDS, segment.key), `${where}: unknown mouth cue ${segment.key}`);
          }
          continue;
        }

        assert.ok(Array.from(segment.ssml).every((character) => character.charCodeAt(0) < 128), where);
        const count = countSpokenWords(segment.ssml);
        if (migratedIds.has(id)) migratedClips.add(segment.clipId);
        if (count > 12) {
          assert.ok(migratedIds.has(id) && count === 13 && legacyLongClips.has(segment.clipId), `${where}: ${count} words`);
          longClips.add(segment.clipId);
        }
      }
    }
  }
  assert.deepEqual(longClips, legacyLongClips);
  assert.equal(migratedClips.size, 67);
  const cachedClipDigest = createHash('sha1').update([...migratedClips].sort().join('\n')).digest('hex');
  assert.equal(cachedClipDigest, '08fdd49ea44212baba134da5f20061557f2c8519');
});

test('mouth screens, questions, builds and sorts are internally consistent', () => {
  for (const { screen, where } of allScreens) {
    switch (screen.k) {
      case 'question':
        assertQuestion(screen, where);
        break;
      case 'mouth':
        assert.ok(screen.sounds.includes(screen.first), where);
        assert.ok(screen.sounds.every((sound) => Object.hasOwn(MOUTH_SOUNDS, sound)), where);
        break;
      case 'mouthQuiz':
        assert.ok(screen.options.length >= 2, where);
        assert.equal(screen.options.filter(({ right }) => right).length, 1, where);
        assert.ok(screen.options.every(({ sound, say }) => Object.hasOwn(MOUTH_SOUNDS, sound) && say.trim()), where);
        break;
      case 'build': {
        const [initial, final, tone] = screen.target;
        assert.ok(screen.inis.includes(initial) && screen.fins.includes(final) && screen.tones.includes(tone), where);
        break;
      }
      case 'sort':
        for (const item of screen.items) {
          assert.ok(Number.isInteger(item.bin) && item.bin >= 0 && item.bin < screen.bins.length, where);
          if (screen.mode === 'audio') assert.ok(item.audio, where);
        }
        break;
    }
  }
});

test('the full chart includes all initials and each hunt target is on the grid', () => {
  const chart = getStartHereLesson(17)?.screens.find((screen) => screen.k === 'chart' && screen.fullChart);
  assert.ok(chart && chart.k === 'chart');
  assert.equal(chart.rows[0], '');
  assert.equal(new Set(chart.rows).size, 22);
  assert.equal(new Set(chart.cols).size, chart.cols.length);
  assert.equal(chart.huntTargets?.length, 4);
  const syllables = new Set(chart.rows.flatMap((row) => chart.cols.map((col) =>
    chart.spellOverrides?.[row + col] ?? row + col)));
  for (const target of chart.huntTargets ?? []) assert.ok(syllables.has(target.syllable), target.label);
});

test('lessons 22–24 cover the 13 Lesson 0 cards exactly once, without example sentences', () => {
  const cards = lessonScreens.flatMap(({ id, screen }) => {
    if (screen.k !== 'vocabCards') return [];
    assert.ok(id >= 22 && id <= 24);
    return screen.cardIds;
  });
  const expected = Array.from({ length: 13 }, (_, i) => `B1L00-1-${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual([...cards].sort(), expected);
  for (const id of cards) {
    const card = lessonZero.find((item) => item.id === id);
    assert.ok(card, `Unknown Lesson 0 card: ${id}`);
    assert.equal(card.examples, '', id);
  }
});

test('the teacher talk SHA-1 matches Node crypto for ASCII, UTF-8 and block boundaries', () => {
  for (const input of ['', 'abc', 'en-US-AvaMultilingualNeural-4%Hello.', '你 lǜ 🐴', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), '中文'.repeat(100)]) {
    assert.equal(sha1Hex(input), createHash('sha1').update(input).digest('hex'));
  }
});
