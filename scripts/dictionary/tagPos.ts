import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import type { PosBatchEntry } from './posBatches';

/**
 * `npx tsx scripts/dictionary/tagPos.ts [--only single|multi] [--batches a,b] [--limit N] [--concurrency N]`
 *
 * Dev-only, resumable: asks Codex for one word-type tag per dictionary sense of each batch from
 * posBatches.ts, checks the answer's shape and writes output/dictionary-pos/tags/<batch>.json.
 * A batch with a valid tags file is skipped, so the run can stop and restart. Codex runs read-only in
 * an empty folder; it sees only the batch text. Single characters use the stronger model.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos');
export const POS_TAGS = ['N', 'Name', 'V', 'Vs', 'Vaux', 'Adv', 'M', 'Det', 'Num', 'Prep', 'Conj', 'Ptc', 'Ph'] as const;
const MODELS = { single: ['gpt-6.1-sol', 'medium'], multi: ['gpt-6-luna', 'medium'] } as const;

/** The tag set and decision rules, shared by tagging and review. */
export const TAG_RULES = `Word types, from this set only:
N = noun (also pronouns, time and place words)
Name = proper noun (people, places, organisations, brands)
V = verb (actions; transitive, intransitive, separable)
Vs = stative verb: qualities and states that English says with adjectives (好 good, 漂亮 pretty, 累 tired)
Vaux = auxiliary verb before another verb (會, 能, 可以, 要, 應該)
Adv = adverb
M = measure word / classifier
Det = determiner or demonstrative (這, 那, 每, 哪)
Num = number
Prep = preposition or coverb (在, 跟, 對, 從, 把, 被)
Conj = conjunction
Ptc = particle or interjection (了, 的, 嗎, 吧, 啊, 喂)
Ph = set phrase, idiom, greeting or expression that is not a single word class (你好, 不客氣, 四字成語)
How to decide:
- Tag the sense as it is used in Mandarin with the given reading.
- "book" is the textbook's own tag for the sense it teaches; its codes map: Vs, Vst, Vs-attr, Vs-pred, Vs-sep → Vs; V, Vi, Vpt, Vp, V-sep, Vp-sep → V; others as written.
- "wiktionary" is Wiktionary's word type for this word and reading: adj → Vs, noun → N, verb → V, adv → Adv, classifier → M, name → Name, phrase/proverb → Ph, intj/particle → Ptc; "character" gives no type, use its glosses only as meaning hints.
- "to …" senses are V (or Vs for states like "to be tired", Vaux for "to be able to"); "measure word for …" is M; "(bound form) X" is tagged by what X is.
- Never change, merge, skip or add senses.`;

const RULES = `You assign a word type to each English sense of Chinese dictionary entries, for Taiwanese learners of Mandarin (textbook: Modern Chinese 時代華語).
For every entry give exactly one tag per listed sense, in the listed order.
${TAG_RULES}
Answer with JSON only, no prose: [{"id":"<id>","tags":["N","V",…]},…], one object per entry, in input order.`;

interface TagAnswer { id: string; tags: string[] }

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  return {
    only: value('--only') as 'single' | 'multi' | undefined,
    batches: value('--batches')?.split(',').filter(Boolean),
    limit: Number(value('--limit') ?? Number.POSITIVE_INFINITY),
    concurrency: Number(value('--concurrency') ?? 2),
  };
}

/** Problems with an answer, or [] when every entry has one known tag per sense. */
export function checkAnswer(entries: ReadonlyArray<Pick<PosBatchEntry, 'id' | 'senses'>>, answer: unknown): string[] {
  if (!Array.isArray(answer)) return ['answer is not a JSON array'];
  const byId = new Map((answer as TagAnswer[]).map((item) => [item?.id, item?.tags]));
  const problems: string[] = [];
  for (const entry of entries) {
    const tags = byId.get(entry.id);
    if (!Array.isArray(tags)) { problems.push(`${entry.id}: missing`); continue; }
    if (tags.length !== entry.senses.length) problems.push(`${entry.id}: ${tags.length} tags for ${entry.senses.length} senses`);
    const unknown = tags.filter((tag) => !(POS_TAGS as readonly string[]).includes(tag));
    if (unknown.length) problems.push(`${entry.id}: unknown tags ${unknown.join(', ')}`);
  }
  return problems;
}

async function tagBatch(name: string): Promise<'done' | 'failed'> {
  const entries = JSON.parse(await readFile(resolve(OUT, 'batches', `${name}.json`), 'utf8')) as PosBatchEntry[];
  const [model, effort] = MODELS[name.startsWith('single') ? 'single' : 'multi'];
  let feedback = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const answer = replyArray(await askCodex(OUT, name, model, effort, `${RULES}${feedback}\n\nEntries:\n${JSON.stringify(entries)}`));
    const problems = checkAnswer(entries, answer);
    if (problems.length === 0) {
      const tags = Object.fromEntries((answer as TagAnswer[]).filter((item) => entries.some((entry) => entry.id === item.id)).map((item) => [item.id, item.tags]));
      await writeFile(resolve(OUT, 'tags', `${name}.json`), JSON.stringify({ model, tags }), 'utf8');
      return 'done';
    }
    feedback = `\n\nYour previous answer had these problems; fix them: ${problems.slice(0, 12).join('; ')}`;
    console.log(`[${name}] attempt ${attempt}: ${problems.length} problems (${problems[0]})`);
  }
  return 'failed';
}

async function main() {
  const { only, batches, limit, concurrency } = parseArgs();
  await mkdir(resolve(OUT, 'tags'), { recursive: true });
  const all = (await readdir(resolve(OUT, 'batches'))).map((file) => file.replace(/\.json$/, '')).sort();
  const todo = all
    .filter((name) => (batches ? batches.includes(name) : !only || name.startsWith(only)))
    .filter((name) => !existsSync(resolve(OUT, 'tags', `${name}.json`)))
    .slice(0, limit);
  console.log(`Tagging ${todo.length} batches (${all.length} total), ${concurrency} at a time.`);
  const failed: string[] = [];
  await eachLimited(todo, concurrency, async (name) => {
    const started = Date.now();
    const result = await tagBatch(name);
    if (result === 'failed') failed.push(name);
    console.log(`[${name}] ${result} in ${Math.round((Date.now() - started) / 1000)} s`);
  });
  console.log(`Finished: ${todo.length - failed.length} done, ${failed.length} failed${failed.length ? `: ${failed.join(', ')}` : ''}.`);
}

if (process.argv[1]?.endsWith('tagPos.ts')) {
  main().catch((error) => {
    console.error('Word-type tagging failed:', error);
    process.exit(1);
  });
}
