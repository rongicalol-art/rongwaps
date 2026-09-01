import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { DBDictionaryRow } from '../src/types/database';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const PACK_DIRECTORY = resolve(process.cwd(), 'public/data/dictionary');
const BATCH_SIZE = 500;
const SHARD_COUNT = 64;

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

interface DictionaryPack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: DBDictionaryRow[];
}

/**
 * Rebuilds the live `dictionary` table from the static shard packs
 * (public/data/dictionary/shard-*.json). The packs are the canonical
 * simplified dataset (id, traditional, simplified, pinyin_accented,
 * pinyin_flat, definitions); frequency/curriculum metadata does not exist
 * in the packs and is left at the table defaults.
 *
 * Idempotent: upserts by primary key and never deletes rows, so it is safe
 * to run again after a partial failure.
 */
async function main(): Promise<void> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
  );

  // 1. Load every shard and dedupe by id (each row is packed under both its
  //    traditional and simplified alias, so ids repeat across shards).
  const rowsByShard = new Map<number, DBDictionaryRow>();
  for (let shard = 0; shard < SHARD_COUNT; shard += 1) {
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const pack = JSON.parse(
      await readFile(resolve(PACK_DIRECTORY, filename), 'utf8'),
    ) as DictionaryPack;
    if (pack.shard !== shard || !Array.isArray(pack.items)) {
      throw new Error(`Invalid pack metadata in ${filename}`);
    }
    for (const item of pack.items) {
      if (!Number.isInteger(item.id)) throw new Error(`Non-integer id in ${filename}`);
      rowsByShard.set(item.id, item);
    }
  }
  const rows = [...rowsByShard.values()].sort((a, b) => a.id - b.id);
  console.log(`Loaded ${rows.length} dictionary rows from ${SHARD_COUNT} shards`);

  // 2. Upsert in batches (service role bypasses RLS; no RLS is enabled on
  //    `dictionary` anyway). english_tsvector is generated, created_at has a
  //    default — neither is sent.
  const columns: (keyof DBDictionaryRow)[] = [
    'id', 'traditional', 'simplified', 'pinyin_accented', 'pinyin_flat', 'definitions',
  ];
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE).map((row) => {
      const record: Record<string, unknown> = {};
      for (const column of columns) record[column] = row[column];
      return record;
    });

    const { error } = await supabase
      .from('dictionary')
      .upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Upsert batch failed at row ${offset}: ${error.message}`);

    const done = Math.min(offset + BATCH_SIZE, rows.length);
    console.log(`Upserted ${done} of ${rows.length} dictionary rows`);
  }

  // 3. Verify the table now holds every packed id (exact count, no rows).
  const { count, error: countError } = await supabase
    .from('dictionary')
    .select('id', { count: 'exact', head: true });
  if (countError) throw new Error(`Verification query failed: ${countError.message}`);
  if (count !== rows.length) {
    throw new Error(`Verification failed: dictionary table holds ${count} rows, expected ${rows.length}`);
  }

  console.log(`Verified: dictionary table now holds ${count} rows (${rows.length} expected)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
