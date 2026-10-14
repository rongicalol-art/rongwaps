import assert from 'node:assert/strict';
import test from 'node:test';
import { playRangeOnAudioElement } from '../../src/services/audio/playbackEngine';

test('audio UI updates stay bounded at 60/120Hz while range completion stays frame accurate', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let now = 0;
  let nextFrame: FrameRequestCallback | null = null;
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { requestAnimationFrame: (callback: FrameRequestCallback) => { nextFrame = callback; return 1; } },
  });
  try {
    for (const hz of [60, 120]) {
      now = 0;
      nextFrame = null;
      const times: number[] = [];
      let ended = false;
      let paused = false;
      const audio = {
        src: '', currentTime: 0, seeking: false, readyState: 4,
        play: () => Promise.resolve(), pause: () => { paused = true; },
      } as unknown as HTMLAudioElement;
      const cleanup = playRangeOnAudioElement(audio, '/test.mp3', 0, 10,
        { onTime: (time) => times.push(time) }, (complete) => { ended = Boolean(complete); }, () => {});
      try {
        await Promise.resolve();
        const frame = () => {
          const callback = nextFrame as FrameRequestCallback | null;
          nextFrame = null;
          assert.ok(callback, 'playback should keep checking its exact range endpoint');
          callback(now);
        };
        for (let i = 0; i <= hz; i++) {
          now = i * 1000 / hz;
          audio.currentTime = i / hz;
          frame();
        }
        assert.ok(times.length <= 11, `${hz}Hz must publish at most 11 UI updates per second; got ${times.length}`);
        const count = times.length;
        now += 200;
        frame();
        assert.equal(times.length, count, 'a stalled clock must not repeatedly rerender the reader');
        audio.currentTime = 5;
        frame();
        assert.equal(times.at(-1), 5, 'seeking must update the UI immediately');
        audio.currentTime = 10;
        frame();
        assert.ok(ended && paused, 'range endpoint must stop playback on the same frame');
        assert.equal(nextFrame, null, 'completed playback must stop scheduling frames');
      } finally {
        cleanup();
      }
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance);
  }
});
