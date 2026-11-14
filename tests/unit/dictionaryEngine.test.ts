import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildStudyPacks } from '../../scripts/performance/studyPacks';
import { createDictionaryEngine } from '../../src/services/dictionaryEngine';

test('the on-device dictionary answers from the content packs, loading each part only when first needed', async () => {
  for (const [path, bytes] of await buildStudyPacks(process.cwd())) {
    if (!path.endsWith('.json')) continue;
    const target = resolve(`.vite/study${path}`); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
  }
  const loaded: string[] = [];
  const engine = createDictionaryEngine(async <T>(path: string) => {
    loaded.push(path);
    const file = path.replace(/\?.*$/, '');
    const root = file.startsWith('/data/study/') || file === '/data/search/course-lookup.json' ? '.vite/study' : 'public';
    return JSON.parse(await readFile(resolve(root, `.${file}`), 'utf8')) as T;
  });

  // Tapping a word reads one small shard, by its content-addressed name; never the search index.
  const rows = await engine.lookup(['你好']);
  assert.ok(JSON.stringify(rows).includes('你好'));
  assert.deepEqual(loaded.map(path => path.replace(/shard-\d+\.json\?v=[a-f0-9]{16}$/, 'shard')), ['/data/dictionary/manifest.json', '/data/dictionary/shard']);
  assert.ok(JSON.stringify(await engine.course(['你好'])).includes('你好'));
  assert.ok((await engine.examples('同學', 3)).length);
  assert.ok(!loaded.includes('/data/search/dictionary-search-index.json'));

  const started = performance.now();
  const results = await engine.search('teacher', 30);
  const coldMs = performance.now() - started;
  assert.ok(results.some(row => row.simplified === '老师'));
  assert.ok(Buffer.byteLength(JSON.stringify(results)) < 30_000);
  const warm = performance.now();
  assert.equal(await engine.search('teacher', 30), results, 'a repeated search is answered from memory');
  assert.ok((await engine.search('老師', 5)).some(row => row.traditional === '老師' && row.match_type === 'exact'));
  const warmMs = performance.now() - warm;
  assert.equal(loaded.filter(path => path === '/data/search/dictionary-search-index.json').length, 1);

  const batches = Array.from({ length: 15 }, (_, i) => Array.from({ length: 30 }, (_, j) => String.fromCodePoint(0x4e00 + i * 30 + j)));
  assert.equal((await Promise.all(batches.map(batch => engine.lookup(batch)))).length, 15);
  console.log(JSON.stringify({ coldDictionaryMs: Math.round(coldMs), warmDictionaryMs: Math.round(warmMs) }));
});

test('a pack that fails to load is asked for again on the next request', async () => {
  let fail = true;
  const engine = createDictionaryEngine(async <T>(path: string) => {
    if (fail) throw new Error('offline');
    if (path.endsWith('manifest.json')) return { shards: [] } as T;
    return { schemaVersion: 2, items: [[7, '好', '', 'hǎo', ['good']]] } as T;
  });
  await assert.rejects(engine.lookup(['好']), /offline/);
  fail = false;
  assert.equal((await engine.lookup(['好']))['好'][0].id, 7);
});
