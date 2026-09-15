import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const ROOT = resolve(import.meta.dirname, '../..');
const DECISIONS_PATH = resolve(ROOT, 'output/vocab-qa/vocabulary-qa-decisions-v1.json');

type Field = 'meaning' | 'pinyin' | 'examples' | 'audio' | 'pos';

interface Decision {
  id: string;
  word: string;
  field: Field;
  current: string;
  proposed: string;
  code: string;
}

interface Update {
  id: string;
  word: string;
  fields: Partial<Record<Field, string>>;
  codes: string[];
}

function buildUpdates(): Update[] {
  const decisions = (JSON.parse(readFileSync(DECISIONS_PATH, 'utf8')) as { decisions: Decision[] }).decisions;
  const byId = new Map<string, Update>();
  for (const decision of decisions) {
    const update = byId.get(decision.id) ?? { id: decision.id, word: decision.word, fields: {}, codes: [] };
    update.fields[decision.field] = decision.proposed;
    update.codes.push(decision.code);
    byId.set(decision.id, update);
  }
  return [...byId.values()];
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const updates = buildUpdates();

  const byField: Record<string, number> = {};
  for (const update of updates) {
    for (const field of Object.keys(update.fields)) byField[field] = (byField[field] ?? 0) + 1;
  }
  console.log(JSON.stringify({ rows: updates.length, byField }, null, 2));

  if (!execute) {
    console.log('Dry run. Sample updates:');
    for (const update of updates.slice(0, 5)) {
      console.log(`  ${update.id} ${update.word} ${JSON.stringify(update.fields).slice(0, 160)}`);
    }
    return;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const queue = [...updates];
  const failures: Array<{ id: string; error: string }> = [];
  let completed = 0;

  const workers = Array.from({ length: 5 }, async () => {
    while (queue.length > 0) {
      const update = queue.shift()!;
      try {
        const { data, error } = await supabase
          .from('book_vocabulary')
          .update(update.fields)
          .eq('id', update.id)
          .select('id');
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error('row not found');
      } catch (error: unknown) {
        failures.push({ id: update.id, error: error instanceof Error ? error.message : String(error) });
      }
      completed += 1;
      if (completed % 50 === 0 || completed === updates.length) {
        console.log(`[${completed}/${updates.length}] applied`);
      }
      await delay(60);
    }
  });
  await Promise.all(workers);

  if (failures.length > 0) {
    console.log(JSON.stringify({ failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log('Verifying updated rows...');
  const mismatches: string[] = [];
  for (let index = 0; index < updates.length; index += 50) {
    const chunk = updates.slice(index, index + 50);
    const { data, error } = await supabase
      .from('book_vocabulary')
      .select('id,meaning,pinyin,examples,audio,pos')
      .in('id', chunk.map((update) => update.id));
    if (error) throw new Error(error.message);
    const byId = new Map((data ?? []).map((row) => [String((row as { id: string }).id), row as Record<string, unknown>]));
    for (const update of chunk) {
      const row = byId.get(update.id);
      if (!row) {
        mismatches.push(`${update.id} missing after update`);
        continue;
      }
      for (const [field, value] of Object.entries(update.fields)) {
        if (row[field] !== value) mismatches.push(`${update.id}.${field}`);
      }
    }
  }

  console.log(JSON.stringify({ applied: updates.length, mismatches }, null, 2));
  if (mismatches.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`FATAL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
