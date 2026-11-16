import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import { checkAnswer, parseAnswers, TAG_RULES } from './tagPos';
import { readLevelWords } from './learnerData';
import type { PosBatchEntry } from './posBatches';
import type { PosFlag } from './checkPos';

/**
 * `npx tsx scripts/dictionary/reviewPos.ts [--concurrency N] [--sample 0.05]` — dev-only, resumable.
 *
 * A second, stronger pass over: every entry checkPos.ts flagged, a fixed random sample of the
 * rest, and every common single character (TBCL levels 1–2). It returns the final tags with a note
 * for each change. Writes output/dictionary-pos/review/<batch>.json; collectPos.ts applies them.
 *
 * By default Codex reviews. With helpers instead: `--prepare` writes review-agent/<batch>.txt and
 * REVIEWER.md (their brief); they answer in review-answers/<batch>.txt; `--answers` checks those
 * files and writes review/<batch>.json.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
const REVIEW_DIR = resolve(OUT, 'review');
const BATCH_SIZE = 25;
const sampleArg = process.argv.indexOf('--sample');
const SAMPLE_RATE = sampleArg >= 0 ? Number(process.argv[sampleArg + 1]) : 0.05;
const COMMON_LEVEL = 2;

const PROMPT = `You review word-type tags on Chinese dictionary entries for Taiwanese learners of Mandarin (textbook: Modern Chinese 時代華語).
Each entry lists its English senses and the current tag of each. "flags" (when present) say why an automatic check doubted a tag; a flag can be wrong.
Keep a tag unless it is clearly wrong. Return one tag per sense, in order.
${TAG_RULES}
Answer with JSON only: [{"id":"<id>","tags":[…],"note":"<only when you changed a tag: which sense and why, a few words>"}], one object per entry, in input order.`;

/** What a reviewing helper (a subagent working from files) is told. */
const REVIEWER_BRIEF = `You review word-type tags on Chinese dictionary entries for Taiwanese learners of Mandarin (textbook: Modern Chinese 時代華語).

Input: output/dictionary-pos/review-agent/<batch>.txt. Each entry starts "#<n> <word> <pinyin>", then its numbered senses with the current tag in brackets, then evidence lines ("book:", "wiktionary:") and "doubt:" lines saying why an automatic check doubted a tag. A doubt can be wrong.
Output: output/dictionary-pos/review-answers/<batch>.txt, written with the Write tool. First line "checked". Then one line only for each entry where a tag is clearly wrong: "#<n>: TAG,TAG | which sense and why, a few words" with all tags of that entry, one per sense, in order. Keep a tag unless it is clearly wrong.

${TAG_RULES}
- English glosses worded as adjectives are Vs; glosses worded as adverbs are Adv.
- Units of measure used after a number (公克 gram, 分鐘 minute) are M.
- Name is for specific people, places, organisations, brands, dynasties and titles of works. Languages, weekdays and months, festivals, religions and currencies are N.
- Four-character idioms (成語) and other fixed expressions are Ph, even when they work like a verb or an adverb in a sentence. An ordinary four-character compound noun or verb is not an idiom.

Read each batch fully, think about each entry, then write its answer file before you open the next batch. Do not write scripts to produce answers, and do not touch any other file.`;

const short = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
type Picked = PosBatchEntry & { tags: string[]; flags?: string[] };
const reviewView = (entries: readonly Picked[]) => `${entries.map((entry, index) => [
  `#${index + 1} ${entry.word} ${entry.pinyin}`,
  ...entry.senses.map((sense, senseIndex) => `  ${senseIndex + 1}. [${entry.tags[senseIndex]}] ${sense.text}`),
  ...(entry.book ?? []).map((book) => `  book: ${book.pos || '?'} — ${short(book.meaning, 80)}`),
  ...(entry.wiktionary ?? []).map((item) => `  wiktionary: ${item.pos} — ${short(item.glosses.slice(0, 4).join(' | '), 160)}`),
  ...(entry.flags ?? []).map((reason) => `  doubt: ${short(reason, 160)}`),
].join('\n')).join('\n')}\n`;

/** `--answers`: helpers' review files → review/<batch>.json. */
async function collectAnswers(batches: ReadonlyArray<{ name: string; entries: Picked[] }>) {
  let done = 0;
  let changed = 0;
  const bad: string[] = [];
  for (const { name, entries } of batches) {
    const out = resolve(REVIEW_DIR, `${name}.json`);
    const answerFile = resolve(OUT, 'review-answers', `${name}.txt`);
    if (existsSync(out)) { done += 1; continue; }
    if (!existsSync(answerFile)) continue;
    const { tags, notes, problems } = parseAnswers(entries, await readFile(answerFile, 'utf8'), Object.fromEntries(entries.map((entry) => [entry.id, entry.tags])));
    if (problems.length) { bad.push(`${name}: ${problems.slice(0, 6).join('; ')}`); continue; }
    const items = entries.map((entry) => ({ id: entry.id, tags: tags[entry.id], ...(notes[entry.id] ? { note: notes[entry.id] } : {}) }));
    changed += items.filter((item, index) => item.tags.join() !== entries[index].tags.join()).length;
    await writeFile(out, JSON.stringify(items), 'utf8');
    done += 1;
  }
  console.log(`review: ${done}/${batches.length} batches done (${changed} entries changed in this run)`);
  if (bad.length) {
    console.log(`\n${bad.length} answer files need fixing (rewrite the whole file):`);
    for (const line of bad) console.log(`  ${line}`);
    process.exitCode = 1;
  }
}

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
  const picked: Picked[] = [];
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
  if (args.includes('--prepare')) {
    for (const dir of ['review-agent', 'review-answers']) await mkdir(resolve(OUT, dir), { recursive: true });
    for (const { name, entries } of batches) await writeFile(resolve(OUT, 'review-agent', `${name}.txt`), reviewView(entries), 'utf8');
    await writeFile(resolve(OUT, 'REVIEWER.md'), `${REVIEWER_BRIEF}\n`, 'utf8');
    console.log(`Review prepared: ${picked.length} readings (${picked.filter((entry) => entry.flags).length} flagged) in ${batches.length} batches.`);
    return;
  }
  if (args.includes('--answers')) { await collectAnswers(batches); return; }
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
