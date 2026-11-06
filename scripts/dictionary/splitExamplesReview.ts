import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { askCodex, eachLimited, replyArray } from './codexRun';
import { splitLine } from './buildUsagePack';
import { readBookSentences, readCourseCards, readDictionaryRows, type BookSentence } from './learnerData';

/**
 * `npx tsx scripts/dictionary/splitExamplesReview.ts` — dev-only, resumable. For each
 * two-character separable verb in the books (上課, 睡覺), finds book sentences where its two
 * characters stand apart, then Codex keeps only those that really split this verb (上英文課, 睡不著覺,
 * not 我下午有課 for 下課 or 那張畫是我爸爸畫的 for 畫畫): at most two, with different words in the gap.
 * Writes the reviewed source content/dictionary/splitExamples.json for `npm run dictionary:usage:build`.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-usage');
const CONTENT = resolve(process.cwd(), 'content/dictionary/splitExamples.json');
const MODEL = 'gpt-6.1-sol';
const CANDIDATES = 8;
const KEEP = 2;
const BATCH_SIZE = 20;

const PROMPT = `You choose examples for separable verbs (離合詞) in a learner dictionary for Taiwanese university students learning Mandarin.
Each entry is a two-character separable verb (like 上課, 睡覺) and some textbook sentences where its two characters appear with words between them.
Keep a sentence only when it really uses THIS verb split apart, the way a learner should see it: 上英文課, 睡不著覺, 受了傷, 幫我一個忙, 洗個澡.
Drop it when the two characters belong to other words (我下午有課 for 下課: 下 is in 下午; 期末考的筆試 for 考試), when the first character is a noun or another use (那張畫是我爸爸畫的 for 畫畫), or when it is not a clear example.
Also drop it when the second character is part of a different noun rather than the verb's own object: 上了有名的大學 is 上 + 大學, not a split of 上學; likewise 上舞臺 (舞臺), 過春節 (春節), 刷一下信用卡 (信用卡), 得到高分 (得到 + 高分), 開滿鮮花 (鮮花). A filler that only adds a number or measure word keeps the split (打八折 for 打折, 開過三次會).
Keep at most ${KEEP} per verb, the clearest first, with different words between the halves.
Answer with JSON only: [{"word":"<verb>","keep":[<sentence number>,…]},…], one object per entry, in input order (use [] when none is good).`;

interface Candidate { n: number; chinese: string; pinyin: string; english: string; audio: unknown }
interface Entry { word: string; meaning: string; candidates: Candidate[] }

async function main() {
  const { byWord } = await readDictionaryRows();
  const isWord = (text: string) => byWord.has(text);
  const cards = await readCourseCards();
  const sentences = await readBookSentences();
  const rank = (sentence: BookSentence) => (sentence.audio ? 0 : 1000) + Math.abs(Array.from(sentence.chinese).length - 12);
  const ranked = [...sentences].sort((a, b) => rank(a) - rank(b) || a.id - b.id);

  const entries: Entry[] = [];
  for (const [word, list] of [...cards].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (Array.from(word).length !== 2 || !list.some((card) => /sep/.test(card.pos ?? ''))) continue;
    const candidates: Candidate[] = [];
    for (const sentence of ranked) {
      const found = splitLine(word, sentence, isWord);
      if (!found || candidates.some((item) => item.chinese === found.line[0])) continue;
      // A two-line entry's recording covers both lines, so a single line goes without it.
      candidates.push({ n: candidates.length + 1, chinese: found.line[0], pinyin: found.line[1], english: found.line[2], audio: sentence.chinese.includes('\n') ? null : sentence.audio ?? null });
      if (candidates.length === CANDIDATES) break;
    }
    if (candidates.length > 0) entries.push({ word, meaning: list[0].back, candidates });
  }

  await mkdir(resolve(OUT, 'split-reviewed'), { recursive: true });
  const batches = Array.from({ length: Math.ceil(entries.length / BATCH_SIZE) }, (_, index) => entries.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE));
  await eachLimited(batches.map((batch, index) => ({ batch, name: `split-${String(index).padStart(2, '0')}` })), 3, async ({ batch, name }) => {
    const target = resolve(OUT, 'split-reviewed', `${name}.json`);
    if (existsSync(target)) return;
    const input = batch.map((entry) => ({ word: entry.word, meaning: entry.meaning, sentences: entry.candidates.map((item) => `${item.n}. ${item.chinese} — ${item.english}`) }));
    let feedback = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const answer = replyArray(await askCodex(OUT, `${name}-${attempt}`, MODEL, 'medium', `${PROMPT}${feedback}\n\nEntries:\n${JSON.stringify(input)}`));
      const valid = Array.isArray(answer) && answer.length === batch.length && answer.every((item, index) => {
        const reply = item as { word?: unknown; keep?: unknown };
        return reply.word === batch[index].word && Array.isArray(reply.keep)
          && reply.keep.every((n) => typeof n === 'number' && batch[index].candidates.some((candidate) => candidate.n === n));
      });
      if (valid) {
        await writeFile(target, `${JSON.stringify(answer, null, 1)}\n`, 'utf8');
        console.log(`[${name}] done`);
        return;
      }
      feedback = '\n\nYour last answer did not match the format or used a sentence number that is not listed. Answer again.';
    }
    console.log(`[${name}] failed`);
  });

  const reviewed: Record<string, Array<[string, string, string, unknown]>> = {};
  for (const [index, batch] of batches.entries()) {
    const target = resolve(OUT, 'split-reviewed', `split-${String(index).padStart(2, '0')}.json`);
    if (!existsSync(target)) continue;
    const answers = JSON.parse(await readFile(target, 'utf8')) as Array<{ word: string; keep: number[] }>;
    for (const [position, answer] of answers.entries()) {
      const rows = answer.keep.slice(0, KEEP).map((n) => batch[position].candidates.find((candidate) => candidate.n === n)!)
        .map((item) => [item.chinese, item.pinyin, item.english, item.audio ?? null] as [string, string, string, unknown]);
      if (rows.length > 0) reviewed[answer.word] = rows;
    }
  }
  await writeFile(CONTENT, `${JSON.stringify({
    schemaVersion: 1,
    source: 'Course-book sentences where a separable verb stands split apart, chosen by a Codex review from sentences whose two characters stand apart.',
    format: '"<verb>": [[chinese, pinyin, english, book recording or null], …], at most two.',
    count: Object.keys(reviewed).length,
    entries: reviewed,
  }, null, 1)}\n`, 'utf8');
  console.log(`Split examples: ${Object.keys(reviewed).length} of ${entries.length} verbs.`);
}

main().catch((error) => {
  console.error('Split review failed:', error);
  process.exit(1);
});
