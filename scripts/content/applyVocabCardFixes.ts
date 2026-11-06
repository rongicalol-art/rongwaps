/**
 * applyVocabCardFixes.ts
 *
 * Applies reviewed word-card fixes from `content/vocabulary/book-N-card-fixes.json` to
 * `public/data/vocabulary/book-N.json` and updates `manifest.json`. The pack is the cards' only
 * source, so every change to a card's word, pinyin, part of speech or meaning goes through this
 * file with its reason; running it twice changes nothing.
 *
 *   npx tsx scripts/content/applyVocabCardFixes.ts --book 2 [--check]
 *
 * - fixes: { id, field, value, reason } for traditional | simplified | pinyin | pos | meaning.
 *   Simple glosses live in content/vocabulary/simpleDefinitions.json; examples in book-N-examples.json.
 * - newCards: { id, after, traditional, simplified, pinyin, pos, meaning, reason }, inserted after
 *   the card `after`. Ids are new: existing ids never change, since learners' progress hangs on them.
 *
 * Then run `npm run vocab:simple`, the card-example pinyin rebuild
 * (`rebuildGrammarWords.ts --book N --vocab-examples --write`) and `npm run vocab:examples` last: it is the
 * one that versions the manifest across all books.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const BOOK = Number(args[args.indexOf('--book') + 1]);
const CHECK = args.includes('--check');
if (!BOOK) throw new Error('Usage: applyVocabCardFixes.ts --book N [--check]');

type Field = 'traditional' | 'simplified' | 'pinyin' | 'pos' | 'meaning';
interface CardFix { id: string; field: Field; value: string; reason: string }
interface NewCard { id: string; after: string; traditional: string; simplified: string; pinyin: string; pos: string; meaning: string; reason: string }
interface FixFile { fixes: CardFix[]; newCards: NewCard[] }
interface VocabItem { id: string; traditional: string; simplified?: string; meaning?: string; pinyin?: string; pos?: string; [key: string]: unknown }
interface VocabPack { schemaVersion: number; bookId: number; count: number; items: VocabItem[] }
interface VocabManifest { version: string; generatedAt: string; totalCount: number; books: { bookId: number; count: number; sha256: string; bytes: number }[] }

const FIELDS = new Set<Field>(['traditional', 'simplified', 'pinyin', 'pos', 'meaning']);
const fixFile = JSON.parse(readFileSync(resolve(ROOT, `content/vocabulary/book-${BOOK}-card-fixes.json`), 'utf8')) as FixFile;
const packPath = resolve(ROOT, `public/data/vocabulary/book-${BOOK}.json`);
const raw = readFileSync(packPath, 'utf8');
const pack = JSON.parse(raw) as VocabPack;
const problems: string[] = [];
let changed = 0;

for (const card of fixFile.newCards) {
  if (pack.items.some((item) => item.id === card.id)) continue;
  const at = pack.items.findIndex((item) => item.id === card.after);
  if (at < 0) { problems.push(`${card.id}: no card ${card.after} to insert after`); continue; }
  const { traditional, simplified, pinyin, pos, meaning } = card;
  // A new card has no recording of its own yet (a recording file belongs to one card id): the app speaks it.
  pack.items.splice(at + 1, 0, { id: card.id, traditional, simplified, meaning, pinyin, pos, audio: '' });
  changed++;
}

for (const fix of fixFile.fixes) {
  const item = pack.items.find((entry) => entry.id === fix.id);
  if (!item) { problems.push(`${fix.id}: no such card`); continue; }
  if (!FIELDS.has(fix.field)) { problems.push(`${fix.id}: field ${fix.field} is not a card field`); continue; }
  if (item[fix.field] === fix.value) continue;
  item[fix.field] = fix.value;
  changed++;
}

pack.count = pack.items.length;
problems.forEach((problem) => console.log(`  not applied: ${problem}`));
console.log(`Book ${BOOK}: ${changed} card changes${CHECK ? ' needed (check only)' : ''}; ${pack.items.length} cards.`);
if (CHECK || problems.length) process.exit(problems.length || (CHECK && changed) ? 1 : 0);

const out = JSON.stringify(pack);
if (out !== raw.trimEnd()) {
  writeFileSync(packPath, out);
  const manifestPath = resolve(ROOT, 'public/data/vocabulary/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as VocabManifest;
  const meta = manifest.books.find((book) => book.bookId === BOOK);
  if (meta) {
    meta.count = pack.items.length;
    meta.sha256 = createHash('sha256').update(out).digest('hex');
    meta.bytes = Buffer.byteLength(out);
  }
  manifest.totalCount = manifest.books.reduce((sum, book) => sum + book.count, 0);
  manifest.version = createHash('sha256').update(manifest.books.map((book) => book.sha256).join('')).digest('hex').slice(0, 16);
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
