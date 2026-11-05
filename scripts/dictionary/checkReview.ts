import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkAnswer } from './tagPos';

/** `npx tsx scripts/dictionary/checkReview.ts` — dev-only: every review answer matches its input's ids and sense counts. */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');

async function main() {
  let bad = 0;
  let changed = 0;
  const names = (await readdir(resolve(OUT, 'review-input'))).filter((file) => file.endsWith('.json')).sort();
  for (const name of names) {
    const input = JSON.parse(await readFile(resolve(OUT, 'review-input', name), 'utf8')) as Array<{ id: string; senses: Array<{ tag: string }> }>;
    let answer: unknown;
    try { answer = JSON.parse(await readFile(resolve(OUT, 'review', name), 'utf8')); } catch { answer = null; }
    const problems = checkAnswer(input, answer);
    if (problems.length) { bad += 1; console.log(`${name}: ${problems.slice(0, 3).join('; ')}`); continue; }
    for (const item of answer as Array<{ id: string; tags: string[] }>) {
      const before = input.find((entry) => entry.id === item.id)!.senses.map((sense) => sense.tag);
      changed += item.tags.filter((tag, index) => tag !== before[index]).length;
    }
  }
  console.log(`Review answers: ${names.length - bad} valid, ${bad} invalid; ${changed} tags changed.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
