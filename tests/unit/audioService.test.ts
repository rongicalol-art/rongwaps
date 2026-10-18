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
  defaultPlaybackRate = 1;
  preservesPitch = false;
  mozPreservesPitch = false;
  webkitPreservesPitch = false;
  private time = 0;
  seekThrows = false;
  readyState = 0;
  private listeners = new Map<string, Set<EventListener>>();
  private onceListeners = new Map<string, Set<EventListener>>();
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: ((event: Event) => void) | null = null;
  pauseCount = 0;
  paused = false;

  constructor() {
    FakeAudio.instances.push(this);
  }

  get currentTime(): number { return this.time; }
  set currentTime(value: number) {
    if (this.seekThrows) throw new Error('metadata not loaded');
    this.time = value;
  }

  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    if (options?.once) {
      const once = this.onceListeners.get(type) ?? new Set<EventListener>();
      once.add(listener);
      this.onceListeners.set(type, once);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
    this.onceListeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (this.onceListeners.get(type)?.has(listener)) this.removeEventListener(type, listener);
      listener({ type } as Event);
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  play(): Promise<void> {
    this.paused = false;
    return new Promise(() => {});
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
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

const { AudioService } = await import('../../src/services/audioService');

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

  const firstPlayback = service.play('https://audio.example.test/first.mp3?token=temporary', 1, '一');
  const secondUrl = 'https://audio.example.test/second.mp3?token=temporary';
  const secondPlayback = service.play(secondUrl, 1, '二');

  await firstPlayback;

  // The second playback stops the first and streams its temporary URL directly.
  assert.equal(audio.src, secondUrl);
  assert.ok(audio.pauseCount >= 2);

  service.stop();
  await secondPlayback;
});

test('overlap play lets the playing clip ring out on the spare element', async () => {
  const service = new AudioService();
  const first = FakeAudio.instances.at(-1)!;
  service.initialize();
  const spare = FakeAudio.instances.at(-1)!;
  assert.notEqual(spare, first);
  first.paused = false;
  spare.paused = false;

  void service.play('https://audio.example.test/first.mp3', 1, '一', undefined, 0, { overlap: true });
  const firstPauses = first.pauseCount;
  assert.equal(service.getGlobalAudio(), spare, 'new clip moves to the spare element');
  assert.equal(first.pauseCount, firstPauses, 'playing clip is not paused by overlap');

  service.stop();
  assert.equal(first.paused, true, 'stop() silences the tail too');
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

test('unrecorded text uses locale-aware browser speech at the fallback rate', async () => {
  const service = new AudioService();
  const playback = service.play(undefined, 0.75, '繁體文本', 'zh-TW');

  await new Promise((resolve) => setTimeout(resolve, 0));
  const utterance = speechState.spoken.filter((item) => item.text === '繁體文本').at(-1);
  assert.ok(utterance);
  assert.equal(utterance.lang, 'zh-TW');
  assert.equal(utterance.rate, 0.86 * 0.75);
  utterance.onend?.();
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

test('playRange seeks to the start and stops at the range end', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  const times: number[] = [];
  const playback = service.playRange('https://audio.example.test/first.mp3?token=temporary', 2.5, 5.0, { onTime: (t) => times.push(t) });

  assert.equal(audio.src, 'https://audio.example.test/first.mp3?token=temporary');
  assert.equal(audio.currentTime, 2.5);

  // Simulate playback progress and crossing the range end.
  audio.currentTime = 3.7;
  audio.ontimeupdate?.({} as Event);
  assert.ok(times.includes(3.7));
  audio.currentTime = 5.2;
  audio.ontimeupdate?.({} as Event);
  await playback;
  assert.ok(audio.pauseCount >= 1, 'audio should be paused at range end');
});

test('playRange resolves when stopped mid-range', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  const playback = service.playRange('https://audio.example.test/first.mp3', 0, 10);

  assert.equal(audio.src, 'https://audio.example.test/first.mp3');
  service.stop();
  await playback; // must settle, not hang
});

test('playRange uses a 10 second remote startup and stall watchdog', async () => {
  const service = new AudioService();
  const originalSetTimeout = globalThis.setTimeout;
  const delays: number[] = [];
  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    delays.push(delay ?? 0);
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;

  try {
    const playback = service.playRange('https://audio.example.test/book.mp3', 0, 20);
    const audio = FakeAudio.instances.at(-1)!;
    audio.dispatch('playing');
    audio.dispatch('waiting');
    assert.equal(delays.filter((delay) => delay === 10_000).length, 2, 'startup and stall should wait 10 seconds');
    service.stop();
    await playback;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('playRange removes pending loadedmetadata seek when stopped', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  audio.seekThrows = true;

  const playback = service.playRange('https://audio.example.test/book.mp3', 2, 10);
  assert.equal(audio.listenerCount('loadedmetadata'), 1);
  service.stop();
  await playback;

  assert.equal(audio.listenerCount('loadedmetadata'), 0);
  audio.seekThrows = false;
  audio.dispatch('loadedmetadata');
  assert.equal(audio.currentTime, 0, 'stale metadata event must not seek the stopped audio');
});

test('playRange re-registers metadata seek when restarting the same source', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  const source = 'https://audio.example.test/book.mp3';
  audio.seekThrows = true;

  const firstPlayback = service.playRange(source, 2, 10);
  service.stop();
  await firstPlayback;
  assert.equal(audio.listenerCount('loadedmetadata'), 0);

  const secondPlayback = service.playRange(source, 4, 10);
  assert.equal(audio.listenerCount('loadedmetadata'), 1);
  audio.seekThrows = false;
  audio.dispatch('loadedmetadata');
  assert.equal(audio.currentTime, 4);

  service.stop();
  await secondPlayback;
});

test('pause preserves currentTime while stop resets it to 0', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  audio.currentTime = 14.2;

  service.pause();
  assert.equal(audio.currentTime, 14.2, 'pause() must preserve currentTime');
  assert.equal(service.getCurrentTime(), 14.2);

  service.stop();
  assert.equal(audio.currentTime, 0, 'stop() must reset currentTime to 0');
  assert.equal(service.getCurrentTime(), 0);
});

test('playRange resolves when paused mid-range without resetting currentTime', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  const playback = service.playRange('https://audio.example.test/first.mp3', 0, 10);

  assert.equal(audio.src, 'https://audio.example.test/first.mp3');
  audio.currentTime = 4.8;
  service.pause();
  await playback; // must settle, not hang
  assert.equal(audio.currentTime, 4.8, 'pause() must keep position');
});

test('slow remote audio falls back to local speech instead of holding the quiz', async () => {
  const service = new AudioService();
  const playback = service.play('https://audio.example.test/slow.mp3', 1, '美國');

  const started = Date.now();
  while (!speechState.spoken.some((utterance) => utterance.text === '美國') && Date.now() - started < 3500) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const utterance = speechState.spoken.filter((item) => item.text === '美國').at(-1);
  assert.ok(utterance, 'local speech should start after the remote audio timeout');
  utterance.onend?.();
  await playback;
  service.stop();
});

test('setPlaybackRate enforces pitch preservation and updates rate', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;

  service.setPlaybackRate(0.75);
  assert.equal(audio.preservesPitch, true);
  assert.equal(audio.playbackRate, 0.75);
  assert.equal(audio.defaultPlaybackRate, 0.75);

  service.setPlaybackRate(1.25);
  assert.equal(audio.preservesPitch, true);
  assert.equal(audio.playbackRate, 1.25);
  assert.equal(audio.defaultPlaybackRate, 1.25);
});

test('fetchAudioBlob deduplicates concurrent in-flight requests', async () => {
  const { fetchAudioBlob } = await import('../../src/services/audio/audioCache');
  const [blob1, blob2] = await Promise.all([
    fetchAudioBlob('https://audio.example.test/dedupe-test.mp3?token=temporary'),
    fetchAudioBlob('https://audio.example.test/dedupe-test.mp3?token=temporary'),
  ]);
  assert.ok(blob1 instanceof Blob);
  assert.ok(blob2 instanceof Blob);
  assert.equal(blob1.size, blob2.size);
});

test('fetchAudioBlob aborts a stalled response body after its timeout', async () => {
  const { fetchAudioBlob } = await import('../../src/services/audio/audioCache');
  const originalSetTimeout = globalThis.setTimeout;
  const originalFetch = globalThis.fetch;
  const state: {
    timeoutCallback?: () => void;
    timeoutDelay: number;
    requestSignal?: AbortSignal | null;
  } = { timeoutDelay: 0 };
  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    if (delay !== 10_000) return originalSetTimeout(callback as () => void, delay);
    state.timeoutCallback = callback as () => void;
    state.timeoutDelay = delay ?? 0;
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    state.requestSignal = init?.signal ?? null;
    return {
      ok: true,
      statusText: 'OK',
      headers: new Headers(),
      blob: () => new Promise<Blob>((_resolve, reject) => {
        state.requestSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }),
    } as Response;
  }) as typeof fetch;

  try {
    const pending = fetchAudioBlob('https://audio.example.test/stalled-body.mp3?unique=timeout-test');
    await new Promise((resolve) => originalSetTimeout(resolve, 0));
    const signal = state.requestSignal;
    const timeoutCallback = state.timeoutCallback;
    assert.ok(signal, 'fetch should receive an abort signal');
    assert.ok(timeoutCallback, 'fetch should install a timeout');
    assert.equal(state.timeoutDelay, 10_000);
    timeoutCallback();
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(signal.aborted, true);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.fetch = originalFetch;
  }
});

test('audio preload deduplicates names and caps parallel downloads at three', async () => {
  const { preloadAudioFiles } = await import('../../src/services/audio/audioCache');
  const objectUrls = new Map<string, string>();
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;

  await preloadAudioFiles(
    ['one.mp3', 'one.mp3', 'two.mp3', 'three.mp3', 'four.mp3'],
    objectUrls,
    async (fileName) => {
      calls.push(fileName);
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      objectUrls.set(fileName, `blob:${fileName}`);
      return `blob:${fileName}`;
    },
  );

  assert.deepEqual(calls, ['one.mp3', 'two.mp3', 'three.mp3', 'four.mp3']);
  assert.equal(maxActive, 3);
});

// A persistent cache shared by fresh AudioService instances; no network or real progress.
const cacheEntries = new Map<string, Response>();
const memoryCache = {
  match: async (request: Request) => cacheEntries.get(request.url)?.clone(),
  put: async (request: Request, response: Response) => { cacheEntries.set(request.url, response.clone()); },
  keys: async () => [...cacheEntries.keys()].map((url) => new Request(url)),
  delete: async (request: Request) => cacheEntries.delete(request.url),
} as unknown as Cache;
const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
after(() => {
  if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches);
  else Reflect.deleteProperty(globalThis, 'caches');
});
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function enableCache() {
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { open: async () => memoryCache } });
}

test('dictionary cards do not guess a missing or failed reading with TTS', async () => {
  const service = new AudioService();
  let unavailable = 0;
  const before = speechState.spoken.length;
  await service.playCard({ front: '行', source: 'dictionary' }, 1, { onUnavailable: () => unavailable++ });
  const pending = service.playCard({ front: '行', audio: 'https://audio.example.test/missing.mp3', source: 'dictionary' }, 1, { onUnavailable: () => unavailable++ });
  FakeAudio.instances.at(-1)!.onerror?.();
  await pending;
  assert.equal(unavailable, 2);
  assert.equal(speechState.spoken.length, before);
});

test('cached recording plays after service recreation, offline, with zero network requests', async () => {
  enableCache();
  const { audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  const name = 'https://audio.example.test/offline.mp3';
  cacheEntries.set(audioFileCacheRequest(name).url, new Response(new Blob(['cached audio'])));
  let requests = 0;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { requests++; throw new Error('offline'); };
  try {
    for (let i = 0; i < 2; i++) {
      const service = new AudioService();
      const audio = FakeAudio.instances.at(-1)!;
      const pending = service.play(name);
      await tick();
      assert.ok(audio.src.startsWith('blob:'), 'a fresh service reads Cache Storage');
      service.stop();
      await pending;
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = savedFetch; }
});

test('persistent cache miss streams immediately without a full-download fetch', async () => {
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  let requests = 0;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { requests++; throw new Error('must stream'); };
  try {
    const pending = service.play('https://audio.example.test/cold.mp3');
    await tick();
    assert.equal(audio.src, 'https://audio.example.test/cold.mp3');
    assert.equal(requests, 0);
    service.stop();
    await pending;
  } finally { globalThis.fetch = savedFetch; }
});

test('reader ranges reuse persistent recordings offline after reload without fetching', async () => {
  enableCache();
  const { audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  const name = 'https://audio.example.test/offline-reader.mp3';
  cacheEntries.set(audioFileCacheRequest(name).url, new Response(new Blob(['reader audio'])));
  const savedFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('offline'); };
  try {
    const service = new AudioService();
    const audio = FakeAudio.instances.at(-1)!;
    const pending = service.playRange(name, 2, 10);
    await tick();
    assert.ok(audio.src.startsWith('blob:'));
    assert.equal(requests, 0);
    service.stop();
    await pending;
  } finally { globalThis.fetch = savedFetch; }
});

test('reader cache misses stream, and stopped cache lookups cannot restart playback', async () => {
  enableCache();
  const service = new AudioService();
  const audio = FakeAudio.instances.at(-1)!;
  const cold = service.playRange('https://audio.example.test/cold-reader.mp3', 0, 10);
  await tick();
  assert.equal(audio.src, 'https://audio.example.test/cold-reader.mp3');
  service.stop();
  await cold;
  const oldMatch = memoryCache.match;
  let release!: (blob: Blob) => void;
  memoryCache.match = async () => ({ blob: () => new Promise<Blob>((resolve) => { release = resolve; }) }) as Response;
  try {
    const delayed = service.playRange('https://audio.example.test/old-reader.mp3', 0, 10);
    await tick();
    service.stop();
    release(new Blob(['old reader']));
    await tick();
    assert.notEqual(audio.src, 'https://audio.example.test/old-reader.mp3');
    await delayed;
  } finally { memoryCache.match = oldMatch; }
});

test('rapid navigation ignores a delayed cached blob from the previous card', async () => {
  const { audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  const name = 'https://audio.example.test/delayed.mp3';
  let release!: (blob: Blob) => void;
  const oldMatch = memoryCache.match;
  memoryCache.match = async (request: Request) => request.url === audioFileCacheRequest(name).url
    ? { blob: () => new Promise<Blob>((resolve) => { release = resolve; }) } as Response
    : undefined;
  try {
    const service = new AudioService();
    const audio = FakeAudio.instances.at(-1)!;
    const first = service.play(name);
    await tick();
    const second = service.play('https://audio.example.test/current.mp3');
    await tick();
    release(new Blob(['old']));
    await tick();
    assert.equal(audio.src, 'https://audio.example.test/current.mp3');
    service.stop();
    await Promise.all([first, second]);
  } finally { memoryCache.match = oldMatch; }
});

test('buffered recordings replay and seek ranges without waiting for disk or changing source', async () => {
  const service = new AudioService();
  const url = 'https://audio.example.test/buffered-replay.mp3';
  const first = service.play(url);
  await tick();
  const audio = service.getGlobalAudio() as unknown as FakeAudio;
  audio.readyState = 4;
  audio.currentTime = 2;
  service.pause();
  await first;
  const oldMatch = memoryCache.match;
  let lookups = 0;
  memoryCache.match = async () => { lookups++; return new Promise<Response>(() => {}); };
  try {
    const replay = service.play(url);
    assert.equal(audio.src, url);
    assert.equal(audio.currentTime, 0, 'replay seeks the existing resource synchronously');
    service.pause();
    await replay;
    const range = service.playRange(url, 1, 3);
    assert.equal(audio.currentTime, 1);
    assert.equal(audio.src, url);
    service.stop();
    await range;
    assert.equal(lookups, 0);
  } finally { service.stop(); memoryCache.match = oldMatch; }
});

test('aborted lookahead skips queued recordings and never treats text as a filename', async () => {
  const { preloadAudioFiles } = await import('../../src/services/audio/audioCache');
  const controller = new AbortController();
  const calls: string[] = [];
  await preloadAudioFiles(['行', 'first.mp3', 'next.mp3'], new Map(), async (name) => {
    calls.push(name);
    controller.abort();
    return `blob:${name}`;
  }, controller.signal);
  assert.deepEqual(calls, ['first.mp3']);
});

test('recording object URLs evict by bytes and by recent use', async () => {
  const { cacheObjectUrl } = await import('../../src/services/audio/audioCache');
  const savedRevoke = URL.revokeObjectURL;
  const revoked: string[] = [];
  URL.revokeObjectURL = (url) => { revoked.push(url); };
  try {
    const urls = new Map<string, string>();
    cacheObjectUrl(urls, 'one', 'blob:one', 10 * 1024 * 1024);
    cacheObjectUrl(urls, 'two', 'blob:two', 10 * 1024 * 1024);
    cacheObjectUrl(urls, 'one', 'blob:one');
    cacheObjectUrl(urls, 'three', 'blob:three', 10 * 1024 * 1024);
    assert.equal(urls.has('two'), false);
    assert.equal(urls.has('one'), true);
    assert.deepEqual(revoked, ['blob:two']);
  } finally { URL.revokeObjectURL = savedRevoke; }
});

test('a cancelled character lookup cannot start audio after rapid navigation', async () => {
  const service = new AudioService();
  const audio = service.getGlobalAudio()!;
  const savedFetch = globalThis.fetch;
  let deliverManifest: ((value: Response) => void) | undefined;
  const version = '0123456789abcdef';
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('manifest.json')) return new Promise<Response>((resolve) => { deliverManifest = resolve; });
    return Response.json({ schemaVersion: 1, version, count: 1, prefix: 'pronunciation/cns-female-20250113/', items: { hang2: 'hang2-0123456789ab.mp3' } });
  };
  try {
    const pending = service.playCard({ source: 'dictionary', front: '行', pinyin: 'háng' });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.ok(deliverManifest);
    const next = service.play('https://audio.example.test/navigation-next.mp3', 1);
    await pending;
    deliverManifest(Response.json({ schemaVersion: 1, version, count: 1, path: `/data/pronunciation-audio/${version}.json` }));
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    assert.equal(audio.src, 'https://audio.example.test/navigation-next.mp3');
    assert.equal(speechState.spoken.at(-1)?.text === '行', false);
    service.stop();
    await next;
  } finally {
    service.stop();
    globalThis.fetch = savedFetch;
  }
});

test('leaving a question aborts its active preload download as well as queued clips', async () => {
  const service = new AudioService();
  const controller = new AbortController();
  const savedFetch = globalThis.fetch;
  let requests = 0;
  let aborted = false;
  globalThis.fetch = async (_url, options) => {
    requests++;
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  };
  try {
    const pending = service.preload(['https://audio.example.test/preload-abort.mp3', 'https://audio.example.test/active-two.mp3', 'https://audio.example.test/active-three.mp3', 'https://audio.example.test/queued.mp3'], controller.signal);
    await tick();
    controller.abort();
    await pending;
    assert.equal(aborted, true);
    assert.equal(requests, 3);
  } finally { globalThis.fetch = savedFetch; }
});

test('audio preparation waits for an existing download instead of reporting early readiness', async () => {
  const { preloadAudioFiles } = await import('../../src/services/audio/audioCache');
  let release!: (url: string) => void;
  const inFlight = new Promise<string>((resolve) => { release = resolve; });
  let ready = false;
  const pending = preloadAudioFiles(['already-loading.mp3'], new Map(),
    async () => inFlight).then(() => { ready = true; });
  await tick();
  assert.equal(ready, false);
  release('blob:prepared');
  await pending;
  assert.equal(ready, true);
});

test('quiz preparation reports distinct cached, downloaded and failed files honestly', async () => {
  const { preloadAudioFiles } = await import('../../src/services/audio/audioCache');
  const snapshots: Array<{ ready: number; failed: number; total: number }> = [];
  const fetched: string[] = [];
  await preloadAudioFiles(['cached.mp3', 'new.mp3', 'new.mp3', undefined, 'missing.mp3', '漢字'],
    new Map([['cached.mp3', 'blob:cached']]), async (name) => {
      fetched.push(name);
      if (name === 'missing.mp3') throw new Error('404');
      return 'blob:downloaded';
    }, undefined, (progress) => snapshots.push(progress));
  assert.deepEqual(fetched, ['new.mp3', 'missing.mp3']);
  assert.deepEqual(snapshots, [
    { ready: 0, failed: 0, total: 3 }, { ready: 1, failed: 0, total: 3 },
    { ready: 2, failed: 0, total: 3 }, { ready: 2, failed: 1, total: 3 },
  ]);
});

test('a shared transport failure stops quiz downloads without declaring remaining files missing', async () => {
  const { preloadAudioFiles } = await import('../../src/services/audio/audioCache');
  const attempted: string[] = [];
  let progress;
  await preloadAudioFiles(Array.from({ length: 19 }, (_, i) => `lesson-${i}.mp3`), new Map(), async (name) => {
    attempted.push(name);
    throw new TypeError('Failed to fetch');
  }, undefined, (state) => { progress = state; });
  assert.equal(attempted.length, 3);
  assert.deepEqual(progress, { ready: 0, failed: 3, total: 19, blocked: true });
});

test('canceling one preload subscriber preserves the other subscriber and only fetches once', async () => {
  const { fetchAudioBlob } = await import('../../src/services/audio/audioCache');
  const savedFetch = globalThis.fetch;
  const first = new AbortController();
  const second = new AbortController();
  let requests = 0;
  let networkSignal: AbortSignal | null | undefined;
  let release!: (response: Response) => void;
  globalThis.fetch = async (_url, options) => {
    requests++;
    networkSignal = options?.signal;
    assert.equal(options?.cache, 'reload', 'a prior streaming response must not poison CORS downloads');
    return new Promise<Response>((resolve) => { release = resolve; });
  };
  try {
    const url = 'https://audio.example.test/shared-owner.mp3';
    const abandoned = fetchAudioBlob(url, first.signal);
    const wanted = fetchAudioBlob(url, second.signal);
    const rejected = assert.rejects(abandoned, { name: 'AbortError' });
    await tick();
    first.abort();
    await rejected;
    assert.equal(networkSignal?.aborted, false);
    release(new Response(new Blob(['recording'], { type: 'audio/mpeg' })));
    assert.equal((await wanted).size, 9);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = savedFetch; }
});

test('an immediate restart can replace an aborted download without its late cleanup deleting the new request', async () => {
  const { fetchAudioBlob } = await import('../../src/services/audio/audioCache');
  const savedFetch = globalThis.fetch;
  const controller = new AbortController();
  let requests = 0;
  let release!: (response: Response) => void;
  globalThis.fetch = async (_url, options) => {
    requests++;
    if (requests === 1) return new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    return new Promise<Response>((resolve) => { release = resolve; });
  };
  try {
    const url = 'https://audio.example.test/restart-owner.mp3';
    const old = fetchAudioBlob(url, controller.signal);
    const rejected = assert.rejects(old, { name: 'AbortError' });
    await tick();
    controller.abort();
    const fresh = fetchAudioBlob(url);
    await rejected;
    await tick();
    const joined = fetchAudioBlob(url);
    release(new Response(new Blob(['fresh'], { type: 'audio/mpeg' })));
    await Promise.all([fresh, joined]);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = savedFetch; }
});

test('empty audio and HTML error pages never become persistent recordings', async () => {
  const { fetchAudioBlob, audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  const savedFetch = globalThis.fetch;
  try {
    for (const [suffix, response] of [['empty', new Response(new Blob([], { type: 'audio/mpeg' }))], ['html', new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } })]] as const) {
      const url = `https://audio.example.test/invalid-${suffix}.mp3`;
      globalThis.fetch = async () => response;
      await assert.rejects(fetchAudioBlob(url), /Invalid audio response/);
      assert.equal(cacheEntries.has(audioFileCacheRequest(url).url), false);
    }
  } finally { globalThis.fetch = savedFetch; }
});

test('persistent recording byte limits still work when IndexedDB is unavailable', async () => {
  const { pruneAudioCacheToLimit, audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  cacheEntries.clear();
  for (let i = 0; i < 4; i++) cacheEntries.set(audioFileCacheRequest(`large-${i}.mp3`).url, new Response('mp3', { headers: { 'Content-Length': String(50 * 1024 * 1024) } }));
  await pruneAudioCacheToLimit();
  assert.equal(cacheEntries.size, 3);
  cacheEntries.clear();
});

test('active AbortError and synchronous range failures settle playback instead of hanging', async () => {
  const savedPlay = FakeAudio.prototype.play;
  try {
    for (const synchronous of [false, true]) {
      FakeAudio.prototype.play = () => {
        if (synchronous) throw new Error('unsupported playback');
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      };
      const service = new AudioService();
      let unavailable = 0;
      await service.playRange('https://audio.example.test/failure-range.mp3', 0, 2, { onUnavailable: () => unavailable++ });
      assert.equal(unavailable, 1);
      await service.play('https://audio.example.test/failure-word.mp3', 1, undefined, undefined, 0, { fallback: 'none', onUnavailable: () => unavailable++ });
      assert.equal(unavailable, 2);
      if (!synchronous) {
        const spokenBefore = speechState.spoken.length;
        await service.playCard({ front: '同學', audio: 'https://audio.example.test/failure-card.mp3' }, 1);
        assert.equal(speechState.spoken.length, spokenBefore, 'AbortError on recorded card must settle immediately without browser speech fallback');
      }
      assert.equal((service.getGlobalAudio() as unknown as FakeAudio).listenerCount('loadedmetadata'), 0);
    }
  } finally { FakeAudio.prototype.play = savedPlay; }
});

test('late range startup does not overwrite a newly selected playback speed', async () => {
  const savedPlay = FakeAudio.prototype.play;
  let started!: () => void;
  FakeAudio.prototype.play = () => new Promise<void>((resolve) => { started = resolve; });
  try {
    const service = new AudioService();
    const pending = service.playRange('https://audio.example.test/rate-before-start.mp3', 0, 5, { rate: 1 });
    await tick();
    service.setPlaybackRate(0.5);
    started();
    await tick();
    assert.equal(service.getGlobalAudio()!.playbackRate, 0.5);
    service.stop();
    await pending;
  } finally { FakeAudio.prototype.play = savedPlay; }
});

test('range completion is distinct from interruption so failed readers cannot loop', async () => {
  const service = new AudioService();
  let completed = 0;
  const first = service.playRange('https://audio.example.test/loop-range.mp3', 0, 1, { onComplete: () => completed++ });
  await tick();
  service.stop();
  await first;
  assert.equal(completed, 0);
  const second = service.playRange('https://audio.example.test/loop-range.mp3', 0, 1, { onComplete: () => completed++ });
  await tick();
  FakeAudio.instances.at(-1)!.onended?.();
  await second;
  assert.equal(completed, 1);
});

test('mutable memory recordings expire online but remain playable offline; hashed clips remain immutable', async () => {
  const { cacheObjectUrl, getCachedObjectUrl } = await import('../../src/services/audio/audioCache');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  const urls = new Map<string, string>();
  try {
    cacheObjectUrl(urls, 'mutable.mp3', 'blob:mutable', 10);
    cacheObjectUrl(urls, 'offline.mp3', 'blob:offline', 10);
    cacheObjectUrl(urls, 'versioned-abcdef012345.mp3', 'blob:versioned', 10);
    now += 86400_001;
    assert.equal(getCachedObjectUrl(urls, 'mutable.mp3'), undefined);
    assert.equal(getCachedObjectUrl(urls, 'versioned-abcdef012345.mp3'), 'blob:versioned');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
    assert.equal(getCachedObjectUrl(urls, 'offline.mp3'), 'blob:offline');
  } finally {
    Date.now = oldNow;
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('whole-file resumes retry their seek after metadata and remove that handler on cancellation', async () => {
  const service = new AudioService();
  const audio = service.getGlobalAudio() as unknown as FakeAudio;
  audio.seekThrows = true;
  const pending = service.play('https://audio.example.test/resume-seek.mp3', 1, undefined, undefined, 3);
  await tick();
  assert.equal(audio.listenerCount('loadedmetadata'), 1);
  audio.seekThrows = false;
  audio.dispatch('loadedmetadata');
  assert.equal(audio.currentTime, 3);
  service.stop();
  await pending;
  assert.equal(audio.listenerCount('loadedmetadata'), 0);
});

test('a browser voice that never starts releases the playback promise', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const service = new AudioService();
  try {
    const pending = service.speakText('voice-start-watchdog');
    await Promise.resolve();
    const before = speechState.cancelCount;
    context.mock.timers.tick(2500);
    await pending;
    assert.equal(speechState.cancelCount, before + 1);
  } finally { service.stop(); context.mock.timers.reset(); }
});

test('stale cached recordings still play when an unreachable network incorrectly reports online', async () => {
  const { audioFileCacheRequest } = await import('../../src/services/audio/audioCache');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldFetch = globalThis.fetch;
  const url = 'https://audio.example.test/stale-offline.mp3';
  cacheEntries.set(audioFileCacheRequest(url).url, new Response(new Blob(['recording'], { type: 'audio/mpeg' }), { headers: { 'X-Audio-Cached-At': '1' } }));
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  const service = new AudioService();
  try {
    const pending = service.play(url, 1, undefined, undefined, 0, { fallback: 'none' });
    await tick();
    assert.ok(service.getGlobalAudio()!.src.startsWith('blob:'));
    service.stop();
    await pending;
  } finally {
    service.stop();
    globalThis.fetch = oldFetch;
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('an unresponsive cache body yields to streaming rather than holding playback indefinitely', async (context) => {
  const { readCachedAudioBlob } = await import('../../src/services/audio/audioCache');
  const oldMatch = memoryCache.match;
  memoryCache.match = async () => ({ headers: new Headers(), blob: () => new Promise<Blob>(() => {}) }) as Response;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pending = readCachedAudioBlob('https://audio.example.test/cache-body-stall.mp3');
    context.mock.timers.tick(100);
    assert.equal(await pending, null);
  } finally { memoryCache.match = oldMatch; context.mock.timers.reset(); }
});


test('offline playback allows a slow local cache to finish before the longer deadline', async (context) => {
  const { readCachedAudioBlob } = await import('../../src/services/audio/audioCache');
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldMatch = memoryCache.match;
  let deliver!: (blob: Blob) => void;
  const blob = new Blob(['offline recording'], { type: 'audio/mpeg' });
  memoryCache.match = async () => ({ headers: new Headers(), blob: () => new Promise<Blob>((resolve) => { deliver = resolve; }) }) as Response;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let settled = false;
    const pending = readCachedAudioBlob('https://audio.example.test/slow-offline-cache.mp3').then((result) => { settled = true; return result; });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    context.mock.timers.tick(350);
    await Promise.resolve();
    assert.equal(settled, false);
    deliver(blob);
    assert.equal(await pending, blob);
  } finally {
    memoryCache.match = oldMatch;
    context.mock.timers.reset();
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
