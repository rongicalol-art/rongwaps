import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PosEntryRecord } from './posBatches';
import { posTagsKey } from '../../shared/dictionarySearch';
import { readingKey } from '../../src/utils/vocabulary/wordEntry';
import { readDictionaryRows } from './learnerData';

/**
 * `npx tsx scripts/dictionary/collectPos.ts` — dev-only. Merges Codex's word-type tags with the
 * review's corrections into content/dictionary/posTags.json, the reviewed source that
 * `npm run dictionary:pos:build` ships. Lists every review change in
 * output/dictionary-pos/review-changes.json for a human read.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
const CONTENT = resolve(process.cwd(), 'content/dictionary/posTags.json');

async function readTagFiles(dir: string): Promise<Map<string, string[]>> {
  const tags = new Map<string, string[]>();
  if (!existsSync(dir)) return tags;
  for (const file of (await readdir(dir)).filter((name) => name.endsWith('.json'))) {
    const data = JSON.parse(await readFile(resolve(dir, file), 'utf8')) as { tags: Record<string, string[]> } | Array<{ id: string; tags: string[] }>;
    if (Array.isArray(data)) for (const item of data) tags.set(item.id, item.tags);
    else for (const [id, list] of Object.entries(data.tags)) tags.set(id, list);
  }
  return tags;
}

async function main() {
  const records = JSON.parse(await readFile(resolve(OUT, 'entries.json'), 'utf8')) as PosEntryRecord[];
  const { byWord } = await readDictionaryRows();
  const tagged = await readTagFiles(resolve(OUT, 'tags'));
  const reviewed = await readTagFiles(resolve(OUT, 'review'));
  const notes = new Map<string, string>();
  if (existsSync(resolve(OUT, 'review'))) {
    for (const file of (await readdir(resolve(OUT, 'review'))).filter((name) => name.endsWith('.json'))) {
      for (const item of JSON.parse(await readFile(resolve(OUT, 'review', file), 'utf8')) as Array<{ id: string; note?: string }>) {
        if (item.note) notes.set(item.id, item.note);
      }
    }
  }

  const entries: Record<string, string> = {};
  const changes: Array<{ word: string; key: string; sense: string; from: string; to: string; note?: string }> = [];
  let missing = 0;
  for (const record of records) {
    const base = tagged.get(record.id);
    if (!base) { missing += 1; continue; }
    const final = reviewed.get(record.id) ?? base;
    // Tags cover the non-pointer senses in order; pointer senses get an empty tag.
    const full: string[] = [];
    let next = 0;
    record.senses.forEach((sense, index) => {
      if (record.pointers.includes(index)) { full.push(''); return; }
      const tag = final[next];
      if (tag !== base[next]) changes.push({ word: record.word, key: record.key, sense, from: base[next], to: tag, ...(notes.has(record.id) ? { note: notes.get(record.id) } : {}) });
      full.push(tag);
      next += 1;
    });
    // One key per spelling of the reading's pinyin, so every row of it finds its tags.
    const pinyins = new Set((byWord.get(record.word) ?? []).filter((row) => readingKey(row.pinyin_accented) === record.key).map((row) => row.pinyin_accented));
    for (const pinyin of pinyins) entries[posTagsKey(record.word, pinyin)] = `${record.checksum}|${full.join(',')}`;
  }

  await mkdir(resolve(CONTENT, '..'), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  await writeFile(CONTENT, `${JSON.stringify({
    schemaVersion: 1,
    source: 'Word types for CC-CEDICT senses (CC BY-SA 4.0): tagged with Codex, checked against English Wiktionary via kaikki.org (CC BY-SA 4.0) and the course word lists, then reviewed.',
    format: '"<word>|<reading key>": "<sense checksum>|<one tag per sense, empty for pointer senses>"',
    count: Object.keys(sorted).length,
    entries: sorted,
  }, null, 1)}\n`, 'utf8');
  await writeFile(resolve(OUT, 'review-changes.json'), JSON.stringify(changes, null, 1), 'utf8');
  console.log(`Word types: ${Object.keys(sorted).length} readings written (${missing} not tagged), ${changes.length} senses changed by review.`);
}

main().catch((error) => {
  console.error('Collecting word types failed:', error);
  process.exit(1);
});
