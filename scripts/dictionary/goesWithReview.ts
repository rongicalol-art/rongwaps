import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import type { GoesWithBatchEntry } from './goesWithCandidates';

/**
 * `npx tsx scripts/dictionary/goesWithReview.ts [--concurrency N]` — dev-only, resumable. Codex keeps
 * only the candidate pairs from goesWithCandidates.ts that are natural, common verb–object
 * combinations in Taiwan Mandarin (at most six per word, most useful first); every kept partner
 * must be one of the candidates. `--collect` then writes the reviewed source
 * content/dictionary/goesWith.json, which `npm run dictionary:usage:build` ships.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-usage');
const CONTENT = resolve(process.cwd(), 'content/dictionary/goesWith.json');
const MODEL = 'gpt-6.1-sol';
const MAX_KEPT = 6;

const PROMPT = `You build "goes with" lists for a learner dictionary used by Taiwanese university students learning Mandarin (traditional characters, Taiwan usage).
Each entry is a word with candidate partners that real sentences show next to it. For a verb, the candidates are nouns it took as its object; for a noun, verbs that took it as their object. Each candidate gives the phrase in citation form and up to two sentences.
Keep a candidate only when the phrase is a natural, common verb-object combination in Taiwan Mandarin that teaches a learner how the word is used (穿衣服, 喝咖啡, 借錢, 看醫生).
Drop it when the sentences show another relation (the noun is not this verb's object, a time or amount phrase, a modifier, a coincidence), when the phrase is unnatural, rare, mainland-only or a fixed expression with a different meaning, or when it says nothing useful.
Order kept partners most useful first and keep at most ${MAX_KEPT}.
Answer with JSON only: [{"word":"<word>","keep":["<partner>",…]},…], one object per entry, in input order, partners exactly as given (use [] when none is good).`;

interface Answer { word: string; keep: string[] }

function checkAnswer(entries: GoesWithBatchEntry[], answer: unknown): Answer[] | string {
  if (!Array.isArray(answer) || answer.length !== entries.length) return `expected ${entries.length} objects`;
  const out: Answer[] = [];
  for (const [index, entry] of entries.entries()) {
    const item = answer[index] as Partial<Answer> | undefined;
    if (!item || item.word !== entry.word || !Array.isArray(item.keep)) return `object ${index + 1} must be {"word":"${entry.word}","keep":[…]}`;
    const allowed = new Set(entry.candidates.map((candidate) => candidate.partner));
    const unknown = item.keep.filter((partner) => !allowed.has(partner));
    if (unknown.length) return `${entry.word}: ${unknown.join(', ')} ${unknown.length > 1 ? 'are' : 'is'} not a candidate`;
    out.push({ word: entry.word, keep: [...new Set(item.keep)].slice(0, MAX_KEPT) });
  }
  return out;
}

async function review(name: string, entries: GoesWithBatchEntry[]): Promise<void> {
  const target = resolve(OUT, 'goes-with-reviewed', name);
  if (existsSync(target)) return;
  const input = entries.map((entry) => ({ word: entry.word, kind: entry.kind, meaning: entry.meaning, candidates: entry.candidates.map((candidate) => ({ partner: candidate.partner, phrase: candidate.phrase, sentences: candidate.sentences.map((sentence) => `${sentence.chinese} — ${sentence.english}`) })) }));
  let feedback = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reply = await askCodex(OUT, `${name.replace('.json', '')}-${attempt}`, MODEL, 'medium', `${PROMPT}${feedback}\n\nEntries:\n${JSON.stringify(input)}`);
    const checked = checkAnswer(entries, replyArray(reply));
    if (typeof checked !== 'string') {
      await writeFile(target, `${JSON.stringify(checked, null, 1)}\n`, 'utf8');
      console.log(`[${name}] done`);
      return;
    }
    feedback = `\n\nYour last answer had a problem: ${checked}. Answer again with the exact format.`;
  }
  console.log(`[${name}] failed`);
}

async function collect(): Promise<void> {
  const entries: Record<string, Array<[string, string]>> = {};
  let pairs = 0;
  for (const name of (await readdir(resolve(OUT, 'goes-with-reviewed'))).filter((file) => file.endsWith('.json')).sort()) {
    const batch = JSON.parse(await readFile(resolve(OUT, 'goes-with-batches', name), 'utf8')) as GoesWithBatchEntry[];
    const answers = JSON.parse(await readFile(resolve(OUT, 'goes-with-reviewed', name), 'utf8')) as Answer[];
    for (const answer of answers) {
      const entry = batch.find((item) => item.word === answer.word);
      if (!entry || answer.keep.length === 0) continue;
      entries[answer.word] = answer.keep.map((partner) => [partner, entry.candidates.find((candidate) => candidate.partner === partner)!.phrase]);
      pairs += answer.keep.length;
    }
  }
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  await mkdir(resolve(CONTENT, '..'), { recursive: true });
  await writeFile(CONTENT, `${JSON.stringify({
    schemaVersion: 1,
    source: 'Verb-object pairs counted in the course-book sentences and Tatoeba (tatoeba.org, CC BY 2.0 FR), kept by a Codex review for natural, common Taiwan Mandarin; pairs that are book words are left out.',
    format: '"<word>": [[partner word, phrase], …], most useful first; the phrase shows the pair (穿衣服), the partner is the word it opens.',
    count: Object.keys(sorted).length,
    entries: sorted,
  }, null, 1)}\n`, 'utf8');
  console.log(`Goes with: ${Object.keys(sorted).length} words, ${pairs} pairs.`);
}

async function main() {
  if (process.argv.includes('--collect')) return collect();
  const concurrency = Number(process.argv[process.argv.indexOf('--concurrency') + 1]) || 4;
  await mkdir(resolve(OUT, 'goes-with-reviewed'), { recursive: true });
  const names = (await readdir(resolve(OUT, 'goes-with-batches'))).filter((file) => file.endsWith('.json')).sort();
  await eachLimited(names, concurrency, async (name) => {
    const entries = JSON.parse(await readFile(resolve(OUT, 'goes-with-batches', name), 'utf8')) as GoesWithBatchEntry[];
    await review(name, entries);
  });
  const done = (await readdir(resolve(OUT, 'goes-with-reviewed'))).filter((file) => file.endsWith('.json')).length;
  console.log(`Finished: ${done} of ${names.length} batches reviewed.`);
}

main().catch((error) => {
  console.error('Goes-with review failed:', error);
  process.exit(1);
});
