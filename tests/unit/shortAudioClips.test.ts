import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { ShortAudioClips } from '../../src/services/audio/shortAudioClips';

class Source {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  stopped = false;
  disconnected = false;
  connect() {}
  disconnect() { this.disconnected = true; }
  started = false;
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class Context extends EventTarget {
  static latest: Context;
  state = 'running';
  destination = {};
  sources: Source[] = [];
  decodes = 0;
  activeDecodes = 0;
  peakDecodes = 0;
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  constructor() { super(); Context.latest = this; }
  async decodeAudioData(): Promise<AudioBuffer> {
    this.decodes++;
    this.peakDecodes = Math.max(this.peakDecodes, ++this.activeDecodes);
    await Promise.resolve();
    this.activeDecodes--;
    return { length: 24000, duration: 1, numberOfChannels: 1 } as AudioBuffer;
  }
  createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
}

async function fixture(t: TestContext, run: () => Promise<void>) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const fetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Context } });
  globalThis.fetch = async () => new Response(new Blob(['clip'], { type: 'audio/mpeg' }));
  try { await run(); }
  finally {
    t.mock.timers.reset();
    globalThis.fetch = fetch;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

test('short clips decode once off the tap path; rapid replacements settle and disconnect their sources', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  await Promise.all([clips.prepare('blob:one'), clips.prepare('blob:one'), clips.prepare('blob:two')]);
  const context = Context.latest;
  assert.equal(context.decodes, 2);
  assert.equal(context.peakDecodes, 1);
  let ended = 0;
  for (let i = 0; i < 40; i++) {
    const stop = clips.play(i % 2 ? 'blob:one' : 'blob:two', 1, 0, () => ended++);
    assert.ok(stop);
    stop(); stop();
  }
  assert.equal(context.decodes, 2, 'repeated taps must never decode');
  assert.ok(context.sources.every((source) => source.stopped && source.disconnected && !source.onended));
  assert.equal(ended, 0, 'cancellation must not masquerade as natural completion');
  clips.play('blob:one', 1, 0, () => ended++);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(context.sources.at(-1)!.started);
  context.sources.at(-1)!.onended!();
  assert.equal(ended, 1);
  assert.ok(context.sources.at(-1)!.disconnected);
}));

test('speed changes preserve pitch through native media; cold files, seeked tracks and interrupted contexts fall back', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  assert.equal(clips.play('blob:cold', 1, 0, () => {}), undefined);
  await clips.prepare('blob:word');
  assert.equal(clips.play('blob:word', 0.8, 0, () => {}), undefined);
  assert.equal(clips.play('blob:word', 1, 2, () => {}), undefined);
  let settled = false;
  clips.play('blob:word', 1, 0, () => { settled = true; });
  await new Promise((resolve) => setImmediate(resolve));
  Context.latest.state = 'suspended';
  Context.latest.dispatchEvent(new Event('statechange'));
  assert.ok(settled, 'background interruption must release waiting flow');
  assert.ok(Context.latest.sources[0].stopped, 'resuming must not replay a stale clip');
}));

test('decoded memory and entry counts are bounded; long and large recordings remain streamed', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  for (let i = 0; i < 17; i++) await clips.prepare(`blob:clip${i}`);
  assert.equal(clips.play('blob:clip0', 1, 0, () => {}), undefined);
  assert.ok(clips.play('blob:clip16', 1, 0, () => {}));
  const context = Context.latest;
  context.decodeAudioData = async () => ({ length: 1024 * 1024, duration: 10, numberOfChannels: 1 }) as AudioBuffer;
  for (let i = 0; i < 3; i++) await clips.prepare(`blob:pcm${i}`);
  assert.equal(clips.play('blob:pcm0', 1, 0, () => {}), undefined, 'three 4MiB buffers must not fit the 8MiB budget');
  assert.ok(clips.play('blob:pcm2', 1, 0, () => {}));
  context.decodeAudioData = async () => ({ length: 24000, duration: 90, numberOfChannels: 1 }) as AudioBuffer;
  assert.equal(await clips.prepare('blob:long'), false);
  globalThis.fetch = async () => new Response(new Blob([new Uint8Array(256 * 1024 + 1)]));
  assert.equal(await clips.prepare('blob:large'), false);
  assert.equal(await clips.prepare('https://example.test/track.mp3'), false, 'preparation never downloads remote tracks');
}));

test('decoder failure falls back and abort releases a screen without canceling another subscriber', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  clips.unlock();
  const context = Context.latest;
  context.decodeAudioData = async () => { throw new Error('unsupported codec'); };
  assert.equal(await clips.prepare('blob:bad'), false);
  let deliver!: (buffer: AudioBuffer) => void;
  let entered!: () => void;
  const decoding = new Promise<void>((resolve) => { entered = resolve; });
  context.decodeAudioData = () => new Promise((resolve) => { deliver = resolve; entered(); });
  const controller = new AbortController();
  const abandoned = clips.prepare('blob:shared', controller.signal);
  const wanted = clips.prepare('blob:shared');
  const rejected = assert.rejects(abandoned, { name: 'AbortError' });
  await decoding;
  controller.abort();
  await rejected;
  deliver({ length: 24000, duration: 1, numberOfChannels: 1 } as AudioBuffer);
  assert.equal(await wanted, true);
  assert.ok(clips.play('blob:shared', 1, 0, () => {}));
}));


test('idle suspension saves output work and a canceled resume cannot play later', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  await clips.prepare('blob:resume');
  clips.play('blob:resume', 1, 0, () => {});
  await new Promise((resolve) => setImmediate(resolve));
  Context.latest.sources.at(-1)!.onended!();
  t.mock.timers.tick(15_000);
  assert.equal(Context.latest.state, 'suspended');
  let resume!: () => void;
  Context.latest.resume = () => new Promise<void>((resolve) => { resume = () => { Context.latest.state = 'running'; resolve(); }; });
  const stop = clips.play('blob:resume', 1, 0, () => assert.fail('canceled resume must not finish a newer play'))!;
  const source = Context.latest.sources.at(-1)!;
  let started = false;
  source.start = () => { started = true; };
  await Promise.resolve();
  stop();
  resume();
  await Promise.resolve();
  assert.equal(started, false);
  assert.ok(source.disconnected);
}));


test('the shared service cancels rapid buffered plays and retains native pitch correction at slower rates', async (t) => fixture(t, async () => {
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  class NativeAudio {
    src = ''; readyState = 0; paused = true; currentTime = 0; plays = 0; preservesPitch = false;
    onended: (() => void) | null = null;
    addEventListener() {} removeEventListener() {}
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: NativeAudio });
  const { AudioService } = await import('../../src/services/audioService');
  const service = new AudioService();
  try {
    const url = 'https://audio.example.test/short.mp3';
    await service.preload([url]);
    await service.prepareRecording(url);
    const native = service.getGlobalAudio() as unknown as NativeAudio;
    // A prior cold stream must not hide the newly prepared buffer on replay.
    native.src = url; native.readyState = 4;
    const plays = Array.from({ length: 40 }, () => service.play(url));
    await Promise.resolve();
    assert.equal(native.plays, 0, 'prepared taps must bypass native play, including a previously streamed URL');
    Context.latest.sources.at(-1)!.onended!();
    await Promise.all(plays);
    const slow = service.play(url, 0.8);
    await Promise.resolve();
    assert.equal(native.plays, 1);
    assert.equal(native.preservesPitch, true);
    native.onended!();
    await slow;
  } finally {
    service.stop();
    if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio);
    else Reflect.deleteProperty(globalThis, 'Audio');
  }
}));


test('failed context recovery releases the buffered source and hands playback to native media once', async (t) => fixture(t, async () => {
  const clips = new ShortAudioClips();
  await clips.prepare('blob:recovery');
  const context = Context.latest;
  context.state = 'suspended';
  context.resume = () => { throw new Error('audio output unavailable'); };
  let fallback = 0;
  clips.play('blob:recovery', 1, 0, () => assert.fail('failure is not completion'), () => fallback++);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fallback, 1);
  assert.ok(context.sources.at(-1)!.disconnected);
  t.mock.timers.tick(2500);
  assert.equal(fallback, 1);
}));
