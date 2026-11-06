import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import { checkAnswer, TAG_RULES } from './tagPos';
import { readLevelWords } from './learnerData';
import type { PosBatchEntry } from './posBatches';
import type { PosFlag } from './checkPos';

/**
 * `npx tsx scripts/dictionary/reviewPos.ts [--concurrency N]` — dev-only, resumable.
 *
 * A second, stronger Codex pass over: every entry checkPos.ts flagged, a fixed random 5% of the
 * rest, and every common single character (TBCL levels 1–2). It returns the final tags with a note
 * for each change. Writes output/dictionary-pos/review/<batch>.json; collectPos.ts applies them.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
const REVIEW_DIR = resolve(OUT, 'review');
const BATCH_SIZE = 25;
const SAMPLE_RATE = 0.05;
const COMMON_LEVEL = 2;

const PROMPT = `You review word-type tags on Chinese dictionary entries for Taiwanese learners of Mandarin (textbook: Modern Chinese 時代華語).
Each entry lists its English senses and the current tag of each. "flags" (when present) say why an automatic check doubted a tag; a flag can be wrong.
Keep a tag unless it is clearly wrong. Return one tag per sense, in order.
${TAG_RULES}
Answer with JSON only: [{"id":"<id>","tags":[…],"note":"<only when you changed a tag: which sense and why, a few words>"}], one object per entry, in input order.`;

/** A fixed pseudo-random pick, so a rerun reviews the same sample. */
const sampled = (id: string) => {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619) >>> 0;
  return hash / 2 ** 32 < SAMPLE_RATE;
};

async function main() {
  const args = process.argv.slice(2);
  const concurrency = Number(args[args.indexOf('--concurrency') + 1] || 2);
  const flags = new Map((JSON.parse(await readFile(resolve(OUT, 'flags.json'), 'utf8')) as PosFlag[]).map((flag) => [flag.id, flag.reasons]));
  const levels = await readLevelWords();
  const picked: Array<PosBatchEntry & { tags: string[]; flags?: string[] }> = [];
  for (const batch of (await readdir(resolve(OUT, 'batches'))).filter((file) => file.endsWith('.json')).sort()) {
    const entries = JSON.parse(await readFile(resolve(OUT, 'batches', batch), 'utf8')) as PosBatchEntry[];
    const tagFile = resolve(OUT, 'tags', batch);
    if (!existsSync(tagFile)) continue;
    const tags = (JSON.parse(await readFile(tagFile, 'utf8')) as { tags: Record<string, string[]> }).tags;
    for (const entry of entries) {
      const word = entry.id.split('\u0000')[0];
      const common = Array.from(word).length === 1 && (levels.get(word) ?? 99) <= COMMON_LEVEL;
      if (!tags[entry.id] || !(flags.has(entry.id) || common || sampled(entry.id))) continue;
      picked.push({ ...entry, tags: tags[entry.id], ...(flags.has(entry.id) ? { flags: flags.get(entry.id) } : {}) });
    }
  }
  await mkdir(REVIEW_DIR, { recursive: true });
  await mkdir(resolve(OUT, 'review-input'), { recursive: true });
  const batches = Array.from({ length: Math.ceil(picked.length / BATCH_SIZE) }, (_, index) => ({ name: `review-${String(index).padStart(3, '0')}`, entries: picked.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE) }));
  // Every batch's input, so other reviewers can take a share (`--share i/n` keeps every n-th batch from i).
  for (const { name, entries } of batches) {
    const input = entries.map(({ id, pinyin, senses, book, wiktionary, tags, flags: reasons }) => ({ id, pinyin, senses: senses.map((sense, index) => ({ ...sense, tag: tags[index] })), book, wiktionary, flags: reasons }));
    await writeFile(resolve(OUT, 'review-input', `${name}.json`), JSON.stringify(input), 'utf8');
  }
  const shareArg = args.includes('--share') ? args[args.indexOf('--share') + 1].split('/').map(Number) : [0, 1];
  const todo = batches.filter((batch, index) => index % shareArg[1] === shareArg[0] && !existsSync(resolve(REVIEW_DIR, `${batch.name}.json`)));
  console.log(`Reviewing ${picked.length} readings (${flags.size} flagged) in ${batches.length} batches; ${todo.length} to do.`);
  let failed = 0;
  await eachLimited(todo, concurrency, async ({ name, entries }) => {
    const input = entries.map(({ id, pinyin, senses, book, wiktionary, tags, flags: reasons }) => ({ id, pinyin, senses: senses.map((sense, index) => ({ ...sense, tag: tags[index] })), book, wiktionary, flags: reasons }));
    let feedback = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const answer = replyArray(await askCodex(OUT, name, 'gpt-6.1-sol', 'medium', `${PROMPT}${feedback}\n\nEntries:\n${JSON.stringify(input)}`));
      const problems = checkAnswer(entries, answer);
      if (problems.length === 0) {
        const items = answer as Array<{ id: string; tags: string[]; note?: string }>;
        await writeFile(resolve(REVIEW_DIR, `${name}.json`), JSON.stringify(items.filter((item) => entries.some((entry) => entry.id === item.id))), 'utf8');
        console.log(`[${name}] reviewed`);
        return;
      }
      feedback = `\n\nYour previous answer had these problems; fix them: ${problems.slice(0, 12).join('; ')}`;
    }
    failed += 1;
    console.log(`[${name}] failed`);
  });
  console.log(`Review finished: ${todo.length - failed} done, ${failed} failed.`);
}

main().catch((error) => {
  console.error('Word-type review failed:', error);
  process.exit(1);
});
