import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import type { PosBatchEntry } from './posBatches';

/**
 * `npx tsx scripts/dictionary/tagPos.ts --answers [--model name] [--only kind] [--batches a,b]` — no AI:
 * turns helpers' answer files (output/dictionary-pos/answers/<batch>.txt, format in HELPER_BRIEF) into
 * tags files, lists every answer file with a problem and prints what is still to do.
 *
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

/** What a helper (a subagent working from files) is told. */
export const HELPER_BRIEF = `You assign a word type to each English sense of Chinese dictionary entries, for Taiwanese learners of Mandarin (textbook: Modern Chinese 時代華語).

Input: output/dictionary-pos/agent/<batch>.txt. Each entry starts "#<n> <word> <pinyin>", then its numbered senses, then evidence lines when there are any ("book:" the textbook's own tag, "wiktionary:" Wiktionary's word type and glosses).
Output: output/dictionary-pos/answers/<batch>.txt, written with the Write tool. One line per entry, in order: "#<n>: TAG,TAG" with exactly one tag per sense, in sense order. No other text.

${TAG_RULES}
- English glosses worded as adjectives (medieval, man-made, lifelong, sparkling) are Vs; glosses worded as adverbs (overnight, in many ways) are Adv.
- Units of measure used after a number (公克 gram, 分鐘 minute, 公里 kilometre) are M.
- Name is for specific people, places, organisations, brands, dynasties and titles of works. Languages, weekdays and months, festivals, religions and currencies are N.
- Decide every sense on its own: one word often has senses of different types.
- Evidence can be wrong or incomplete; the sense text decides.

Scan batches (names-NNN, nouns-NNN) are different: every sense there already has the tag named in the file's first line. Write "#<n>: TAG,TAG" only for entries where at least one sense needs another tag (give all tags of that entry), and start the answer file with the line "checked". A file with only "checked" means every tag stands.

Read each batch file fully, think about each entry, then write its answer file before you open the next batch. Do not write scripts to produce answers, and do not touch any other file.`;

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

/** Tags per entry from a helper's answer file; in a scan batch (`base` given) unlisted entries keep theirs. */
export function parseAnswers(entries: ReadonlyArray<Pick<PosBatchEntry, 'id' | 'senses'>>, text: string, base?: Record<string, string[]>): { tags: Record<string, string[]>; problems: string[] } {
  const problems: string[] = [];
  const lines = new Map<number, string[]>();
  for (const line of text.split('\n').map((item) => item.trim()).filter(Boolean)) {
    const match = /^#?(\d+)\s*[:：]\s*([A-Za-z]+(?:\s*,\s*[A-Za-z]+)*)$/.exec(line);
    if (match) lines.set(Number(match[1]), match[2].split(',').map((tag) => tag.trim()));
    else if (line !== 'checked') problems.push(`unreadable line "${line.slice(0, 40)}"`);
  }
  if (base && !/^checked$/m.test(text)) problems.push('no "checked" line');
  const tags: Record<string, string[]> = {};
  entries.forEach((entry, index) => {
    const answer = lines.get(index + 1) ?? base?.[entry.id];
    if (!answer) { problems.push(`#${index + 1}: missing`); return; }
    if (answer.length !== entry.senses.length) problems.push(`#${index + 1}: ${answer.length} tags for ${entry.senses.length} senses`);
    const unknown = answer.filter((tag) => !(POS_TAGS as readonly string[]).includes(tag));
    if (unknown.length) problems.push(`#${index + 1}: unknown tags ${unknown.join(', ')}`);
    tags[entry.id] = answer;
  });
  for (const number of lines.keys()) if (number < 1 || number > entries.length) problems.push(`#${number}: no such entry`);
  return { tags, problems };
}

/** `--answers`: answer files → tags files, with a status line per kind. */
async function collectAnswers(model: string, wanted: (name: string) => boolean) {
  const all = (await readdir(resolve(OUT, 'batches'))).map((file) => file.replace(/\.json$/, '')).sort();
  const status = new Map<string, { total: number; done: number }>();
  const bad: string[] = [];
  for (const name of all) {
    const kind = name.replace(/-\d+$/, '');
    const rule = kind === 'names' || kind === 'nouns';
    const row = status.get(kind) ?? { total: 0, done: 0 };
    row.total += 1;
    status.set(kind, row);
    const tagFile = resolve(OUT, 'tags', `${name}.json`);
    const answerFile = resolve(OUT, 'answers', `${name}.txt`);
    const current = existsSync(tagFile) ? (JSON.parse(await readFile(tagFile, 'utf8')) as { model: string; tags: Record<string, string[]> }) : null;
    const settled = current && !(rule && current.model === 'rule');
    if (wanted(name) && existsSync(answerFile) && !settled) {
      const entries = JSON.parse(await readFile(resolve(OUT, 'batches', `${name}.json`), 'utf8')) as PosBatchEntry[];
      const { tags, problems } = parseAnswers(entries, await readFile(answerFile, 'utf8'), rule ? current?.tags : undefined);
      if (problems.length === 0) {
        await writeFile(tagFile, JSON.stringify({ model: rule ? `rule+${model}` : model, tags }), 'utf8');
        row.done += 1;
      } else bad.push(`${name}: ${problems.slice(0, 6).join('; ')}${problems.length > 6 ? ` (+${problems.length - 6} more)` : ''}`);
    } else if (settled) row.done += 1;
  }
  for (const [kind, row] of status) console.log(`${kind}: ${row.done}/${row.total} batches done`);
  if (bad.length) {
    console.log(`\n${bad.length} answer files need fixing (rewrite the whole file):`);
    for (const line of bad) console.log(`  ${line}`);
    process.exitCode = 1;
  }
}

async function main() {
  const { only, batches, limit, concurrency } = parseArgs();
  await mkdir(resolve(OUT, 'tags'), { recursive: true });
  if (process.argv.includes('--answers')) {
    const model = process.argv[process.argv.indexOf('--model') + 1];
    await collectAnswers(process.argv.includes('--model') && model ? model : 'claude', (name) => (batches ? batches.includes(name) : !only || name.startsWith(only)));
    return;
  }
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
