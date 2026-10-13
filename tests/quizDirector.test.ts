import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { Flashcard } from '../src/data/flashcards';
import {
  buildQuizDistractors,
  buildMeasureWordChoices,
  buildWordTiles,
  parseMeasureWord,
  planQuizRound,
  wordsForQuizTypes,
  availableQuizTypes,
  createQuizRng,
  type QuizBeat,
  canBuildWord,
} from '../src/utils/vocabulary/quizDirector';
import { cleanVocabText } from '../src/utils/vocabulary/vocabCleaner';

const WORDS: Array<[string, string, string, boolean]> = [
  ['蛋', 'egg', 'dàn', true],
  ['蛋糕', 'cake', 'dàngāo', true],
  ['中文', 'Chinese language', 'zhōngwén', true],
  ['文', 'writing', 'wén', true],
  ['他', 'he', 'tā', true],
  ['她', 'she', 'tā', true],
  ['书', 'book (M: 本běn)', 'shū', true],
  ['水', 'water', 'shuǐ', true],
  ['茶', 'tea', 'chá', true],
  ['米饭', 'rice', 'mǐfàn', false],
  ['朋友', 'friend', 'péngyou', true],
  ['学校', 'school', 'xuéxiào', true],
  ['老师', 'teacher', 'lǎoshī', true],
  ['学生', 'student', 'xuésheng', true],
  ['电脑', 'computer', 'diànnǎo', true],
  ['手机', 'phone', 'shǒujī', true],
  ['医院', 'hospital', 'yīyuàn', true],
  ['公司', 'company', 'gōngsī', true],
];

const card = ([front, back, pinyin, audio]: [string, string, string, boolean], i: number): Flashcard => ({
  id: `c${i}`, bookId: 1, lessonId: 3, front, back, pinyin, audio: audio ? `a${i}.mp3` : undefined,
});

const DECK = WORDS.map(card);

const plan = (over: Partial<Parameters<typeof planQuizRound>[1]> = {}, deck = DECK) =>
  planQuizRound(deck, { seed: 'session-a', reviewPass: false, ...over });

const allIds = (beats: QuizBeat[]) => beats.flatMap((b) => b.cards.map((c) => c.id));

test('planQuizRound: every card appears in exactly one beat (card count equals deck size)', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e']) {
    const beats = plan({ seed });
    const ids = allIds(beats);
    assert.equal(ids.length, DECK.length);
    assert.deepEqual([...new Set(ids)].sort(), DECK.map((c) => c.id).sort());
  }
});

test('planQuizRound: match beats hold 3-5 cards, others hold one', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
    for (const beat of plan({ seed })) {
      if (beat.format === 'pair-match' || beat.format === 'sound-match') {
        assert.ok(beat.cards.length >= 3 && beat.cards.length <= 5, `${beat.format} has ${beat.cards.length}`);
      } else {
        assert.equal(beat.cards.length, 1);
      }
    }
  }
});

test('planQuizRound: every format is open to every word (no stage gating)', () => {
  const seen = new Set<string>();
  for (let n = 0; n < 40; n += 1) plan({ seed: `f${n}` }).forEach((beat) => seen.add(beat.format));
  for (const format of ['pair-match', 'sound-match', 'pick-meaning', 'listen-pick', 'pick-hanzi', 'true-false', 'word-build']) {
    assert.ok(seen.has(format), `${format} never planned`);
  }
});

test('planQuizRound: picked types limit the formats; words that fit none get pick-meaning', () => {
  for (let n = 0; n < 20; n += 1) {
    const beats = plan({ seed: `t${n}`, types: ['listen', 'build'], firstCardId: DECK[0].id });
    assert.equal(allIds(beats).length, DECK.length);
    for (const beat of beats) {
      assert.ok(['listen-pick', 'sound-match', 'word-build', 'pick-meaning'].includes(beat.format), beat.format);
      // Only a word with no audio and no buildable tiles falls back.
      if (beat.format === 'pick-meaning') assert.ok(!beat.cards[0].audio && !buildWordTiles(beat.cards[0], DECK, createQuizRng('x')));
    }
  }
  for (const beat of plan({ seed: 'only', types: ['hanzi'] })) assert.equal(beat.format, 'pick-hanzi');
});

test('planQuizRound: fewer than 3 leftover cards fall back to the single-card format', () => {
  const deck = DECK.slice(0, 2);
  for (let n = 0; n < 20; n += 1) {
    const beats = plan({ seed: `s${n}` }, deck);
    assert.equal(beats.length, 2);
    assert.ok(beats.every((b) => b.cards.length === 1 && b.format !== 'pair-match' && b.format !== 'sound-match'));
  }
});

test('planQuizRound: no two consecutive beats share a format', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const beats = plan({ seed });
    for (let i = 1; i < beats.length; i += 1) {
      assert.notEqual(beats[i].format, beats[i - 1].format, `seed ${seed} beat ${i}`);
    }
  }
});

test('planQuizRound: listening formats need card.audio', () => {
  const noAudio = DECK.map((c) => ({ ...c, audio: undefined }));
  for (const seed of ['a', 'b', 'c', 'd']) {
    for (const beat of plan({ seed }, noAudio)) {
      assert.ok(beat.format !== 'sound-match' && beat.format !== 'listen-pick');
    }
    for (const beat of plan({ seed })) {
      if (beat.format === 'sound-match' || beat.format === 'listen-pick') {
        assert.ok(beat.cards.every((c) => c.audio));
      }
    }
  }
});

test('planQuizRound: handoff card gets pick-meaning as the first beat', () => {
  for (const seed of ['a', 'b', 'c', 'd']) {
    for (const target of [DECK[0], DECK[5], DECK[11]]) {
      const beats = plan({ seed, firstCardId: target.id });
      assert.equal(beats[0].format, 'pick-meaning');
      assert.deepEqual(beats[0].cards.map((c) => c.id), [target.id]);
      assert.equal(allIds(beats).length, DECK.length);
    }
  }
});

test('planQuizRound: deterministic for the same session and deck, different across seeds', () => {
  const key = (beats: QuizBeat[]) => JSON.stringify(beats.map((b) => [b.format, b.cards.map((c) => c.id), (b.options ?? []).map((c) => c.id)]));
  assert.equal(key(plan({ seed: 'x' })), key(plan({ seed: 'x' })));
  assert.notEqual(key(plan({ seed: 'x' })), key(plan({ seed: 'y' })));
});

test('wordsForQuizTypes: build leaves out one-character words; listen leaves out words without audio', () => {
  assert.ok(wordsForQuizTypes(DECK, ['build']).every((c) => Array.from(c.front).length > 1));
  assert.ok(wordsForQuizTypes(DECK, ['listen']).every((c) => c.audio));
  assert.equal(wordsForQuizTypes(DECK, []).length, DECK.length);
  assert.ok(!availableQuizTypes(DECK.filter((c) => !c.audio && Array.from(c.front).length === 1)).has('listen'));
});

test('planQuizRound: a review pass keeps the picked types and covers every missed word once', () => {
  const missed = DECK.slice(0, 6);
  const beats = plan({ reviewPass: true, types: ['hanzi'], extraCards: DECK }, missed);
  assert.deepEqual(allIds(beats).sort(), missed.map((c) => c.id).sort());
  assert.ok(beats.every((b) => b.format === 'pick-hanzi'));
  const built = plan({ reviewPass: true, types: ['build'], extraCards: DECK }, missed.filter((c) => Array.from(c.front).length > 1));
  assert.ok(built.every((b) => b.format === 'word-build'), 'a short review pass still builds words from the loaded deck');
});

test('planQuizRound: true-false shows the right meaning about half the time', () => {
  let tf = 0;
  let truthy = 0;
  for (let n = 0; n < 60; n += 1) {
    for (const beat of plan({ seed: `t${n}` })) {
      if (beat.format !== 'true-false') continue;
      tf += 1;
      assert.ok(beat.shown);
      if (beat.shown.id === beat.cards[0].id) truthy += 1;
      else assert.notEqual(beat.shown.back, beat.cards[0].back);
    }
  }
  assert.ok(tf > 40);
  const ratio = truthy / tf;
  assert.ok(ratio > 0.35 && ratio < 0.65, `true ratio ${ratio}`);
});

test('buildQuizDistractors: no duplicate meaning or hanzi, never the answer', () => {
  const dupes = [...DECK, { ...DECK[7], id: 'dup', front: '水水' }, { ...DECK[8], id: 'dup2', back: 'WATER ' }];
  const answer = DECK[7];
  for (let n = 0; n < 30; n += 1) {
    const out = buildQuizDistractors({ answer, deck: dupes, kind: 'meaning', rng: createQuizRng(`d${n}`) });
    assert.equal(out.length, 2);
    for (const d of out) {
      assert.notEqual(d.id, answer.id);
      assert.notEqual(d.back.trim().toLowerCase(), answer.back);
      assert.notEqual(d.front, answer.front);
    }
  }
});

test('buildQuizDistractors: audio prompts never offer a homophone of the answer', () => {
  const answer = DECK[4]; // 他 tā
  for (let n = 0; n < 40; n += 1) {
    const out = buildQuizDistractors({ answer, deck: DECK, kind: 'meaning', audioPrompt: true, rng: createQuizRng(`h${n}`) });
    assert.ok(out.every((d) => d.id !== DECK[5].id), '她 is not offered for 他');
  }
  // without audio the homophone is a valid distractor
  let seen = false;
  for (let n = 0; n < 80; n += 1) {
    const out = buildQuizDistractors({ answer, deck: DECK, kind: 'meaning', rng: createQuizRng(`h${n}`) });
    if (out.some((d) => d.id === DECK[5].id)) seen = true;
  }
  assert.ok(seen);
});

test('buildQuizDistractors: hanzi choices rank look-alikes (shared character first)', () => {
  const answer = DECK[1]; // 蛋糕
  for (let n = 0; n < 20; n += 1) {
    const out = buildQuizDistractors({ answer, deck: DECK, kind: 'hanzi', rng: createQuizRng(`k${n}`) });
    assert.equal(out[0].front, '蛋');
  }
});

test('buildQuizDistractors: avoids the next beats\' answers when other candidates exist', () => {
  const answer = DECK[7];
  const avoid = new Set(DECK.slice(8, 16).map((c) => c.id));
  for (let n = 0; n < 20; n += 1) {
    const out = buildQuizDistractors({ answer, deck: DECK, kind: 'meaning', avoidIds: avoid, rng: createQuizRng(`v${n}`) });
    assert.ok(out.every((d) => !avoid.has(d.id)));
  }
});

test('parseMeasureWord', () => {
  assert.deepEqual(parseMeasureWord('book (M: 本běn)'), { hanzi: '本', pinyin: 'běn' });
  assert.deepEqual(parseMeasureWord('person (M: 個 gè)'), { hanzi: '個', pinyin: 'gè' });
  assert.deepEqual(parseMeasureWord('paper (M: 張 zhāng, 份 fèn)'), { hanzi: '張', pinyin: 'zhāng' });
  assert.equal(parseMeasureWord('egg'), null);
  assert.equal(parseMeasureWord('thing (M: )'), null);
});

test('buildMeasureWordChoices: 3 distinct tiles including the answer, topped up from the constant list', () => {
  const choices = buildMeasureWordChoices({ hanzi: '本', pinyin: 'běn' }, ['person (M: 個 gè)'], createQuizRng('m'));
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((c) => c.hanzi)).size, 3);
  assert.ok(choices.some((c) => c.hanzi === '本'));
});

test('word building excludes aliases, optional forms, single characters and long expressions', () => {
  assert.ok(canBuildWord(DECK[1]));
  for (const front of ['我', '台北101', '貨比三家不吃虧', '茶/咖啡']) {
    assert.equal(canBuildWord({ ...DECK[1], front }), false);
  }
  assert.equal(canBuildWord({ ...DECK[1], traditional: '電視（機）' }), false);
  assert.equal(canBuildWord({ ...DECK[1], simplified: '地铁/捷运' }), false);
});

test('all four vocabulary books retain full part coverage', () => {
  for (let bookId = 1; bookId <= 4; bookId += 1) {
    const pack = JSON.parse(readFileSync(`public/data/vocabulary/book-${bookId}.json`, 'utf8')) as {
      items: Array<{ id: string; traditional: string; simplified: string; meaning: string }>;
    };
    const parts = new Map<string, Flashcard[]>();
    for (const row of pack.items) {
      const c: Flashcard = { ...row, bookId, lessonId: 1, front: cleanVocabText(row.traditional), back: row.meaning };
      const key = row.id.split('-').slice(0, 2).join('-');
      parts.set(key, [...(parts.get(key) ?? []), c]);
    }
    for (const [part, deck] of parts) {
      const beats = planQuizRound(deck, { seed: part, reviewPass: false });
      assert.deepEqual(allIds(beats).sort(), deck.map((c) => c.id).sort(), part);
      for (const beat of beats) {
        if (beat.format !== 'word-build') continue;
        const remaining = [...beat.tiles!];
        for (const char of Array.from(beat.cards[0].front)) {
          const index = remaining.indexOf(char);
          assert.ok(index >= 0, `${part}: missing ${char}`);
          remaining.splice(index, 1);
        }
        assert.equal(remaining.length, 2, `${part}: exactly two distractor tiles`);
      }
    }
  }
});

test('buildWordTiles: repeated characters keep their own tiles, seeded, null for a sparse deck', () => {
  const answer = { ...DECK[1], front: '謝謝' };
  const tiles = buildWordTiles(answer, DECK, createQuizRng('repeat'))!;
  assert.equal(tiles.filter((char) => char === '謝').length, 2);
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles, buildWordTiles(answer, DECK, createQuizRng('repeat')));
  assert.equal(buildWordTiles(answer, [answer], createQuizRng('sparse')), null);
});

test('buildQuizDistractors: past mix-ups are offered first when they pass the rules', () => {
  const answer = DECK[7]; // 水
  for (let n = 0; n < 10; n += 1) {
    const picked = buildQuizDistractors({ answer, deck: DECK, kind: 'meaning', confusedIds: [DECK[8].id], rng: createQuizRng(`c${n}`) });
    assert.equal(picked[0].id, DECK[8].id);
  }
  // A homophone mix-up is still dropped for an audio prompt.
  const ta = buildQuizDistractors({ answer: DECK[4], deck: DECK, kind: 'meaning', audioPrompt: true, confusedIds: [DECK[5].id], rng: createQuizRng('h') });
  assert.ok(ta.every((c) => c.id !== DECK[5].id));
});

test('planQuizRound: listen type is strictly listen-pick, match type respects matchPairType', () => {
  for (let n = 0; n < 10; n += 1) {
    const listenBeats = plan({ seed: `l${n}`, types: ['listen'] });
    assert.ok(listenBeats.every((b) => b.format === 'listen-pick' || b.format === 'pick-meaning'));
    assert.ok(!listenBeats.some((b) => b.format === 'sound-match' || b.format === 'pair-match'));

    const charMatches = plan({ seed: `cm${n}`, types: ['match'], matchPairType: 'characters' });
    assert.ok(!charMatches.some((b) => b.format === 'sound-match'));
    assert.ok(charMatches.some((b) => b.format === 'pair-match'));

    const audioMatches = plan({ seed: `am${n}`, types: ['match'], matchPairType: 'audio' });
    assert.ok(!audioMatches.some((b) => b.format === 'pair-match'));
    assert.ok(audioMatches.some((b) => b.format === 'sound-match'));
  }
});
