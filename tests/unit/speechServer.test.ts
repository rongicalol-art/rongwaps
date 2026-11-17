import assert from 'node:assert/strict';
import test from 'node:test';
import { handle } from '../../server/app';
import { resetAuthState } from '../../server/auth';
import type { AudioStore, Context } from '../../server/env';
import { parseSpeechRequest, speak, speechMarkup } from '../../server/speech';
import { speechKey } from '../../shared/speechKey';
import { wordBopomofo } from '../../src/utils/pinyin/bopomofo';

const AZURE = 'https://japaneast.tts.speech.microsoft.com';
function memoryStore(): AudioStore & { files: Map<string, ArrayBuffer> } {
  const files = new Map<string, ArrayBuffer>();
  return {
    files,
    async get(key) { const file = files.get(key); return file ? { body: new Response(file).body! } : null; },
    async put(key, value) { files.set(key, value); },
  };
}
const context = (env: Context['env'] = {}): Context => ({ env: { AZURE_SPEECH_KEY: 'fixture-key', AZURE_SPEECH_REGION: 'japaneast', ...env }, report: () => {} });
const ask = (body: unknown) => new Request('https://app.test/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('only short Chinese text, and only a reading that names every character, is spoken', () => {
  assert.deepEqual(parseSpeechRequest({ text: '  圖書館  ' }), { text: '圖書館', voice: 'female' });
  assert.deepEqual(parseSpeechRequest({ text: '你好嗎？', voice: 'male' }), { text: '你好嗎？', voice: 'male' });
  assert.deepEqual(parseSpeechRequest({ text: '銀行', reading: 'ㄧㄣˊ ㄏㄤˊ' }), { text: '銀行', voice: 'female', reading: 'ㄧㄣˊ ㄏㄤˊ' });
  for (const refused of [
    null, {}, { text: '' }, { text: 'hello' }, { text: '好'.repeat(81) }, { text: '你好<break/>' }, { text: '你好', voice: 'robot' },
    { text: '銀行', reading: 'ㄧㄣˊ' }, { text: '銀行', reading: 'yin hang' }, { text: '銀行', reading: 'ㄧㄣˊ ㄏㄤˊ" /><x' },
    { text: '你好！', reading: 'ㄋㄧˇ ㄏㄠˇ' }, { text: 42 },
  ]) assert.equal(parseSpeechRequest(refused), null, JSON.stringify(refused));
});

test('the reading is spelled out for the voice and text can never become markup', () => {
  assert.match(speechMarkup({ text: '銀行', voice: 'female', reading: 'ㄧㄣˊ ㄏㄤˊ' }),
    /<voice name="zh-TW-HsiaoChenNeural"><phoneme alphabet="sapi" ph="ㄧㄣˊ ㄏㄤˊ">銀行<\/phoneme><\/voice>/);
  const markup = speechMarkup({ text: '你好 & 再見', voice: 'male' });
  assert.match(markup, /zh-TW-YunJheNeural/);
  assert.ok(markup.includes('你好 &#38; 再見') && !markup.includes(' & '));
});

test('a text is made once, kept, and served from storage ever after', async (t) => {
  const store = memoryStore();
  const sent: { url: string; body: string; key: string | null }[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({ url: String(input), body: String(init?.body), key: new Headers(init?.headers).get('Ocp-Apim-Subscription-Key') });
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
  });
  const first = await speak(context({ SPEECH_AUDIO: store }), ask({ text: '銀行', reading: 'ㄧㄣˊ ㄏㄤˊ' }));
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'audio/mpeg');
  assert.equal(first.headers.get('x-speech-source'), 'new');
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual([...new Uint8Array(await first.arrayBuffer())], [1, 2, 3]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, `${AZURE}/cognitiveservices/v1`);
  assert.equal(sent[0].key, 'fixture-key');
  assert.ok(sent[0].body.includes('ph="ㄧㄣˊ ㄏㄤˊ"'));
  assert.deepEqual([...store.files.keys()], [await speechKey('銀行', 'female', 'ㄧㄣˊ ㄏㄤˊ')]);

  const again = await speak(context({ SPEECH_AUDIO: store }), ask({ text: ' 銀行 ', reading: 'ㄧㄣˊ ㄏㄤˊ' }));
  assert.equal(again.headers.get('x-speech-source'), 'stored');
  assert.deepEqual([...new Uint8Array(await again.arrayBuffer())], [1, 2, 3]);
  assert.equal(sent.length, 1, 'the stored file answers without asking Azure again');
  // Another reading or voice of the same word is a different file.
  assert.notEqual(await speechKey('銀行', 'female'), await speechKey('銀行', 'female', 'ㄧㄣˊ ㄏㄤˊ'));
  assert.notEqual(await speechKey('銀行', 'female'), await speechKey('銀行', 'male'));
  assert.match(await speechKey('銀行', 'female'), /^speech\/v1\/female-[a-f0-9]{28}-[a-f0-9]{12}\.mp3$/);
});

test('a voice that is out, missing or broken never stores anything and answers with a plain failure', async (t) => {
  const store = memoryStore();
  let status = 429;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; if (!status) throw new Error('network'); return new Response(status === 200 ? '' : 'no', { status }); });
  assert.equal((await speak(context({ SPEECH_AUDIO: store }), ask({ text: '你好' }))).status, 503, 'allowance used up');
  status = 400;
  assert.equal((await speak(context({ SPEECH_AUDIO: store }), ask({ text: '你好' }))).status, 502);
  status = 200;
  assert.equal((await speak(context({ SPEECH_AUDIO: store }), ask({ text: '你好' }))).status, 502, 'an empty file is not audio');
  status = 0;
  assert.equal((await speak(context({ SPEECH_AUDIO: store }), ask({ text: '你好' }))).status, 502);
  assert.equal(store.files.size, 0);
  const before = calls;
  assert.equal((await speak(context({ AZURE_SPEECH_KEY: undefined }), ask({ text: '你好' }))).status, 503);
  assert.equal((await speak(context(), ask({ text: 'hello' }))).status, 400);
  assert.equal(calls, before, 'no key or nothing to speak: Azure is never asked');
});

test('the voice needs a signed-in learner', async (t) => {
  resetAuthState();
  let asked = 0;
  t.mock.method(globalThis, 'fetch', async () => { asked++; return new Response('x'); });
  const response = await handle(ask({ text: '你好' }), context());
  assert.equal(response.status, 401);
  assert.equal(asked, 0);
});

test('pinyin becomes one Bopomofo syllable per character, or nothing at all', () => {
  for (const [word, pinyin, expected] of [
    ['圖書館', 'túshūguǎn', 'ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ'], ['你好', 'nǐ hǎo', 'ㄋㄧˇ ㄏㄠˇ'], ['銀行', 'yínháng', 'ㄧㄣˊ ㄏㄤˊ'],
    ['女兒', "nǚ'ér", 'ㄋㄩˇ ㄦˊ'], ['學生', 'xuésheng', 'ㄒㄩㄝˊ ㄕㄥ˙'], ['軍隊', 'jūnduì', 'ㄐㄩㄣ ㄉㄨㄟˋ'],
    ['長', 'zhang3', 'ㄓㄤˇ'], ['垃圾', 'lè sè', 'ㄌㄜˋ ㄙㄜˋ'], ['西安', "Xī'ān", 'ㄒㄧ ㄢ'], ['熊貓', 'xióngmāo', 'ㄒㄩㄥˊ ㄇㄠ'],
    ['知識', 'zhīshi', 'ㄓ ㄕ˙'], ['有用', 'yǒuyòng', 'ㄧㄡˇ ㄩㄥˋ'], ['問', 'wèn', 'ㄨㄣˋ'],
  ] as const) assert.equal(wordBopomofo(word, pinyin), expected, word);
  // Erhua, a missing syllable, letters and an absent reading are never guessed.
  for (const [word, pinyin] of [['一會兒', 'yīhuìr'], ['銀行', 'yín'], ['卡拉OK', 'kǎlā OK'], ['銀行', undefined], ['嗯', 'ǹg']] as const) {
    assert.equal(wordBopomofo(word, pinyin), null, word);
  }
});
