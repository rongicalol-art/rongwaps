import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RuntimeTreeNode } from '../../src/features/character-decomposition/runtimePack';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PHASE4_DIR = resolve(ROOT, 'output/decomposition-runtime/phase4-full-coverage-candidate');
const FIXTURE_PATH = resolve(ROOT, 'tests/fixtures/memory-hook-decomposition-trees.json');

interface HookRecord {
  character: string;
  hook: string | null;
  acceptance: string;
}

interface RuntimeRecord {
  t: RuntimeTreeNode;
}

function main(): void {
  const manifest = JSON.parse(readFileSync(resolve(PHASE4_DIR, 'manifest.json'), 'utf8')) as {
    version: string;
    recordShards: unknown[];
  };
  const shardCount = manifest.recordShards.length;
  const shardCache = new Map<number, Record<string, RuntimeRecord>>();
  const record = (glyph: string): RuntimeRecord | null => {
    const shard = (glyph.codePointAt(0) ?? 0) % shardCount;
    if (!shardCache.has(shard)) {
      shardCache.set(
        shard,
        JSON.parse(
          readFileSync(resolve(PHASE4_DIR, 'records', `shard-${String(shard).padStart(2, '0')}.json`), 'utf8'),
        ).records as Record<string, RuntimeRecord>,
      );
    }
    return shardCache.get(shard)?.[glyph] ?? null;
  };

  const hooks = (JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ).records as HookRecord[])
    .filter((hook) => hook.acceptance === 'clean' && hook.hook)
    .sort((left, right) => left.character.localeCompare(right.character, 'zh-Hant'));

  const nodeChildren = (node: RuntimeTreeNode): RuntimeTreeNode[] => (
    node[0] === 's' ? node[2] : node[0] === 'g' && node.length === 3 ? node[2] : []
  );
  const flat = (node: RuntimeTreeNode): RuntimeTreeNode[] => (
    nodeChildren(node).flatMap((child) => (child[0] === 's' ? flat(child) : [child]))
  );

  const trees: Record<string, RuntimeTreeNode> = {};
  const collectGlyph = (glyph: string): void => {
    if (trees[glyph]) return;
    const runtimeRecord = record(glyph);
    if (!runtimeRecord) return;
    trees[glyph] = runtimeRecord.t;
    for (const child of flat(runtimeRecord.t)) {
      if (child[0] === 'g') collectGlyph(child[1]);
    }
  };
  for (const hook of hooks) collectGlyph(hook.character);

  const sorted: Record<string, RuntimeTreeNode> = {};
  for (const glyph of Object.keys(trees).sort((left, right) => left.localeCompare(right, 'zh-Hant'))) {
    sorted[glyph] = trees[glyph];
  }

  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(
    FIXTURE_PATH,
    `${JSON.stringify({ runtimeVersion: manifest.version, trees: sorted }, null, 2)}\n`,
  );
  console.log(JSON.stringify({
    characters: hooks.length,
    trees: Object.keys(sorted).length,
    bytes: Buffer.byteLength(JSON.stringify({ runtimeVersion: manifest.version, trees: sorted })),
    runtimeVersion: manifest.version.slice(0, 12),
    fixture: FIXTURE_PATH,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
