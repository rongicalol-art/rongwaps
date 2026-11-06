import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PosBatchEntry } from './posBatches';

/**
 * `npx tsx scripts/dictionary/checkPos.ts` — dev-only checks on Codex's word-type tags (no AI).
 * Flags an entry when a tag disagrees with Wiktionary's word type, with the book's own tag for the
 * sense it teaches, or with plain signals ("to …" is a verb, "measure word for …" is M).
 * Writes output/dictionary-pos/flags.json and prints a summary.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');

/** Coarse classes: only a different class is a disagreement (V and Vs are both verbs). */
const CLASS: Record<string, string> = {
  N: 'noun', Name: 'noun', V: 'verb', Vs: 'verb', Vaux: 'verb', Adv: 'adv', M: 'measure', Det: 'det',
  Num: 'num', Prep: 'prep', Conj: 'conj', Ptc: 'particle', Ph: 'phrase',
};
const WIKTIONARY_CLASS: Record<string, string> = {
  noun: 'noun', name: 'noun', pron: 'noun', verb: 'verb', adj: 'verb', adv: 'adv', classifier: 'measure',
  num: 'num', prep: 'prep', postp: 'prep', conj: 'conj', particle: 'particle', intj: 'particle', det: 'det',
  phrase: 'phrase', proverb: 'phrase',
};
/** The book's codes, by first part (Vst/Adv → Vst). */
const bookClass = (pos: string) => {
  const code = pos.split('/')[0]?.trim() ?? '';
  if (/^V/.test(code)) return 'verb';
  return CLASS[code] ?? (code === 'Ph' ? 'phrase' : undefined);
};
const parts = (text: string) => text.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[;,/]/).map((part) => part.replace(/^\s*(?:to|an?|the)\s+/, '').trim()).filter(Boolean);

export interface PosFlag { id: string; batch: string; reasons: string[] }

async function main() {
  const batchNames = (await readdir(resolve(OUT, 'batches'))).map((file) => file.replace(/\.json$/, '')).sort();
  const flags: PosFlag[] = [];
  let tagged = 0;
  let missing = 0;
  for (const batch of batchNames) {
    const entries = JSON.parse(await readFile(resolve(OUT, 'batches', `${batch}.json`), 'utf8')) as PosBatchEntry[];
    const file = resolve(OUT, 'tags', `${batch}.json`);
    const tags = existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as { tags: Record<string, string[]> }).tags : {};
    for (const entry of entries) {
      const entryTags = tags[entry.id];
      if (!entryTags) { missing += 1; continue; }
      tagged += 1;
      const reasons: string[] = [];
      const wikiClasses = new Set((entry.wiktionary ?? []).map((item) => WIKTIONARY_CLASS[item.pos]).filter(Boolean));
      entry.senses.forEach((sense, index) => {
        const tag = entryTags[index];
        const cls = CLASS[tag];
        if (/^to\s/i.test(sense.text) && !['verb', 'phrase'].includes(cls)) reasons.push(`"${sense.text}" starts with "to" but is ${tag}`);
        if (/^(?:measure word|classifier) for\b/i.test(sense.text) && tag !== 'M') reasons.push(`"${sense.text}" is a measure word but is ${tag}`);
        if (wikiClasses.size > 0 && !wikiClasses.has(cls) && !(cls === 'phrase' && wikiClasses.size > 0)) {
          reasons.push(`"${sense.text}" is ${tag}; Wiktionary has ${[...wikiClasses].join('/')}`);
        }
        for (const book of entry.book ?? []) {
          const expected = bookClass(book.pos);
          const shared = parts(sense.text).some((part) => parts(book.meaning).includes(part));
          if (expected && shared && expected !== cls && !book.pos.includes('/')) reasons.push(`"${sense.text}" is ${tag}; the book teaches it as ${book.pos}`);
        }
      });
      if (reasons.length) flags.push({ id: entry.id, batch, reasons });
    }
  }
  await writeFile(resolve(OUT, 'flags.json'), JSON.stringify(flags, null, 1), 'utf8');
  const byReason = new Map<string, number>();
  for (const flag of flags) for (const reason of flag.reasons) {
    const kind = reason.includes('Wiktionary') ? 'Wiktionary' : reason.includes('book') ? 'book' : reason.includes('measure') ? 'measure word' : 'to-verb';
    byReason.set(kind, (byReason.get(kind) ?? 0) + 1);
  }
  console.log(`Checked ${tagged} tagged readings (${missing} not tagged yet): ${flags.length} flagged (${Math.round((flags.length / Math.max(1, tagged)) * 100)}%).`);
  console.log(`  by reason: ${[...byReason].map(([kind, count]) => `${kind} ${count}`).join(', ')}`);
}

main().catch((error) => {
  console.error('Word-type checks failed:', error);
  process.exit(1);
});
