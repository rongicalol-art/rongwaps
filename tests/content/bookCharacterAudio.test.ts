import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fetchVocabulary } from '../../src/services/vocabularyService';
import { getCourseVocabLookupMap, findCharacterCourseContext, findMatchingCourseRecording } from '../../src/services/courseVocabLookup';
import { characterReadings } from '../../src/utils/pinyin/characterReadings';
import { findReadingMatch } from '../../src/utils/pinyin/pronunciationMatching';
import { isPronunciationAudioPack } from '../../src/services/pronunciationAudio';

// These are unresolved source gaps, not permission to substitute a different pronunciation.
const knownReadingGaps = new Set<string>();
const knownWordGaps = new Set<string>();

test('every book form aligns and has exact-reading character or full-word audio, except declared source gaps', async () => {
  const cards = await fetchVocabulary();
  const books = await getCourseVocabLookupMap();
  const manifest = JSON.parse(await readFile('public/data/pronunciation-audio/manifest.json', 'utf8'));
  const bank = JSON.parse(await readFile(`public${manifest.path}`, 'utf8'));
  assert.equal(isPronunciationAudioPack(bank), true);
  assert.ok(bank.items.zi5, 'Neutral-tone 子 must have its own source-labelled recording');
  assert.ok(bank.items.zi3, 'Neutral 子 must not replace zǐ');
  assert.equal(bank.items.r5, undefined, 'Erhua must not be relabelled as standalone er');
  const pairs = new Set<string>();
  const unexpected: string[] = [];
  for (const card of cards) {
    if (!card.audio && !knownWordGaps.has(card.id)) unexpected.push(`word ${card.id}`);
    for (const raw of [card.traditional || card.front, card.simplified || card.front]) for (const form of raw.split('/')) {
      const aligned = characterReadings(form.replace(/[()（）]/g, ''), card.pinyin, raw);
      assert.ok(aligned, `Unaligned ${card.id}: ${form}`);
      for (let i = 0; i < aligned.characters.length; i++) for (const reading of aligned.readings[i]) pairs.add(`${aligned.characters[i]}|${reading}`);
    }
  }
  for (const key of pairs) {
    const [char, reading] = key.split('|');
    if (bank.items[reading] || findReadingMatch(books, [char], reading)?.audio) continue;
    if (!(await findCharacterCourseContext(char, reading))?.audio && !knownReadingGaps.has(key)) unexpected.push(key);
  }
  assert.deepEqual(unexpected, [], 'New audio gaps require a source review');
});

test('the supplementary word recording is attributed, licensed and matches the authored book reading', async () => {
  const receipt = JSON.parse(await readFile('content/audio/book_audio_supplements.json', 'utf8'));
  const cards = await fetchVocabulary();
  for (const source of receipt.recordings) {
    const word = cards.find((card) => card.id === source.id);
    assert.equal(word?.front, source.word);
    assert.ok((word?.pinyin ?? '').split('/').includes(source.pinyin));
    if (source.scope === 'reading') {
      assert.notEqual(word?.audio, source.audio, 'An alternate reading must not replace the original book recording');
      assert.equal((await findMatchingCourseRecording(source.word, source.pinyin))?.audio, source.audio);
    } else assert.equal(word?.audio, source.audio);
    if (source.audio.startsWith('book-supplement/qwen/')) {
      assert.equal(source.license, 'Apache-2.0 (model)');
      assert.equal(source.listeningReview, 'Owner approved listening preview, 2026-10-11.');
    } else {
      assert.equal(source.license, 'CC BY-SA 3.0 US');
      assert.ok(source.source.startsWith('https://commons.wikimedia.org/wiki/File:'));
    }
    assert.ok(source.author);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
  }
});

test('reviewed neutral readings use full-word context without substituting citation tones', async () => {
  for (const [char, reading, word] of [['瑰', 'gui5', '玫瑰'], ['娘', 'niang5', '王母娘娘'], ['家', 'jia5', '人家']]) {
    const context = await findCharacterCourseContext(char, reading);
    assert.equal(context?.front, word);
    assert.ok(context?.audio?.startsWith('book-supplement/qwen/'));
  }
  assert.equal(await findMatchingCourseRecording('玫瑰', 'méigui/méiguī'), undefined);
  assert.equal(await findMatchingCourseRecording('人家', 'rénjià'), undefined);
});
