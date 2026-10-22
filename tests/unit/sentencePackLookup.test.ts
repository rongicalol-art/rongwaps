import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fetchExamplesForWord } from '../../src/services/vocabularyService';

test('single-character example lookup loads sentence packs without the full vocabulary packs', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const requests: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input).replace(/\?v=[a-f0-9]+$/, '');
    requests.push(path);
    const filePath = `public${path}`;
    return new Response(fs.readFileSync(filePath), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  try {
    const examples = await fetchExamplesForWord('好');
    assert.ok(examples.length > 0);
    assert.ok(requests.some((path) => path.startsWith('/data/course-examples/')));
    assert.ok(!requests.some((path) => path.startsWith('/data/vocabulary/')));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
