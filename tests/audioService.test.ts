import assert from 'node:assert/strict';
import test, { after } from 'node:test';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
const originalUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');

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

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    AudioContext: undefined,
    webkitAudioContext: undefined,
    speechSynthesis: {
      cancel: () => {
        speechState.cancelCount += 1;
      },
      getVoices: () => [],
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
});

test('starting a new file resolves and stops the previous playback', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;

  const firstPlayback = service.play('first.mp3', 1, '一');
  const secondPlayback = service.play('second.mp3', 1, '二');

  await firstPlayback;
  assert.equal(audio.src, '/api/audio/second.mp3');
  assert.ok(audio.pauseCount >= 2);

  service.stop();
  await secondPlayback;
});

test('stopping speech resolves its playback promise', async () => {
  const service = new AudioService();
  const playback = service.speakText('你好');

  assert.equal(speechState.spoken.at(-1)?.text, '你好');
  service.stop();
  await playback;
  assert.ok(speechState.cancelCount > 0);
});
