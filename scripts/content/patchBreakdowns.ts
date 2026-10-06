import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `npm run breakdowns:patch` — applies owner fixes from
 * scripts/content/breakdown-overrides.json to the committed breakdown shards
 * (public/data/breakdowns/), then rewrites the manifest hashes and version.
 *
 * The shards have no upstream generator any more (their Supabase table was
 * removed 2026-10-03), so this is the only way to correct them. Overrides
 * replace whole fields (e.g. `pinyin`, `definition`); readings follow the
 * course books (Taiwan standard). Idempotent.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const DIR = resolve(ROOT, 'public/data/breakdowns');
const OVERRIDES = JSON.parse(readFileSync(resolve(import.meta.dirname, 'breakdown-overrides.json'), 'utf8')) as Record<string, Record<string, unknown>>;

interface Manifest {
  version: string;
  generatedAt: string;
  shards: Array<{ shard: number; path: string; sha256: string; bytes: number }>;
}

const manifestPath = resolve(DIR, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
const pending = new Set(Object.keys(OVERRIDES));
let changed = 0;

for (const entry of manifest.shards) {
  const path = resolve(ROOT, `public${entry.path}`);
  const pack = JSON.parse(readFileSync(path, 'utf8')) as { items: Array<Record<string, unknown> & { character: string }> };
  let dirty = false;
  for (const item of pack.items) {
    const override = OVERRIDES[item.character];
    if (!override) continue;
    pending.delete(item.character);
    for (const [field, value] of Object.entries(override)) {
      if (JSON.stringify(item[field]) === JSON.stringify(value)) continue;
      item[field] = value;
      dirty = true;
      changed++;
    }
  }
  if (!dirty) continue;
  const text = `${JSON.stringify(pack)}\n`;
  writeFileSync(path, text);
  entry.sha256 = createHash('sha256').update(text).digest('hex');
  entry.bytes = Buffer.byteLength(text);
}

if (pending.size > 0) throw new Error(`Overrides for characters not in any shard: ${[...pending].join(' ')}`);
if (changed > 0) {
  const digest = createHash('sha256').update(manifest.shards.map((shard) => shard.sha256).join('')).digest('hex');
  manifest.version = `v${digest.slice(0, 11)}`;
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`breakdowns:patch — ${changed} field(s) changed across ${Object.keys(OVERRIDES).length} override(s).`);
