import assert from 'node:assert/strict';
import test from 'node:test';
import { createStaticIndex } from '../../src/hooks/createStaticIndex';

test('index subscribers share one request and only mounted subscribers receive completion', async () => {
  let requests = 0;
  let finish!: (value: { word: string }) => void;
  const pending = new Promise<{ word: string }>((resolve) => { finish = resolve; });
  const index = createStaticIndex(() => { requests++; return pending; });
  let first = 0;
  let second = 0;
  assert.equal(requests, 0, 'unused indexes do not fetch');
  assert.equal(index.getSnapshot(), null);
  const unsubscribe = index.subscribe(() => { first++; });
  index.subscribe(() => { second++; });
  assert.equal(requests, 1);
  unsubscribe();
  const value = { word: '你好' };
  finish(value);
  await pending;
  assert.equal(first, 0);
  assert.equal(second, 1);
  assert.strictEqual(index.getSnapshot(), value);
  index.subscribe(() => {});
  assert.equal(requests, 1, 'later subscribers use the resident index');
});

test('unavailable indexes remain null and separate indexes cannot share data', async () => {
  const missing = createStaticIndex(async () => null);
  const loaded = createStaticIndex(async () => ({ one: 1 }));
  missing.subscribe(() => { assert.fail('missing data must not publish a loaded snapshot'); });
  loaded.subscribe(() => {});
  await Promise.resolve();
  assert.equal(missing.getSnapshot(), null);
  assert.deepEqual(loaded.getSnapshot(), { one: 1 });
});

test('a failed or unavailable index can load again on the next subscription without a page restart', async () => {
  for (const failure of ['null', 'reject']) {
    let requests = 0;
    const value = { reading: 'lǎo' };
    const index = createStaticIndex(async () => {
      requests++;
      if (requests === 1) { if (failure === 'reject') throw new Error('503'); return null; }
      return value;
    });
    const unsubscribe = index.subscribe(() => {});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(index.getSnapshot(), null);
    unsubscribe();
    index.subscribe(() => {});
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(index.getSnapshot(), value);
    assert.equal(requests, 2);
  }
});
