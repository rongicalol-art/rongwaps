import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildExampleIndex } from '../../src/features/flashcards/content/exampleIndex';
import { normalizeMnemonic } from '../../src/features/character-memory-hooks/hookText';
import { wordMnemonicKey } from '../../src/features/character-memory-hooks/wordHook';
import { prepareVocabulary } from '../../src/utils/vocabulary/vocabularyMapping';
import { cleanVocabText } from '../../src/utils/vocabulary/vocabCleaner';
import { packItemsToMnemonicMap, resolveMnemonicFromMap, type GenericContentManifest, type MemoryHookPack } from '../../src/utils/packValidators';
import { flashcardExtrasKey, flashcardExtrasShard, isValidFlashcardExtrasRow, type FlashcardExtrasRow } from '../../src/utils/vocabulary/flashcardExtrasPack';
import type { CourseExampleRecord } from '../../src/types/models';

const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) as T;
test('every generated lookup retains the complete live example ordering and memory hook in both scripts', () => {
  const manifests = ['vocabulary', 'course-examples', 'memory-hooks'].map((kind) => read<GenericContentManifest>(`public/data/${kind}/manifest.json`));
  const extrasManifest = read<GenericContentManifest & { sourceVersions: Record<string, string> }>('public/data/flashcard-extras/manifest.json');
  ['vocabulary', 'course-examples', 'memory-hooks'].forEach((kind, i) => assert.equal(extrasManifest.sourceVersions[kind], manifests[i].version, `Regenerate extras after ${kind} changes`));
  const vocab = prepareVocabulary(manifests[0].books!.flatMap((book) => read<{ items: unknown[] }>(`public${book.path}`).items));
  const records = manifests[1].books!.flatMap((book) => read<{ records: CourseExampleRecord[] }>(`public${book.path}`).records);
  const hooks = packItemsToMnemonicMap(manifests[2].books!.flatMap((book) => read<MemoryHookPack>(`public${book.path}`).items));
  const index = buildExampleIndex(records, vocab);
  const generated = new Map<string, FlashcardExtrasRow>();
  let largest = 0;
  for (const shard of extrasManifest.shards!) {
    largest = Math.max(largest, shard.bytes ?? 0);
    const pack = read<{ items: FlashcardExtrasRow[] }>(`public${shard.path}`);
    for (const row of pack.items) {
      assert.ok(isValidFlashcardExtrasRow(row));
      assert.equal(flashcardExtrasShard(row.key), shard.shard);
      assert.ok(!generated.has(row.key), 'duplicate lookup key');
      generated.set(row.key, row);
    }
  }
  for (const source of vocab) for (const front of new Set([source.front, cleanVocabText(source.traditional ?? ''), cleanVocabText(source.simplified ?? '')].filter(Boolean))) {
    const card = { ...source, front };
    const key = flashcardExtrasKey(card);
    const raw = resolveMnemonicFromMap(hooks, wordMnemonicKey(front));
    assert.deepEqual(generated.get(key), { key, examples: index.lookup(card), wordHook: raw ? normalizeMnemonic(raw) : null }, key);
  }
  for (const hookKey of hooks.keys()) {
    const front = hookKey.startsWith('word_') ? hookKey.slice(5) : Array.from(hookKey).length === 1 ? hookKey : null;
    if (!front) continue;
    const key = flashcardExtrasKey({ id: 'saved-word', front, bookId: 0, lessonId: 0, back: '' });
    const raw = resolveMnemonicFromMap(hooks, wordMnemonicKey(front));
    assert.deepEqual(generated.get(key), { key, examples: [], wordHook: raw ? normalizeMnemonic(raw) : null });
  }
  assert.equal(generated.size, extrasManifest.totalCount);
  const previousBytes = manifests.flatMap((manifest) => manifest.books ?? []).reduce((sum, book) => sum + (book.bytes ?? 0), 0);
  assert.ok(largest < previousBytes / 4, 'even the largest single shard must be much smaller than the old whole-corpus bootstrap');
});
