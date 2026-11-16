import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { HOOK_PACKS, renderHookPack } from '../../scripts/memory-hooks/buildHookPacks';
import type { HookPack, TeachHook, WordHook } from '../../src/types/hookPieces';
import {
  isLeftOutSound, isTeachHook, isValidTeachHookPack, isValidWordHookPack, isWordHook, parseHookText, pieceJobLabel, plainHookText, teachHookProblems,
} from '../../src/utils/characters/hookPieces';
import { cleanVocabText } from '../../src/utils/vocabulary/vocabCleaner';

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const pieces = read<HookPack<TeachHook>>('public/data/hook-pieces/pieces.json');
const words = read<HookPack<WordHook>>('public/data/word-hooks/words.json');

test('the committed hook packs are exactly what the authored content builds, and every entry passes its checks', () => {
  for (const pack of HOOK_PACKS) {
    const { items, problems } = pack.load();
    assert.deepEqual(problems, []);
    const { packText, manifestText } = renderHookPack(pack, items);
    assert.equal(fs.readFileSync(`public/data/${pack.dir}/${pack.file}`, 'utf8'), packText, `run npm run hooks:packs (${pack.dir})`);
    assert.equal(fs.readFileSync(`public/data/${pack.dir}/manifest.json`, 'utf8'), manifestText, `run npm run hooks:packs (${pack.dir} manifest)`);
    const manifest = JSON.parse(manifestText) as { shards: Array<{ sha256: string; bytes: number }> };
    assert.equal(manifest.shards[0].sha256, createHash('sha256').update(packText).digest('hex'));
    assert.equal(manifest.shards[0].bytes, Buffer.byteLength(packText));
  }
  assert.ok(isValidTeachHookPack(pieces, pieces.count));
  assert.ok(isValidWordHookPack(words, words.count));
});

test('the packs cover the course: every book has character hooks, and most multi-character words have a word hook', () => {
  const chars = new Set(pieces.items.map((item) => item.char));
  const hooked = new Set(words.items.map((item) => item.word));
  for (const book of [1, 2, 3, 4]) {
    const items = read<{ items: Array<{ traditional: string }> }>(`public/data/vocabulary/book-${book}.json`).items;
    const fronts = [...new Set(items.map((item) => cleanVocabText(item.traditional)))];
    const courseChars = new Set(fronts.flatMap((front) => [...front]).filter((ch) => /\p{Script=Han}/u.test(ch)));
    const missingChars = [...courseChars].filter((ch) => !chars.has(ch));
    assert.ok(missingChars.length <= 3, `Book ${book}: characters without a hook: ${missingChars.join(' ')}`);
    const multi = fronts.filter((front) => [...front].length >= 2 && [...front].length <= 4 && /^\p{Script=Han}+$/u.test(front));
    const covered = multi.filter((front) => hooked.has(front)).length;
    assert.ok(covered / multi.length > 0.97, `Book ${book}: only ${covered} of ${multi.length} words have a hook`);
  }
});

test('hook text splits into plain words, piece words and the one meaning', () => {
  const hook = 'A {0|bamboo} case whose sides match {1|each other, 相 xiāng}: a **box**.';
  assert.deepEqual(parseHookText(hook), [
    { text: 'A ' }, { text: 'bamboo', piece: 0 }, { text: ' case whose sides match ' }, { text: 'each other, 相 xiāng', piece: 1 }, { text: ': a ' }, { text: 'box', strong: true }, { text: '.' },
  ]);
  assert.equal(plainHookText(hook), 'A bamboo case whose sides match each other, 相 xiāng: a box.');
});

test('a tile says what its piece does, and a sound piece left out of the sentence is reported', () => {
  const rent = pieces.items.find((item) => item.char === '租')!;
  assert.equal(pieceJobLabel(rent.pieces[0]), 'meaning');
  assert.equal(pieceJobLabel(rent.pieces[1]), 'old sound');
  assert.equal(isLeftOutSound(rent, 0), false);
  assert.equal(isLeftOutSound(rent, 1), true);
  const box = pieces.items.find((item) => item.char === '箱')!;
  assert.equal(pieceJobLabel(box.pieces[1]), 'sound → xiāng');
  assert.equal(isLeftOutSound(box, 1), false);
});

test('content rules reject strokes that overlap, go missing or run past the character', () => {
  const entry: TeachHook = {
    char: '好', pinyin: 'hǎo', gloss: 'good',
    pieces: [{ name: 'woman', glyph: '女', job: 'meaning', strokes: [[0, 2]] }, { name: 'child', glyph: '子', job: 'meaning', strokes: [[3, 5]] }],
    hook: 'A {0|woman} with her {1|child}: **good**.',
  };
  assert.ok(isTeachHook(entry));
  assert.deepEqual(teachHookProblems(entry, () => 6), []);
  assert.ok(teachHookProblems(entry, () => 7).some((problem) => problem.includes('belong to no piece')));
  assert.ok(teachHookProblems(entry, () => 5).some((problem) => problem.includes('past the last stroke')));
  assert.ok(teachHookProblems({ ...entry, hook: 'A woman with her child.' }, () => 6).some((problem) => problem.includes('one bold meaning')));
  assert.ok(teachHookProblems(entry, () => undefined).some((problem) => problem.includes('no stroke data')));
});

test('a word hook must spell its word with its parts, and only a learn-it-whole word carries a teach line', () => {
  const sum: WordHook = { word: '公寓', gloss: 'apartment', parts: [{ text: '公', meaning: 'shared' }, { text: '寓', meaning: 'residence' }], kind: 'sum' };
  assert.ok(isWordHook(sum));
  assert.ok(!isWordHook({ ...sum, parts: [sum.parts[0]] }));
  assert.ok(!isWordHook({ ...sum, teach: 'A line.' }));
  assert.ok(!isWordHook({ ...sum, kind: 'whole' }));
  assert.ok(isWordHook({ ...sum, kind: 'whole', teach: 'Learn the pair together.' }));
});
