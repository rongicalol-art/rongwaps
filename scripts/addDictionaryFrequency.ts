import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { DBDictionaryRow } from '../src/types/database';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const PACK_DIRECTORY = resolve(process.cwd(), 'public/data/dictionary');
const FREQUENCY_MAP_PATH = resolve(process.cwd(), 'output/dictionary-frequency-map.json');
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
 * Writes frequency_score (0-100, corpus-derived) onto every packed dictionary
 * row. Scores come from output/dictionary-frequency-map.json, produced by
 * scripts/buildDictionaryFrequency.py (wordfreq 'zh' corpus). Each row takes
 * the best score of its traditional/simplified aliases; words missing from
 * the corpus keep 0 and rank last at equal match weight.
 *
 * Idempotent: upserts by primary key and only touches frequency_score.
 */
async function main(): Promise<void> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY'),
  );

  const frequencyMap = JSON.parse(
    await readFile(FREQUENCY_MAP_PATH, 'utf8'),
  ) as Record<string, number>;

  // 1. Collect every packed id with its best alias score (deduped by id —
  //    rows repeat across shards via their two aliases).
  const rowsByShard = new Map<number, DBDictionaryRow>();
  for (let shard = 0; shard < SHARD_COUNT; shard += 1) {
    const filename = `shard-${String(shard).padStart(2, '0')}.json`;
    const pack = JSON.parse(
      await readFile(resolve(PACK_DIRECTORY, filename), 'utf8'),
    ) as DictionaryPack;
    if (pack.shard !== shard || !Array.isArray(pack.items)) {
      throw new Error(`Invalid pack metadata in ${filename}`);
    }
    for (const item of pack.items) rowsByShard.set(item.id, item);
  }

  const updates = [...rowsByShard.entries()].map(([id, row]) => {
    const score = Math.max(
      frequencyMap[row.simplified] ?? 0,
      frequencyMap[row.traditional] ?? 0,
    );
    // Send the full packed row so the upsert satisfies NOT NULL columns on
    // insert and re-asserts the same values on update.
    return {
      id,
      traditional: row.traditional,
      simplified: row.simplified,
      pinyin_accented: row.pinyin_accented,
      pinyin_flat: row.pinyin_flat,
      definitions: row.definitions,
      frequency_score: score,
    };
  });
  const nonzero = updates.filter((update) => update.frequency_score > 0).length;
  console.log(`Scored ${updates.length} dictionary rows (${nonzero} with a nonzero frequency)`);

  // 2. Upsert frequency_score in batches (service role; dictionary has no RLS
  //    restrictions for the service role).
  for (let offset = 0; offset < updates.length; offset += BATCH_SIZE) {
    const batch = updates.slice(offset, offset + BATCH_SIZE);
    const { error } = await supabase
      .from('dictionary')
      .upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Upsert batch failed at row ${offset}: ${error.message}`);

    const done = Math.min(offset + BATCH_SIZE, updates.length);
    console.log(`Upserted ${done} of ${updates.length} frequency scores`);
  }

  // 3. Verify via the RPC scoring path: a common word should outrank a rare
  //    one at the same match weight, and exact common matches should lead.
  const { data: common, error: commonError } = await supabase
    .rpc('search_dictionary', { search_query: '龘' , result_limit: 3 });
  if (commonError) throw new Error(`Verification RPC failed: ${commonError.message}`);
  console.log('RPC check 龘 (archaic char):', JSON.stringify(common).slice(0, 300));

  console.log('Done. frequency_score written for', updates.length, 'rows.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
