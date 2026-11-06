import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../../shared/dictionaryShard';
import type { WordUsage } from '../../src/utils/packValidators';
import { readDictionaryRows, type BookSentence } from './learnerData';

/**
 * `npm run dictionary:usage:build` — builds public/data/dictionary-usage/: how to use a word, for
 * the word page. Deterministic; one shard per dictionary shard (same word hash).
 * - Grammar (`g`): the grammar lessons whose point is this word, read from the grammar packs:
 *   a point's keys are the dictionary words in its title (before "：", optional "（…）" parts and
 *   grammar labels like 時間 or 疑問詞 removed). With the book's focus terms (Books 1 and 3), a key
 *   must also be one of them; a glue word (了, 都, 的…) needs its own focus term, or in Book 2 must
 *   lead the title or be listed on its own (很／不).
 * - Splits (`s`): the reviewed book sentences where a separable verb stands split apart
 *   (content/dictionary/splitExamples.json, from splitExamplesReview.ts).
 * - Goes with (`w`): the reviewed verb-object pairs in content/dictionary/goesWith.json.
 */
const OUT = resolve(process.cwd(), 'public/data/dictionary-usage');
const GRAMMAR = resolve(process.cwd(), 'public/data/grammar');
const GOES_WITH = resolve(process.cwd(), 'content/dictionary/goesWith.json');
const SPLITS = resolve(process.cwd(), 'content/dictionary/splitExamples.json');
const HAN = /[㐀-鿿]+/g;
/** Grammar labels inside titles (主語 + 動詞 + 受詞, 時間+才+V): never keys. */
const META = /疑問詞|反問句|否定句|重疊|語法|例子|時間|動詞|名詞|主語|受詞|量詞|補語|狀態|介詞|客氣|數字|描述|地方|動作|情況|話題|方位詞|起點|終點|方向|肯定|句末|語氣詞/;
const META_ALL = new RegExp(META.source, 'g');
/** Words that join most patterns: a point's key only when the point is about them. */
const GLUE = new Set(['了', '不', '沒', '有', '的', '得', '是', '在', '都', '也', '一']);
const SPLITS_PER_WORD = 2;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');

interface GrammarPage { id: string; bookId: number; lessonId: number; titleTraditional: string; titleSimplified?: string; titleEnglish: string; focusTerms?: string[] }

/** The keys of one grammar point (see the file comment). `isWord` says whether the dictionary lists a text. */
export function grammarKeys(title: string, focusTerms: readonly string[] | undefined, isWord: (text: string) => boolean): string[] {
  const rawHead = title.split(/[：:]/)[0].replace(/（[^）]*）|\([^)]*\)/g, ' ');
  const runs = [...rawHead.replace(META_ALL, ' ').matchAll(HAN)].map((match) => match[0]);
  // A run that is a word plus one glue character (的時候 → 時候, 怎麼不 → 怎麼).
  const wordIn = (run: string): string | null => {
    if (isWord(run)) return run;
    const chars = Array.from(run);
    if (chars.length < 3) return null;
    if (GLUE.has(chars[0]) && isWord(chars.slice(1).join(''))) return chars.slice(1).join('');
    if (GLUE.has(chars[chars.length - 1]) && isWord(chars.slice(0, -1).join(''))) return chars.slice(0, -1).join('');
    return null;
  };
  if (focusTerms?.length) {
    const focusRuns = focusTerms.flatMap((term) => [...term.matchAll(HAN)].map((match) => match[0]));
    const inner = runs.map(wordIn).filter((word): word is string => Boolean(word));
    return [...new Set([...focusRuns, ...runs, ...inner].filter((term) => isWord(term)
      && runs.some((run) => run.includes(term))
      && focusRuns.some((focus) => focus.includes(term) || term.includes(focus))
      && (!GLUE.has(term) || focusTerms.includes(term))))];
  }
  const keys = [...new Set(runs.map(wordIn).filter((word): word is string => Boolean(word)))];
  const lead = [...rawHead.matchAll(HAN)].map((match) => match[0]).find((run) => !META.test(run)) ?? '';
  const listed = (key: string) => rawHead.split(/[／/、]/).some((segment) => segment.replace(/\s+/g, '') === key);
  return keys.filter((key) => !GLUE.has(key) || lead.startsWith(key) || listed(key));
}

/** A split example longer than this reads as a passage, not an example. */
const MAX_SPLIT_LENGTH = 30;

/**
 * The line of a book sentence where `word`'s halves stand apart: the line, its pinyin and English
 * lines, and what stands between the halves (書法 in 上書法課); null if none.
 */
export function splitLine(word: string, sentence: Pick<BookSentence, 'chinese' | 'pinyin' | 'english'>, isWord: (text: string) => boolean): { line: [string, string, string]; between: string } | null {
  const [first, second] = Array.from(word);
  const zh = sentence.chinese.split('\n');
  const py = sentence.pinyin.split('\n');
  const en = sentence.english.split('\n');
  if (zh.length !== py.length || zh.length !== en.length) return null;
  for (const [index, line] of zh.entries()) {
    const chars = Array.from(line.trim());
    if (chars.length > MAX_SPLIT_LENGTH) continue;
    for (const [at, char] of chars.entries()) {
      if (char !== first || isWord((chars[at - 1] ?? '') + char)) continue;
      for (const gap of [2, 3, 4, 5, 6, 7]) {
        const between = chars.slice(at + 1, at + gap);
        if (chars[at + gap] === second && between.every((item) => /[㐀-鿿]/.test(item) && item !== second) && !isWord(second + (chars[at + gap + 1] ?? ''))) {
          return { line: [line.trim(), py[index].trim(), en[index].trim()], between: between.join('') };
        }
      }
    }
  }
  return null;
}

async function main() {
  const { byWord } = await readDictionaryRows();
  const isWord = (text: string) => byWord.has(text);
  const usage = new Map<string, WordUsage>();
  const entry = (word: string) => usage.get(word) ?? (() => { const created: WordUsage = {}; usage.set(word, created); return created; })();

  // Grammar: every point of every book, in book order.
  let points = 0;
  for (const book of [1, 2, 3, 4]) {
    const path = resolve(GRAMMAR, `book-${book}.json`);
    if (!existsSync(path)) continue;
    const pack = JSON.parse(await readFile(path, 'utf8')) as { items: Array<{ id: string; grammarPages: GrammarPage[] }> };
    for (const part of pack.items) for (const page of part.grammarPages) {
      const keys = grammarKeys(page.titleTraditional, page.focusTerms, isWord);
      if (keys.length > 0) points += 1;
      for (const key of keys) {
        const item = entry(key);
        item.g = [...(item.g ?? []), [part.id, page.id, page.bookId, page.lessonId, page.titleTraditional, page.titleSimplified ?? '', page.titleEnglish]];
      }
    }
  }

  // Splits: the reviewed book sentences (splitExamplesReview.ts).
  let splitWords = 0;
  if (existsSync(SPLITS)) {
    const source = JSON.parse(await readFile(SPLITS, 'utf8')) as { schemaVersion: number; entries: Record<string, NonNullable<WordUsage['s']>> };
    if (source.schemaVersion !== 1) throw new Error('splitExamples.json: unknown schemaVersion');
    for (const [word, rows] of Object.entries(source.entries)) {
      const [first, second] = Array.from(word);
      if (!rows.every((row) => row.length === 4 && row[0].includes(first) && row[0].includes(second) && row[1] && row[2])) throw new Error(`splitExamples.json: bad entry ${word}`);
      entry(word).s = rows.slice(0, SPLITS_PER_WORD);
      splitWords += 1;
    }
  }

  // Goes with: the reviewed pairs.
  let goesWithWords = 0;
  if (existsSync(GOES_WITH)) {
    const source = JSON.parse(await readFile(GOES_WITH, 'utf8')) as { schemaVersion: number; entries: Record<string, Array<[string, string]>> };
    if (source.schemaVersion !== 1) throw new Error('goesWith.json: unknown schemaVersion');
    for (const [word, pairs] of Object.entries(source.entries)) {
      if (!pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair[1].includes(word) && pair[1].includes(pair[0]))) throw new Error(`goesWith.json: bad entry ${word}`);
      entry(word).w = pairs;
      goesWithWords += 1;
    }
  }

  const shards = Array.from({ length: DICTIONARY_SHARD_COUNT }, () => ({} as Record<string, WordUsage>));
  for (const [word, item] of [...usage].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) shards[getDictionaryShard(word)][word] = item;
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const manifestShards = [];
  for (const [shard, items] of shards.entries()) {
    const text = `${JSON.stringify({ schemaVersion: 1, shard, count: Object.keys(items).length, items })}\n`;
    const name = `shard-${String(shard).padStart(2, '0')}.json`;
    await writeFile(resolve(OUT, name), text, 'utf8');
    manifestShards.push({ shard, count: Object.keys(items).length, path: `/data/dictionary-usage/${name}`, sha256: hash(text), bytes: Buffer.byteLength(text) });
  }
  await writeFile(resolve(OUT, 'manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    version: hash(manifestShards.map((item) => item.sha256).join('')).slice(0, 16),
    totalCount: usage.size,
    shardCount: DICTIONARY_SHARD_COUNT,
    shardStrategy: 'word-hash-modulo',
    shards: manifestShards,
  }, null, 2)}\n`, 'utf8');
  console.log(`Usage pack: ${usage.size} words (grammar from ${points} points, splits for ${splitWords} verbs, goes-with for ${goesWithWords} words) in ${DICTIONARY_SHARD_COUNT} shards (${manifestShards.reduce((sum, item) => sum + item.bytes, 0)} bytes).`);
}

if (process.argv[1]?.endsWith('buildUsagePack.ts')) {
  main().catch((error) => {
    console.error('Usage pack failed:', error);
    process.exit(1);
  });
}
