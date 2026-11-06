import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import type { ExampleBatchEntry } from './exampleCandidates';

/**
 * `npx tsx scripts/dictionary/exampleSenses.ts [--concurrency N]` — dev-only, resumable.
 * For each reading, Codex says which numbered meaning each candidate sentence shows (0: none,
 * or not a clear example). Writes output/dictionary-examples/senses/<batch>.json.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-examples');

const PROMPT = `You match example sentences to dictionary meanings for Taiwanese learners of Mandarin.
Each entry is one word with one reading: its numbered meanings (with word type) and a few sentences that contain the word with that reading.
For every sentence, give the number of the meaning the word has in that sentence. Give 0 when the sentence is not a clear, natural example of any listed meaning for a learner (for example: the word is only part of a longer word, the use is unusual, or the sentence is a fragment like "好。").
Answer with JSON only: [{"key":"<key>","picks":[{"s":<sentence s>,"n":<meaning number or 0>},…]},…], one object per entry, every sentence once, in input order.`;

interface Answer { key: string; picks: Array<{ s: number; n: number }> }

function check(entries: readonly ExampleBatchEntry[], answer: unknown): string[] {
  if (!Array.isArray(answer)) return ['answer is not a JSON array'];
  const byKey = new Map((answer as Answer[]).map((item) => [item?.key, item?.picks]));
  const problems: string[] = [];
  for (const entry of entries) {
    const picks = byKey.get(entry.key);
    if (!Array.isArray(picks)) { problems.push(`${entry.key}: missing`); continue; }
    for (const sentence of entry.sentences) {
      const pick = picks.find((item) => item?.s === sentence.s);
      if (!pick || !Number.isInteger(pick.n) || pick.n < 0 || pick.n > entry.senses.length) problems.push(`${entry.key}: sentence ${sentence.s} has no valid meaning number`);
    }
  }
  return problems;
}

async function main() {
  const args = process.argv.slice(2);
  const concurrency = Number(args[args.indexOf('--concurrency') + 1] || 4);
  await mkdir(resolve(OUT, 'senses'), { recursive: true });
  const names = (await readdir(resolve(OUT, 'batches'))).map((file) => file.replace(/\.json$/, '')).sort()
    .filter((name) => !existsSync(resolve(OUT, 'senses', `${name}.json`)));
  console.log(`Matching sentences to meanings: ${names.length} batches, ${concurrency} at a time.`);
  let failed = 0;
  await eachLimited(names, concurrency, async (name) => {
    const entries = JSON.parse(await readFile(resolve(OUT, 'batches', `${name}.json`), 'utf8')) as ExampleBatchEntry[];
    let feedback = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const answer = replyArray(await askCodex(OUT, name, 'gpt-6.1-sol', 'medium', `${PROMPT}${feedback}\n\nEntries:\n${JSON.stringify(entries)}`));
      const problems = check(entries, answer);
      if (problems.length === 0) {
        await writeFile(resolve(OUT, 'senses', `${name}.json`), JSON.stringify(answer), 'utf8');
        console.log(`[${name}] done`);
        return;
      }
      feedback = `\n\nYour previous answer had these problems; fix them: ${problems.slice(0, 12).join('; ')}`;
    }
    failed += 1;
    console.log(`[${name}] failed`);
  });
  console.log(`Finished: ${names.length - failed} done, ${failed} failed.`);
}

main().catch((error) => {
  console.error('Example matching failed:', error);
  process.exit(1);
});
