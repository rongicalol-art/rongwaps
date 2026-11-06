import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../../shared/dictionaryShard';

/**
 * `npm run dictionary:examples:build` — builds public/data/dictionary-examples/ from the reviewed
 * content/dictionary/senseExamples.json, one shard per dictionary shard (same word hash), so a word
 * page loads only its word's small file. Deterministic: the same content gives the same files.
 */
const SOURCE = resolve(process.cwd(), 'content/dictionary/senseExamples.json');
const OUT = resolve(process.cwd(), 'public/data/dictionary-examples');
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

async function main() {
  const source = JSON.parse(await readFile(SOURCE, 'utf8')) as { schemaVersion: number; entries: Record<string, unknown[][]> };
  if (source.schemaVersion !== 1) throw new Error('senseExamples.json: unknown schemaVersion');
  const shards = Array.from({ length: DICTIONARY_SHARD_COUNT }, () => ({} as Record<string, unknown[][]>));
  for (const [key, rows] of Object.entries(source.entries)) {
    const word = key.slice(0, key.indexOf('|'));
    const valid = Array.isArray(rows) && rows.every((row) => Array.isArray(row) && row.length === 6 && row.slice(0, 4).every((cell) => typeof cell === 'string' && cell.length > 0));
    if (!word || !valid) throw new Error(`senseExamples.json: bad entry ${key}`);
    shards[getDictionaryShard(word)][key] = rows;
  }
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const manifestShards = [];
  for (const [shard, items] of shards.entries()) {
    const text = `${JSON.stringify({ schemaVersion: 1, shard, count: Object.keys(items).length, items })}\n`;
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    await writeFile(resolve(OUT, name), text, 'utf8');
    manifestShards.push({ shard, count: Object.keys(items).length, path: `/data/dictionary-examples/${name}`, sha256: hash(text), bytes: Buffer.byteLength(text) });
  }
  const totalCount = manifestShards.reduce((sum, item) => sum + item.count, 0);
  await writeFile(resolve(OUT, 'manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    version: hash(manifestShards.map((item) => item.sha256).join('')).slice(0, 16),
    totalCount,
    shardCount: DICTIONARY_SHARD_COUNT,
    shardStrategy: 'word-hash-modulo',
    shards: manifestShards,
  }, null, 2)}\n`, 'utf8');
  console.log(`Example pack: ${totalCount} readings in ${DICTIONARY_SHARD_COUNT} shards (${manifestShards.reduce((sum, item) => sum + item.bytes, 0)} bytes).`);
}

main().catch((error) => {
  console.error('Example pack failed:', error);
  process.exit(1);
});
