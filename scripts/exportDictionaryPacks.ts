import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { DBDictionaryRow } from '../src/types/database';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../src/utils/dictionaryShard';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BATCH_SIZE = 500;
const CONCURRENT_BATCHES = 4;
const SCHEMA_VERSION = 1;
const OUTPUT_DIRECTORY = resolve(process.cwd(), 'public/data/dictionary');
const DICTIONARY_COLUMNS = 'id,traditional,simplified,pinyin_accented,pinyin_flat,definitions';

interface DictionaryPack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: DBDictionaryRow[];
}

interface ManifestShard {
  shard: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function shardFilename(shard: number): string {
  return `shard-${String(shard).padStart(2, '0')}.json`;
}

// Enumerates every dictionary id directly from Supabase (paginated). The old
// export used public/dictionary_trie.json as the id source; that 13 MB startup
// trie was removed from the app.
async function readCoreDictionaryIds(): Promise<number[]> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('VITE_SUPABASE_ANON_KEY'),
  );

  const ids: number[] = [];
  const PAGE_SIZE = 1000;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('dictionary')
      .select('id')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Dictionary id export failed: ${error.message}`);

    const page = (data || []) as { id: number }[];
    ids.push(...page.map((row) => row.id));
    if (page.length < PAGE_SIZE) break;
  }

  if (ids.length === 0) {
    throw new Error('dictionary table returned no ids');
  }

  return [...new Set(ids)];
}

async function fetchCoreDictionary(ids: number[]): Promise<DBDictionaryRow[]> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('VITE_SUPABASE_ANON_KEY'),
  );
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    chunks.push(ids.slice(index, index + BATCH_SIZE));
  }

  const rows: DBDictionaryRow[] = [];
  for (let index = 0; index < chunks.length; index += CONCURRENT_BATCHES) {
    const group = chunks.slice(index, index + CONCURRENT_BATCHES);
    const groupRows = await Promise.all(group.map(async (chunk) => {
      const { data, error } = await supabase
        .from('dictionary')
        .select(DICTIONARY_COLUMNS)
        .in('id', chunk);
      if (error) throw new Error(`Dictionary export failed: ${error.message}`);
      return (data || []) as DBDictionaryRow[];
    }));

    rows.push(...groupRows.flat());
    console.log(`Fetched ${rows.length} of ${ids.length} core dictionary rows`);
  }

  return rows.sort((a, b) => a.id - b.id);
}

async function writePacks(rows: DBDictionaryRow[]): Promise<void> {
  const rowsByShard = Array.from(
    { length: DICTIONARY_SHARD_COUNT },
    () => new Map<number, DBDictionaryRow>(),
  );

  for (const row of rows) {
    for (const alias of new Set([row.traditional, row.simplified].filter(Boolean))) {
      rowsByShard[getDictionaryShard(alias)].set(row.id, row);
    }
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const shards: ManifestShard[] = [];
  for (let shard = 0; shard < DICTIONARY_SHARD_COUNT; shard += 1) {
    const items = [...rowsByShard[shard].values()].sort((a, b) => a.id - b.id);
    const pack: DictionaryPack = { schemaVersion: SCHEMA_VERSION, shard, count: items.length, items };
    const content = `${JSON.stringify(pack)}\n`;
    const filename = shardFilename(shard);

    await writeFile(resolve(OUTPUT_DIRECTORY, filename), content, 'utf8');
    shards.push({
      shard,
      count: items.length,
      path: `/data/dictionary/${filename}`,
      sha256: hash(content),
      bytes: Buffer.byteLength(content),
    });
  }

  const packedItemCount = shards.reduce((total, shard) => total + shard.count, 0);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    version: hash(shards.map((shard) => shard.sha256).join(':')).slice(0, 16),
    generatedAt: new Date().toISOString(),
    sourceCount: rows.length,
    packedItemCount,
    shardCount: DICTIONARY_SHARD_COUNT,
    shardStrategy: 'word-hash-modulo',
    shards,
  };

  await writeFile(
    resolve(OUTPUT_DIRECTORY, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function verifyPacks(sourceIds: number[]): Promise<void> {
  const manifest = JSON.parse(
    await readFile(resolve(OUTPUT_DIRECTORY, 'manifest.json'), 'utf8'),
  ) as { sourceCount: number; shardCount: number; shards: ManifestShard[] };
  const exportedIds = new Set<number>();

  if (manifest.sourceCount !== sourceIds.length || manifest.shardCount !== DICTIONARY_SHARD_COUNT) {
    throw new Error('Dictionary manifest count validation failed');
  }

  for (const manifestShard of manifest.shards) {
    const path = resolve(process.cwd(), 'public', manifestShard.path.replace(/^\//, ''));
    const content = await readFile(path, 'utf8');
    const pack = JSON.parse(content) as DictionaryPack;

    if (pack.shard !== manifestShard.shard || pack.count !== pack.items.length) {
      throw new Error(`Invalid metadata in dictionary shard ${manifestShard.shard}`);
    }
    if (hash(content) !== manifestShard.sha256) {
      throw new Error(`Hash mismatch in dictionary shard ${manifestShard.shard}`);
    }
    if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length) {
      throw new Error(`Duplicate row in dictionary shard ${manifestShard.shard}`);
    }

    for (const item of pack.items) {
      const aliases = [item.traditional, item.simplified];
      if (!aliases.some((alias) => getDictionaryShard(alias) === pack.shard)) {
        throw new Error(`Dictionary row ${item.id} is stored in the wrong shard`);
      }
      if (!Array.isArray(item.definitions) && item.definitions === null) {
        throw new Error(`Dictionary row ${item.id} has missing definitions`);
      }
      exportedIds.add(item.id);
    }
  }

  if (sourceIds.some((id) => !exportedIds.has(id))) {
    throw new Error('Exported dictionary packs do not cover every core dictionary ID');
  }

  console.log(`Verified ${exportedIds.size} core dictionary rows across ${DICTIONARY_SHARD_COUNT} shards`);
}

async function main(): Promise<void> {
  const ids = await readCoreDictionaryIds();
  const rows = await fetchCoreDictionary(ids);
  if (rows.length !== ids.length) {
    throw new Error(`Dictionary count mismatch: requested=${ids.length}, fetched=${rows.length}`);
  }
  await writePacks(rows);
  await verifyPacks(ids);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
