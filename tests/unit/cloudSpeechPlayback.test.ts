import assert from 'node:assert/strict';
import test, { after, beforeEach } from 'node:test';

// The cloud voice only asks when the app has a backend to ask.
process.env.VITE_SUPABASE_URL = 'https://cloud-voice-fixture.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'fixture-anon-key';

class FakeAudio {
  static last: FakeAudio;
  src = '';
  playbackRate = 1;
  defaultPlaybackRate = 1;
  preservesPitch = false;
  currentTime = 0;
  readyState = 0;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  constructor() { FakeAudio.last = this; }
  addEventListener(): void {}
  removeEventListener(): void {}
  load(): void {}
  play(): Promise<void> { this.paused = false; return new Promise(() => {}); }
  pause(): void { this.paused = true; }
}
const spoken: { text: string; lang: string }[] = [];
class FakeUtterance {
  lang = ''; rate = 1; voice: unknown = null;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(public text: string) {}
  addEventListener(): void {}
}
const saved = ['window', 'Audio', 'SpeechSynthesisUtterance'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
const voices = [{ lang: 'zh-TW', name: 'Device voice', localService: true }];
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  setTimeout, speechSynthesis: {
    getVoices: () => voices, cancel() {}, addEventListener() {}, removeEventListener() {},
    speak(utterance: FakeUtterance) { spoken.push({ text: utterance.text, lang: utterance.lang }); queueMicrotask(() => utterance.onend?.()); },
  },
} });
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
after(() => {
  for (const [name, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete (globalThis as Record<string, unknown>)[name];
  }
});

const { AudioService } = await import('../../src/services/audioService');
const { authService } = await import('../../src/services/authService');
const { resetCloudSpeech } = await import('../../src/services/audio/cloudSpeech');
const { canPlayCard } = await import('../../src/services/audio/recordingFile');

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
type Asked = { url: string; body: { text: string; voice: string; reading?: string }; authorization: string | null };
function server(t: test.TestContext, answer: () => Response): Asked[] {
  const asked: Asked[] = [];
  t.mock.method(authService, 'getAccessToken', async () => 'learner-token');
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    asked.push({ url: String(input), body: JSON.parse(String(init?.body)), authorization: new Headers(init?.headers).get('Authorization') });
    return answer();
  });
  return asked;
}
const mp3 = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } });
beforeEach(() => { resetCloudSpeech(); spoken.length = 0; });

test('a dictionary word without a recording is said by the cloud voice with its own reading', async (t) => {
  const asked = server(t, mp3);
  const service = new AudioService();
  const audio = FakeAudio.last;
  let unavailable = 0;
  const playback = service.playCard({ front: '銀行', pinyin: 'yínháng', source: 'dictionary' }, 1, { onUnavailable: () => unavailable++ });
  await settle();
  assert.deepEqual(asked, [{ url: '/api/speech', body: { text: '銀行', voice: 'female', reading: 'ㄧㄣˊ ㄏㄤˊ' }, authorization: 'Bearer learner-token' }]);
  assert.match(audio.src, /^blob:/);
  audio.onended?.();
  await playback;
  assert.equal(unavailable, 0);
  assert.equal(spoken.length, 0, 'the device voice is never used for a reading-checked card');

});

test('a dictionary word stays silent when the voice is out or its reading cannot be spelled', async (t) => {
  const asked = server(t, () => Response.json({ error: 'out' }, { status: 503 }));
  const service = new AudioService();
  let unavailable = 0;
  await service.playCard({ front: '銀行', pinyin: 'yínháng', source: 'dictionary' }, 1, { onUnavailable: () => unavailable++ });
  assert.equal(unavailable, 1);
  await service.playCard({ front: '一會兒', pinyin: 'yīhuìr', source: 'dictionary' }, 1, { onUnavailable: () => unavailable++ });
  assert.equal(unavailable, 2);
  assert.equal(asked.length, 1, 'erhua has no safe spelling, so the server is not asked');
  assert.equal(spoken.length, 0);
});

test('a dictionary row shows a speaker only when it can play without guessing', () => {
  assert.equal(canPlayCard({ front: '學生', audio: 'B1L01-1-01.mp3', source: 'dictionary' }), true);
  assert.equal(canPlayCard({ front: '銀行', pinyin: 'yínháng', source: 'dictionary' }), true);
  assert.equal(canPlayCard({ front: '長', pinyin: 'zhǎng', source: 'dictionary' }), true);
  assert.equal(canPlayCard({ front: '一會兒', pinyin: 'yīhuìr', source: 'dictionary' }), false);
  assert.equal(canPlayCard({ front: '銀行', source: 'dictionary' }), false);
  assert.equal(canPlayCard({ front: '銀行', pinyin: 'yínháng' }), false, 'only reading-checked dictionary words use the voice');
});

test('speakReading says the text with the given reading', async (t) => {
  const asked = server(t, mp3);
  const service = new AudioService();
  const audio = FakeAudio.last;
  const playback = service.speakReading('长大', 'ㄓㄤˇ ㄉㄚˋ', 1);
  await settle();
  assert.deepEqual(asked[0].body, { text: '长大', voice: 'female', reading: 'ㄓㄤˇ ㄉㄚˋ' });
  audio.onended?.();
  await playback;
});

test('other Chinese text uses the cloud voice first and the device voice when it is out; English never asks', async (t) => {
  let status = 200;
  const asked = server(t, () => (status === 200 ? mp3() : Response.json({ error: 'out' }, { status })));
  const service = new AudioService();
  const audio = FakeAudio.last;
  const sentence = service.play(undefined, 1, '我們一起去喝咖啡吧。', 'zh-TW');
  await settle();
  assert.deepEqual(asked.map((request) => request.body), [{ text: '我們一起去喝咖啡吧。', voice: 'female' }]);
  assert.match(audio.src, /^blob:/);
  audio.onended?.();
  await sentence;
  assert.equal(spoken.length, 0);

  status = 503;
  await service.speakText('謝謝', 'zh-TW');
  assert.deepEqual(spoken, [{ text: '謝謝', lang: 'zh-TW' }]);
  // Once refused, the voice is left alone for a while: no wait before the device voice.
  await service.speakTTS('再見');
  assert.equal(asked.length, 2);
  assert.equal(spoken.length, 2);

  resetCloudSpeech();
  await service.speakText('hello there', 'en-US');
  assert.equal(asked.length, 2);
  assert.equal(spoken.at(-1)?.text, 'hello there');
});
