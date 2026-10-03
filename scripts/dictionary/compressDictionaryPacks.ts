import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT } from '../../src/utils/dictionaryShard';

const DIRECTORY = resolve(process.cwd(), 'public/data/dictionary');

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function run() {
  console.log('Compressing dictionary packs to compact schemaVersion 2...');
  let totalOrigBytes = 0;
  let totalNewBytes = 0;
  const shardsMeta: Array<{ shard: number; count: number; path: string; sha256: string; bytes: number }> = [];

  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard++) {
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const filePath = resolve(DIRECTORY, filename);
    const content = await readFile(filePath, 'utf8');
    totalOrigBytes += Buffer.byteLength(content);

    const data = JSON.parse(content);
    const compactItems = data.items.map((it: { id: number; simplified: string; traditional: string; pinyin_accented?: string; definitions: unknown }) => {
      const trad = it.traditional === it.simplified ? '' : it.traditional;
      return [
        it.id,
        it.simplified,
        trad,
        it.pinyin_accented || '',
        it.definitions,
      ];
    });

    const compactPack = {
      schemaVersion: 2,
      shard,
      count: compactItems.length,
      items: compactItems,
    };

    const newContent = `${JSON.stringify(compactPack)}\n`;
    totalNewBytes += Buffer.byteLength(newContent);
    await writeFile(filePath, newContent, 'utf8');

    shardsMeta.push({
      shard,
      count: compactItems.length,
      path: `/data/dictionary/${filename}`,
      sha256: hash(newContent),
      bytes: Buffer.byteLength(newContent),
    });
  }

  const manifestPath = resolve(DIRECTORY, 'manifest.json');
  const manifestRaw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  manifest.schemaVersion = 2;
  manifest.version = hash(shardsMeta.map((s) => s.sha256).join(':')).slice(0, 16);
  manifest.generatedAt = new Date().toISOString();
  manifest.shards = shardsMeta;

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Original total size: ${(totalOrigBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`New total size:      ${(totalNewBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Space saved:         ${((totalOrigBytes - totalNewBytes) / (1024 * 1024)).toFixed(2)} MB (${((1 - totalNewBytes / totalOrigBytes) * 100).toFixed(1)}%)`);
}

run().catch((err) => {
  console.error('Failed to compress dictionary packs:', err);
  process.exit(1);
});
