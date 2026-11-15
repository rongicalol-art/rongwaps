/**
 * Builds the teacher-style hook packs from the authored files:
 *
 *   content/memory-hooks/characters/book-N.json  →  public/data/hook-pieces/
 *   content/memory-hooks/words/book-N.json       →  public/data/word-hooks/
 *
 *   npm run hooks:packs            build and write
 *   npm run hooks:packs -- --check validate only, write nothing
 *
 * Every character entry is checked against the stroke data the app draws with
 * (hanzi-writer-data): stroke ranges must exist and each stroke belongs to
 * exactly one piece. A failing entry stops the build.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TeachHook, WordHook } from '../../src/types/hookPieces';
import { isTeachHook, isWordHook, teachHookProblems } from '../../src/utils/characters/hookPieces';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCE_DIR = resolve(ROOT, 'content/memory-hooks');
const STROKE_DIR = resolve(ROOT, 'node_modules/hanzi-writer-data');

const strokeCounts = new Map<string, number | undefined>();
export function strokeCount(char: string): number | undefined {
  if (!strokeCounts.has(char)) {
    const file = resolve(STROKE_DIR, `${char}.json`);
    strokeCounts.set(char, existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { strokes: string[] }).strokes.length : undefined);
  }
  return strokeCounts.get(char);
}

interface Authored<T> { items: T[]; problems: string[] }

/** Reads every book file of one kind, turning each authored entry into its pack item. */
function loadAuthored<T>(folder: string, key: (item: T) => string, toItem: (entry: Record<string, unknown>) => unknown, isItem: (item: unknown) => item is T, check: (item: T) => string[]): Authored<T> {
  const items: T[] = [];
  const problems: string[] = [];
  const seen = new Map<string, string>();
  const dir = resolve(SOURCE_DIR, folder);
  for (const file of readdirSync(dir).filter((name) => /^book-\d+\.json$/u.test(name)).sort()) {
    const source = JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as { schemaVersion?: number; entries?: Array<Record<string, unknown>> };
    if (source.schemaVersion !== 1 || !Array.isArray(source.entries)) {
      problems.push(`${folder}/${file}: expected { schemaVersion: 1, entries: [...] }`);
      continue;
    }
    source.entries.forEach((entry, index) => {
      const item = toItem(entry);
      if (!isItem(item)) {
        problems.push(`${folder}/${file} entry ${index}: wrong shape (${JSON.stringify(entry).slice(0, 60)}…)`);
        return;
      }
      const id = key(item);
      if (seen.has(id)) problems.push(`${folder}/${file}: ${id} is already in ${seen.get(id)}`);
      seen.set(id, file);
      for (const problem of check(item)) problems.push(`${folder}/${file} ${id}: ${problem}`);
      items.push(item);
    });
  }
  return { items, problems };
}

/** Authoring-only fields (lesson, the sound-free version, source tags) stay out of the pack. */
export function loadTeachHooks(): Authored<TeachHook> {
  return loadAuthored<TeachHook>('characters', (item) => item.char, ({ char, pinyin, gloss, pieces, hook, more }) => ({
    char, pinyin, gloss, pieces, hook,
    ...(Array.isArray(more) ? { more: (more as Array<{ text: string }>).map((line) => line.text) } : {}),
  }), isTeachHook, (item) => teachHookProblems(item, strokeCount));
}

export function loadWordHooks(): Authored<WordHook> {
  return loadAuthored<WordHook>('words', (item) => item.word, ({ word, gloss, parts, kind, lit, teach, note }) => ({
    word, gloss, parts, kind, ...(lit ? { lit } : {}), ...(teach ? { teach } : {}), ...(note ? { note } : {}),
  }), isWordHook, () => []);
}

export const HOOK_PACKS = [
  { dir: 'hook-pieces', file: 'pieces.json', load: loadTeachHooks as () => Authored<unknown>, key: (item: unknown) => (item as TeachHook).char },
  { dir: 'word-hooks', file: 'words.json', load: loadWordHooks as () => Authored<unknown>, key: (item: unknown) => (item as WordHook).word },
] as const;

/** The exact bytes of a pack file and its manifest, so a test can prove the committed pack matches the content. */
export function renderHookPack(pack: (typeof HOOK_PACKS)[number], items: unknown[]): { packText: string; manifestText: string } {
  const sorted = [...items].sort((a, b) => (pack.key(a) < pack.key(b) ? -1 : 1));
  const packText = `${JSON.stringify({ schemaVersion: 1, shard: 0, count: sorted.length, items: sorted })}\n`;
  const sha256 = createHash('sha256').update(packText).digest('hex');
  const manifest = {
    schemaVersion: 1,
    version: sha256.slice(0, 16),
    totalCount: sorted.length,
    shardCount: 1,
    shards: [{ shard: 0, count: sorted.length, path: `/data/${pack.dir}/${pack.file}`, sha256, bytes: Buffer.byteLength(packText) }],
  };
  return { packText, manifestText: `${JSON.stringify(manifest, null, 2)}\n` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes('--check');
  const loaded = HOOK_PACKS.map((pack) => ({ pack, ...pack.load() }));
  const problems = loaded.flatMap((entry) => entry.problems);
  if (problems.length > 0) {
    console.error(`${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exit(1);
  }
  for (const { pack, items } of loaded) {
    if (checkOnly) {
      console.log(`${pack.dir}: ${items.length} hooks pass.`);
      continue;
    }
    const { packText, manifestText } = renderHookPack(pack, items);
    const out = resolve(ROOT, 'public/data', pack.dir);
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, pack.file), packText);
    writeFileSync(resolve(out, 'manifest.json'), manifestText);
    console.log(`Wrote ${items.length} hooks to public/data/${pack.dir}/ (${Buffer.byteLength(packText)} bytes).`);
  }
}
