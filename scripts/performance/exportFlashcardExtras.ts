import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExampleIndex } from '../../src/features/flashcards/content/exampleIndex';
import { normalizeMnemonic } from '../../src/features/character-memory-hooks/hookText';
import { wordMnemonicKey } from '../../src/features/character-memory-hooks/wordHook';
import { prepareVocabulary } from '../../src/utils/vocabulary/vocabularyMapping';
import { cleanVocabText } from '../../src/utils/vocabulary/vocabCleaner';
import { packItemsToMnemonicMap, resolveMnemonicFromMap, type GenericContentManifest, type MemoryHookPack } from '../../src/utils/packValidators';
import { FLASHCARD_EXTRAS_SHARDS, flashcardExtrasKey, flashcardExtrasShard, type FlashcardExtrasRow } from '../../src/utils/vocabulary/flashcardExtrasPack';
import type { CourseExampleRecord } from '../../src/types/models';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(root, path), 'utf8')) as T;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const manifests = await Promise.all(['vocabulary', 'course-examples', 'memory-hooks'].map((kind) => json<GenericContentManifest>(`public/data/${kind}/manifest.json`)));
const readParts = async <T>(manifest: GenericContentManifest) => Promise.all((manifest.books ?? []).map((book) => json<T>(`public${book.path}`)));
const [vocabPacks, examplePacks, hookPacks] = await Promise.all([
  readParts<{ items: unknown[] }>(manifests[0]),
  readParts<{ records: CourseExampleRecord[] }>(manifests[1]),
  readParts<MemoryHookPack>(manifests[2]),
]);
const vocab = prepareVocabulary(vocabPacks.flatMap((pack) => pack.items));
const index = buildExampleIndex(examplePacks.flatMap((pack) => pack.records), vocab);
const hooks = packItemsToMnemonicMap(hookPacks.flatMap((pack) => pack.items));
const shards: FlashcardExtrasRow[][] = Array.from({ length: FLASHCARD_EXTRAS_SHARDS }, () => []);
const keys = new Set<string>();
for (const source of vocab) {
  const fronts = new Set([source.front, cleanVocabText(source.traditional ?? ''), cleanVocabText(source.simplified ?? '')].filter(Boolean));
  for (const front of fronts) {
    const card = { ...source, front };
    const key = flashcardExtrasKey(card);
    if (keys.has(key)) continue;
    keys.add(key);
    const raw = resolveMnemonicFromMap(hooks, wordMnemonicKey(front));
    shards[flashcardExtrasShard(key)].push({ key, examples: index.lookup(card), wordHook: raw ? normalizeMnemonic(raw) : null });
  }
}
for (const hookKey of hooks.keys()) {
  const front = hookKey.startsWith('word_') ? hookKey.slice(5) : Array.from(hookKey).length === 1 ? hookKey : null;
  if (!front) continue;
  const key = JSON.stringify(['word', front]);
  if (keys.has(key)) continue;
  keys.add(key);
  const raw = resolveMnemonicFromMap(hooks, wordMnemonicKey(front));
  shards[flashcardExtrasShard(key)].push({ key, examples: [], wordHook: raw ? normalizeMnemonic(raw) : null });
}
const directory = resolve(root, 'public/data/flashcard-extras');
await mkdir(directory, { recursive: true });
const parts = await Promise.all(shards.map(async (items, shard) => {
  items.sort((a, b) => a.key.localeCompare(b.key));
  const text = JSON.stringify({ schemaVersion: 1, shard, count: items.length, items }) + '\n';
  const path = `/data/flashcard-extras/shard-${shard}.json`;
  const target = resolve(root, `public${path}`);
  const previous = await readFile(target, 'utf8').catch(() => '');
  if (previous !== text) await writeFile(target, text);
  return { shard, count: items.length, path, sha256: hash(text), bytes: Buffer.byteLength(text) };
}));
const sourceVersions = Object.fromEntries(['vocabulary', 'course-examples', 'memory-hooks'].map((kind, i) => [kind, manifests[i].version]));
const version = hash(JSON.stringify({ sourceVersions, shards: parts.map((part) => part.sha256) })).slice(0, 16);
const previous = await json<GenericContentManifest>('public/data/flashcard-extras/manifest.json').catch(() => null);
if (previous?.version !== version) await writeFile(resolve(directory, 'manifest.json'), JSON.stringify({ schemaVersion: 1, version, sourceVersions, totalCount: parts.reduce((sum, part) => sum + part.count, 0), shardCount: FLASHCARD_EXTRAS_SHARDS, shardStrategy: 'card-signature-hash-modulo', shards: parts }, null, 2) + '\n');
console.log(`Flashcard extras: ${parts.reduce((sum, part) => sum + part.count, 0)} exact lookups, ${parts.length} shards, average ${Math.round(parts.reduce((sum, part) => sum + part.bytes, 0) / parts.length)} bytes per shard.`);
