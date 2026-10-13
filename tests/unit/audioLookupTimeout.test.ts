import assert from 'node:assert/strict';
import test from 'node:test';

test('a stalled character recording index cannot hold an answer audio promise forever', async (context) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const oldFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class {
    src = ''; currentTime = 0;
    pause() {}
  } });
  globalThis.fetch = () => new Promise<Response>(() => {});
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { AudioService } = await import('../../src/services/audioService');
    const service = new AudioService();
    let unavailable = 0;
    const pending = service.playCard({ source: 'dictionary', front: '行', pinyin: 'háng' }, 1, { onUnavailable: () => unavailable++ });
    context.mock.timers.tick(2500);
    await pending;
    assert.equal(unavailable, 1);
    service.stop();
  } finally {
    context.mock.timers.reset();
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldAudio) Object.defineProperty(globalThis, 'Audio', oldAudio); else Reflect.deleteProperty(globalThis, 'Audio');
  }
});
