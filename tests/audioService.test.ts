import assert from 'node:assert/strict';
import test, { after } from 'node:test';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

class FakeAudio {
  static instances: FakeAudio[] = [];

  src = '';
  playbackRate = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pauseCount = 0;

  constructor() {
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    return new Promise(() => {});
  }

  pause(): void {
    this.pauseCount += 1;
  }
}

class FakeSpeechSynthesisUtterance {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public text: string) {}
}

const speechState = {
  cancelCount: 0,
  spoken: [] as FakeSpeechSynthesisUtterance[],
};

// Voice list shaped like a macOS browser: an English default plus Siri
// Chinese voices, where the zh-CN one is the higher-quality variant.
const fakeVoices: SpeechSynthesisVoice[] = [
  { voiceURI: 'samantha', name: 'Samantha', lang: 'en-US', default: true, localService: true },
  { voiceURI: 'ting-ting', name: 'Ting-Ting', lang: 'zh-TW', default: false, localService: true },
  { voiceURI: 'mei-jia-enhanced', name: 'Mei-Jia (Enhanced)', lang: 'zh-CN', default: false, localService: true },
];

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    AudioContext: undefined,
    webkitAudioContext: undefined,
    speechSynthesis: {
      cancel: () => {
        speechState.cancelCount += 1;
      },
      getVoices: () => fakeVoices,
      speak: (utterance: FakeSpeechSynthesisUtterance) => {
        speechState.spoken.push(utterance);
      },
    },
  },
});
Object.defineProperty(globalThis, 'Audio', {
  configurable: true,
  value: FakeAudio,
});
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  configurable: true,
  value: FakeSpeechSynthesisUtterance,
});

// Serve audio through the same durable-cache -> object-URL path the browser uses.
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  value: async () => new Response(
    new Blob([new Uint8Array([0xff, 0xf3, 0x00])], { type: 'audio/mpeg' }),
    { status: 200 },
  ),
});

const { AudioService } = await import('../src/services/audioService');

after(() => {
  const restore = (name: string, descriptor: PropertyDescriptor | undefined) => {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  };

  restore('window', originalWindow);
  restore('Audio', originalAudio);
  restore('SpeechSynthesisUtterance', originalUtterance);
  restore('fetch', originalFetch);
});

test('starting a new file resolves and stops the previous playback', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;

  const firstPlayback = service.play('first.mp3', 1, '一');
  const secondPlayback = service.play('second.mp3', 1, '二');

  await firstPlayback;

  // The second playback stops the first and plays the second file via a
  // durable-cache-backed object URL (blob:), never a bare proxy path.
  const started = Date.now();
  while (!audio.src.startsWith('blob:') && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(audio.src.startsWith('blob:'), `expected blob: src, got '${audio.src}'`);
  assert.ok(audio.pauseCount >= 2);

  service.stop();
  await secondPlayback;
});

test('stopping speech resolves its playback promise', async () => {
  const service = new AudioService();
  const playback = service.speakText('你好');

  // Voice selection resolves asynchronously; let the utterance start.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(speechState.spoken.at(-1)?.text, '你好');
  assert.equal(speechState.spoken.at(-1)?.voice?.name, 'Mei-Jia (Enhanced)');
  service.stop();
  await playback;
  assert.ok(speechState.cancelCount > 0);
});

test('picks the exact-language voice over a higher-quality other variant', async () => {
  const service = new AudioService();
  const playback = service.speakText('謝謝', 'zh-TW');

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(speechState.spoken.at(-1)?.voice?.name, 'Ting-Ting');
  service.stop();
  await playback;
});

test('English definitions never fall back to a Chinese voice', async () => {
  const service = new AudioService();
  const playback = service.speakText('hello there', 'en-US');

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(speechState.spoken.at(-1)?.voice?.lang, 'en-US');
  service.stop();
  await playback;
});
