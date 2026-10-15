/**
 * Beta build step: trims the built `dist/data` packs to Book 1, Introduction + Lessons
 * 1..BETA_LAST_LESSON so locked lessons and Books 2-4 are never served at all.
 * Runs after `vite build`; `public/data/` is never touched. Dictionary, breakdowns,
 * search and memory hooks are left whole.
 *
 * Launch day: drop this step from the `build` script.
 * Usage: tsx scripts/build/trimBetaContent.ts [distDataDir]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BETA_LAST_LESSON } from '../../src/data/books';

const DATA = path.resolve(process.argv[2] ?? 'dist/data');

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const read = (rel: string): Json => JSON.parse(readFileSync(path.join(DATA, rel), 'utf8'));
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const keep = (book: number, lesson: number) => book === 1 && lesson <= BETA_LAST_LESSON;
const lessonOfId = (id: string) => {
  const m = /^B(\d+)L(\d+)/.exec(id);
  return m ? keep(Number(m[1]), Number(m[2])) : false;
};

/** Writes a pack file and returns its manifest fields. */
function write(rel: string, pack: Json) {
  const text = JSON.stringify(pack);
  writeFileSync(path.join(DATA, rel), text);
  return { sha256: sha(text), bytes: Buffer.byteLength(text) };
}

const versions: Record<string, string> = {};
const pagesInUse = new Set<number>();

function collectPages(value: unknown) {
  if (Array.isArray(value)) value.forEach(collectPages);
  else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === 'printedPages' && Array.isArray(v)) v.forEach((p) => typeof p === 'number' && pagesInUse.add(p));
      else if (key === 'printedPage' && typeof v === 'number') pagesInUse.add(v);
      else collectPages(v);
    }
  }
}

/** One book-1 pack with `list` (items or records) or a keyed `dict`; drops other books' files. */
function trimBookPack(name: string, itemKey: 'items' | 'records', isKept: (item: Json) => boolean) {
  const manifest = read(`${name}/manifest.json`);
  const books = manifest.books.filter((b: Json) => b.bookId === 1);
  for (const b of manifest.books) if (b.bookId !== 1) rmSync(path.join(DATA, `${name}/book-${b.bookId}.json`), { force: true });
  const pack = read(`${name}/book-1.json`);
  const items = pack[itemKey];
  pack[itemKey] = Array.isArray(items)
    ? items.filter(isKept)
    : Object.fromEntries(Object.entries(items).filter(([key, item]) => isKept({ ...(item as Json), key })));
  pack.count = Array.isArray(pack[itemKey]) ? pack[itemKey].length : Object.keys(pack[itemKey]).length;
  if (name !== 'vocabulary' && name !== 'dialogue-alignment') collectPages(pack[itemKey]);
  Object.assign(books[0], { count: pack.count }, write(`${name}/book-1.json`, pack));
  manifest.books = books;
  manifest.totalCount = pack.count;
  manifest.version = sha(books.map((b: Json) => b.sha256).join('')).slice(0, 16);
  writeFileSync(path.join(DATA, `${name}/manifest.json`), JSON.stringify(manifest, null, 2));
  versions[name] = manifest.version;
}

trimBookPack('vocabulary', 'items', (item) => lessonOfId(item.id));
trimBookPack('readings', 'items', (item) => keep(item.bookId, item.lessonId));
trimBookPack('grammar', 'items', (item) => keep(item.bookId, item.lessonId));
trimBookPack('course-examples', 'records', (item) => keep(item.bookId, item.lessonId));
trimBookPack('dialogue-alignment', 'items', (item) => {
  const m = /^B(\d+)L(\d+)/.exec(item.key);
  return Boolean(m && keep(Number(m[1]), Number(m[2])));
});

// Flashcard extras: sharded by card signature, so trim items and their source examples in place.
{
  const manifest = read('flashcard-extras/manifest.json');
  let total = 0;
  for (const shard of manifest.shards) {
    const rel = `flashcard-extras/shard-${shard.shard}.json`;
    const pack = read(rel);
    pack.items = pack.items
      .filter((item: Json) => lessonOfId(String(JSON.parse(item.key)[0])))
      .map((item: Json) => ({
        ...item,
        examples: (item.examples ?? []).filter((e: Json) => keep(e.sourceBookId, e.sourceLessonId)),
      }));
    pack.count = pack.items.length;
    total += pack.count;
    Object.assign(shard, { count: pack.count }, write(rel, pack));
  }
  manifest.totalCount = total;
  manifest.sourceVersions = { ...manifest.sourceVersions, vocabulary: versions.vocabulary, 'course-examples': versions['course-examples'] };
  manifest.version = sha(manifest.shards.map((s: Json) => s.sha256).join('')).slice(0, 16);
  writeFileSync(path.join(DATA, 'flashcard-extras/manifest.json'), JSON.stringify(manifest, null, 2));
}

// Textbook scans: only pages cited by the kept lessons.
{
  const dir = path.join(DATA, 'book-pages/modern-chinese-1');
  const manifest = read('book-pages/modern-chinese-1/manifest.json');
  manifest.pages = manifest.pages.filter((page: number) => pagesInUse.has(page));
  const kept = new Set(manifest.pages.map((p: number) => `page-${String(p).padStart(3, '0')}.webp`));
  for (const file of readdirSync(dir)) if (file.endsWith('.webp') && !kept.has(file)) rmSync(path.join(dir, file));
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}
for (const extra of ['book-2', 'book-3', 'book-4']) rmSync(path.join(DATA, `book-pages/modern-chinese-${extra.slice(-1)}`), { recursive: true, force: true });

console.log(`[beta-trim] kept Book 1 lessons 0-${BETA_LAST_LESSON}; ${pagesInUse.size} textbook pages referenced`);
