import assert from 'node:assert/strict';
import test from 'node:test';
import { getCharacterAudio, getPronunciationAudioIndex, getReviewedWordAudio, isPronunciationAudioPack, type PronunciationAudioPack } from '../../src/services/pronunciationAudio';

const pack: PronunciationAudioPack = {
  schemaVersion: 1, version: '0123456789abcdef', count: 4, prefix: 'pronunciation/cns-female-20250113/',
  items: { hang2: 'hang2-0123456789ab.mp3', xing2: 'xing2-0123456789ab.mp3', 'lü3': 'lv3-0123456789ab.mp3', zi5: 'zi5-0123456789ab.mp3' },
  words: [{ word: '人家', pinyin: 'rénjia', audio: 'book-supplement/qwen/B4L11-1-44-0123456789ab.mp3' }],
};

test('audio index rejects wrong tones, unsafe paths, mismatched filenames and oversized banks', () => {
  assert.equal(isPronunciationAudioPack(pack), true);
  const invalidItems: Record<string, string>[] = [
    { hang2: '../hang2.mp3' }, { hang2: 'xing2-0123456789ab.mp3' },
    { hang5: 'hang4-0123456789ab.mp3' }, { 'hang2 xing2': 'hang2-0123456789ab.mp3' },
    { 'lü3': 'lu3-0123456789ab.mp3' },
  ];
  for (const items of invalidItems) assert.equal(isPronunciationAudioPack({ ...pack, count: 1, items }), false);
  assert.equal(isPronunciationAudioPack({ ...pack, count: 1501 }), false);
  assert.equal(isPronunciationAudioPack({ ...pack, prefix: 'https://elsewhere.test/' }), false);
  assert.equal(isPronunciationAudioPack({ ...pack, words: [pack.words![0], pack.words![0]] }), false);
  assert.equal(isPronunciationAudioPack({ ...pack, words: [{ ...pack.words![0], pinyin: 'rénjia/rénjiā' }] }), false);
  assert.equal(isPronunciationAudioPack({ ...pack, words: [{ ...pack.words![0], audio: '../unsafe.mp3' }] }), false);
});

test('invalid/contextual readings never fetch; character requests share one lazy metadata load', async () => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedFetch = globalThis.fetch;
  const calls: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  globalThis.fetch = async (input) => {
    const url = String(input); calls.push(url);
    const payload = url.endsWith('manifest.json') ? { schemaVersion: 1, version: '0123456789abcdef', count: 4, path: '/data/pronunciation-audio/0123456789abcdef.json' } : pack;
    return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    for (const [word, reading] of [['銀行', 'yin2hang2'], ['行', 'xing2/hang2'], ['行', ''], ['行', 'xing2 hang2']]) {
      assert.equal(await getCharacterAudio(word, reading), undefined);
    }
    assert.equal(calls.length, 0);
    const [a, b, c] = await Promise.all([getCharacterAudio('行', 'háng'), getCharacterAudio('行', 'xíng'), getCharacterAudio('旅', 'lü3')]);
    assert.equal(a, pack.prefix + pack.items.hang2);
    assert.equal(b, pack.prefix + pack.items.xing2);
    assert.equal(c, pack.prefix + pack.items['lü3']);
    assert.equal(await getCharacterAudio('子', 'zi'), pack.prefix + pack.items.zi5);
    assert.equal(await getCharacterAudio('子', 'zǐ'), undefined);
    assert.equal(await getReviewedWordAudio('人家', 'ren2jia5'), pack.words![0].audio);
    assert.equal(await getReviewedWordAudio('人家', 'ren2jia1'), undefined);
    assert.equal(await getCharacterAudio('家', 'jia5'), undefined, 'Whole words must never become character clips');
    await getPronunciationAudioIndex();
    assert.deepEqual(calls, ['/data/pronunciation-audio/manifest.json', '/data/pronunciation-audio/0123456789abcdef.json']);
  } finally {
    globalThis.fetch = savedFetch;
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow); else Reflect.deleteProperty(globalThis, 'window');
  }
});
