import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { brotliCompressSync, constants } from 'node:zlib';
import { buildStudyPacks } from '../../scripts/performance/studyPacks';
import { validStudyPack, decodeStudyPack, type StudyPack, type StudyPart } from '../../src/utils/vocabulary/studyPack';
import { lessonExtras, flashcardExtrasKey, flashcardExtrasShard, type FlashcardExtrasRow } from '../../src/utils/vocabulary/flashcardExtrasPack';
import { fetchCurriculumDeckData } from '../../src/services/activityDeckFetcher';
import { fetchPackedFlashcardExtras, fetchDictionaryRowsFromPacks } from '../../src/services/contentPacks';
import { fetchExamples } from '../../src/services/vocabularyService';
import { executeRemoteSearch } from '../../src/services/dictionaryService';

// Exercises the generated assets through the actual pack loader, with no SRS writes.
test('lesson bundles keep lesson examples (capped tail) and every definition while eliminating broad client downloads', async t => {
  const assets = await buildStudyPacks(process.cwd());
  const manifest = JSON.parse(assets.get('/data/study/manifest.json')!.toString()) as { totalCount: number; parts: StudyPart[] };
  assert.equal(manifest.totalCount, manifest.parts.reduce((sum, part) => sum + part.count, 0));
  for (const part of manifest.parts) {
    const pack = JSON.parse(assets.get(part.path)!.toString()) as StudyPack;
    assert.ok(validStudyPack(pack, part.key, part.count));
    assert.ok(assets.get(part.path + '.br')!.length < 250_000);
  }
  const parts = manifest.parts.filter(part => part.bookId === 1 && part.lessonId === 1 && part.partId === 1);
  assert.ok(parts.length);
  const paths: string[] = [];
  let dictionaryAvailable = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window'); });
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const path = String(input); paths.push(path);
    if (path.startsWith('/api/')) return dictionaryAvailable
      ? Response.json([{ id: 987654, traditional: '同學', definitions: ['successful global search'] }])
      : Response.json({}, { status: 503 });
    const bytes = assets.get(path); assert.ok(bytes, `unexpected broad download: ${path}`);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/json' } });
  });
  const { cards } = await fetchCurriculumDeckData(1, [1], {});
  assert.equal(cards.length, parts.reduce((sum, part) => sum + part.count, 0));
  const pack = JSON.parse(assets.get(parts[0].path)!.toString()) as StudyPack;
  const decoded = decodeStudyPack(pack);
  const card = cards.find(card => card.front === '同學') ?? cards[0];
  const key = flashcardExtrasKey(card);
  const shard = JSON.parse(await readFile(`public/data/flashcard-extras/shard-${String(flashcardExtrasShard(key)).padStart(3, '0')}.json`, 'utf8')) as { items: FlashcardExtrasRow[] };
  const row = shard.items.find(row => row.key === key)!;
  const expected = lessonExtras(row);
  assert.deepEqual(await fetchPackedFlashcardExtras(card), expected);
  assert.deepEqual(decoded.extras.get(key), expected);
  await fetchDictionaryRowsFromPacks(cards.flatMap(card => [card.front, card.traditional ?? '', card.simplified ?? '']));
  const before = paths.length;
  assert.ok((await fetchExamples(card.front)).length);
  assert.equal(paths.length, before, 'examples resolve without fetching other books');
  const partial: unknown[][] = [];
  await assert.rejects(executeRemoteSearch(card.front, rows => partial.push(rows)), /503/);
  assert.ok(partial[0]?.length, 'warm exact results publish before the global request fails');
  dictionaryAvailable = true;
  const requestsBeforeRetry = paths.length;
  const recovered = await executeRemoteSearch(card.front) as Array<{ id: number }>;
  assert.equal(recovered[0].id, 987654, 'retry must replace local rows with the full global response');
  assert.equal(paths.length, requestsBeforeRetry + 1, 'a failed search never caches its partial rows as a successful response');
  await executeRemoteSearch(card.front);
  assert.equal(paths.length, requestsBeforeRetry + 1, 'only the completed global response is cached');
  assert.ok(paths.filter(path => path.startsWith('/data/')).every(path => path.startsWith('/data/study/')));
  const oldBytes = brotliCompressSync(await readFile('public/data/search/dictionary-search-index.json'), { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }).length;
  const newBytes = parts.reduce((sum, part) => sum + assets.get(part.path + '.br')!.length, 0);
  assert.ok(newBytes < oldBytes / 20, `expected >20x less data than the search index alone: ${newBytes}/${oldBytes}`);
  console.log(JSON.stringify({ lessonCards: cards.length, studyBundleBrotliBytes: newBytes, previousSearchIndexBrotliBytes: oldBytes }));
});
