import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { DBCharacterBreakdown } from '../src/types/database';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const PAGE_SIZE = 1000;
const SCHEMA_VERSION = 1;
const SHARD_COUNT = 32;
const OUTPUT_DIRECTORY = resolve(process.cwd(), 'public/data/breakdowns');
const BREAKDOWN_COLUMNS = 'character,radical,pinyin,definition,decomposition,components_historical';

interface BreakdownPack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: DBCharacterBreakdown[];
}

interface ManifestShard {
  shard: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

interface UsedAsPack {
  schemaVersion: number;
  version: string;
  generatedAt: string;
  componentCount: number;
  entryCount: number;
  entries: Record<string, string[]>;
}

// CJK ideographs (ext A, basic, radicals supplement, compat) that can appear
// inside an IDS decomposition string (e.g. 忄 in "⿰忄兌").
const COMPONENT_PATTERN = /[\u3400-\u4DBF\u4E00-\u9FFF\u2E80-\u2EFF\uF900-\uFAFF]/g;

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getShard(character: string): number {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) throw new Error('Cannot shard an empty character');
  return codePoint % SHARD_COUNT;
}

function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function shardFilename(shard: number): string {
  return `shard-${String(shard).padStart(2, '0')}.json`;
}

async function fetchAllBreakdowns(): Promise<DBCharacterBreakdown[]> {
  const supabase = createClient(
    requireEnvironmentVariable('VITE_SUPABASE_URL'),
    requireEnvironmentVariable('VITE_SUPABASE_ANON_KEY'),
  );
  const rows: DBCharacterBreakdown[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('character_breakdowns_v2')
      .select(BREAKDOWN_COLUMNS)
      .order('character', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Breakdown export failed: ${error.message}`);

    const page = (data || []) as DBCharacterBreakdown[];
    rows.push(...page);
    console.log(`Fetched ${rows.length} character breakdowns`);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function writePacks(rows: DBCharacterBreakdown[]): Promise<void> {
  const rowsByShard = Array.from(
    { length: SHARD_COUNT },
    () => [] as DBCharacterBreakdown[],
  );

  for (const row of rows) rowsByShard[getShard(row.character)].push(row);

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const shards: ManifestShard[] = [];
  for (let shard = 0; shard < SHARD_COUNT; shard += 1) {
    const items = rowsByShard[shard];
    const pack: BreakdownPack = {
      schemaVersion: SCHEMA_VERSION,
      shard,
      count: items.length,
      items,
    };
    const content = `${JSON.stringify(pack)}\n`;
    const filename = shardFilename(shard);

    await writeFile(resolve(OUTPUT_DIRECTORY, filename), content, 'utf8');
    shards.push({
      shard,
      count: items.length,
      path: `/data/breakdowns/${filename}`,
      sha256: hash(content),
      bytes: Buffer.byteLength(content),
    });
  }

  const contentVersion = hash(shards.map((shard) => shard.sha256).join(':')).slice(0, 16);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    version: contentVersion,
    generatedAt: new Date().toISOString(),
    totalCount: rows.length,
    shardCount: SHARD_COUNT,
    shardStrategy: 'unicode-code-point-modulo',
    shards,
  };

  await writeFile(
    resolve(OUTPUT_DIRECTORY, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function verifyPacks(sourceRows: DBCharacterBreakdown[]): Promise<void> {
  const manifest = JSON.parse(
    await readFile(resolve(OUTPUT_DIRECTORY, 'manifest.json'), 'utf8'),
  ) as { totalCount: number; shardCount: number; shards: ManifestShard[] };
  const exportedCharacters: string[] = [];

  if (manifest.shardCount !== SHARD_COUNT || manifest.shards.length !== SHARD_COUNT) {
    throw new Error('Breakdown manifest has the wrong shard count');
  }

  for (const manifestShard of manifest.shards) {
    const packPath = resolve(process.cwd(), 'public', manifestShard.path.replace(/^\//, ''));
    const content = await readFile(packPath, 'utf8');
    const pack = JSON.parse(content) as BreakdownPack;

    if (pack.shard !== manifestShard.shard || pack.count !== pack.items.length) {
      throw new Error(`Invalid metadata in breakdown shard ${manifestShard.shard}`);
    }
    if (hash(content) !== manifestShard.sha256) {
      throw new Error(`Hash mismatch in breakdown shard ${manifestShard.shard}`);
    }
    if (pack.items.some((item) => getShard(item.character) !== pack.shard)) {
      throw new Error(`Character stored in the wrong breakdown shard ${pack.shard}`);
    }

    exportedCharacters.push(...pack.items.map((item) => item.character));
  }

  const sourceCharacters = sourceRows.map((row) => row.character).sort();
  exportedCharacters.sort();

  if (manifest.totalCount !== sourceCharacters.length || exportedCharacters.length !== sourceCharacters.length) {
    throw new Error(`Count mismatch: source=${sourceCharacters.length}, exported=${exportedCharacters.length}`);
  }
  if (new Set(exportedCharacters).size !== exportedCharacters.length) {
    throw new Error('Duplicate characters found in exported breakdown packs');
  }
  if (sourceCharacters.some((character, index) => character !== exportedCharacters[index])) {
    throw new Error('Exported breakdown characters do not exactly match Supabase');
  }

  console.log(`Verified ${exportedCharacters.length} breakdowns across ${SHARD_COUNT} shards`);
}

async function writeUsedAsIndex(rows: DBCharacterBreakdown[]): Promise<void> {
  // Inverted index: component -> characters whose decomposition contains it.
  // Mirrors the old server-side `decomposition LIKE '%component%'` semantics
  // so the breakdown view stops hitting the database for "used in" lists.
  const usedAs = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.decomposition) continue;
    const components = new Set(row.decomposition.match(COMPONENT_PATTERN) || []);
    for (const component of components) {
      const list = usedAs.get(component) || new Set<string>();
      list.add(row.character);
      usedAs.set(component, list);
    }
  }

  const entries: Record<string, string[]> = {};
  for (const [component, characters] of usedAs) {
    entries[component] = [...characters].sort();
  }

  const content = `${JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    version: hash(JSON.stringify(entries)).slice(0, 16),
    generatedAt: new Date().toISOString(),
    componentCount: Object.keys(entries).length,
    entryCount: Object.values(entries).reduce((total, list) => total + list.length, 0),
    entries,
  })}\n`;

  await writeFile(resolve(OUTPUT_DIRECTORY, 'used-as.json'), content, 'utf8');
  console.log(`Wrote used-as index: ${Object.keys(entries).length} components, ${Object.values(entries).reduce((total, list) => total + list.length, 0)} entries`);
}

async function verifyUsedAsIndex(sourceRows: DBCharacterBreakdown[]): Promise<void> {
  const usedAs = JSON.parse(
    await readFile(resolve(OUTPUT_DIRECTORY, 'used-as.json'), 'utf8'),
  ) as UsedAsPack;

  const sourceCharacters = new Set(sourceRows.map((row) => row.character));
  const entries = Object.values(usedAs.entries);

  if (usedAs.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('used-as index has the wrong schema version');
  }
  if (entries.some((list) => list.some((character) => !sourceCharacters.has(character)))) {
    throw new Error('used-as index references unknown characters');
  }
  if (usedAs.componentCount !== Object.keys(usedAs.entries).length) {
    throw new Error('used-as index component count mismatch');
  }
  if (usedAs.entryCount !== entries.reduce((total, list) => total + list.length, 0)) {
    throw new Error('used-as index entry count mismatch');
  }

  console.log(`Verified used-as index (${usedAs.componentCount} components)`);
}

async function main(): Promise<void> {
  const rows = await fetchAllBreakdowns();
  await writePacks(rows);
  await writeUsedAsIndex(rows);
  await verifyPacks(rows);
  await verifyUsedAsIndex(rows);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
