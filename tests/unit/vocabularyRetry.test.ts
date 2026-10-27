import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getCourseVocabLookupMap } from '../../src/services/courseVocabLookup';
import { fetchVocabulary } from '../../src/services/vocabularyService';

// A cold friend device must recover metadata in the same tab after one failed book request.
test('an unavailable vocabulary pack never poisons vocabulary or course audio lookup caches', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'window', descriptor); else Reflect.deleteProperty(globalThis, 'window'); });
  let fail = true;
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const path = String(input).split('?')[0];
    requests.push(path);
    if (path.endsWith('/book-2.json') && fail) return Response.json({}, { status: 503 });
    return new Response(new Uint8Array(await readFile(resolve('public', `.${path}`))), { headers: { 'Content-Type': 'application/json' } });
  });
  await assert.rejects(getCourseVocabLookupMap(), /Vocabulary unavailable/);
  fail = false;
  const recovered = await getCourseVocabLookupMap();
  assert.ok(recovered.get('老師')?.audio, 'same-tab retry restores the course recording lookup');
  assert.ok((await fetchVocabulary()).length > 4000);
  assert.deepEqual(await fetchVocabulary(99999), [], 'an absent book is still a legitimate empty result');
  assert.equal(requests.filter(path => path.endsWith('/book-2.json')).length, 2, 'failed pack is fetched again');
  assert.equal(requests.filter(path => path.endsWith('/book-1.json')).length, 1, 'successful packs remain cached');
});
