import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { firstPosTag, posTagsKey } from '../../shared/dictionarySearch';
import { readBookSentences, readCourseCards, readDictionaryRows, readLevelWords } from './learnerData';

/**
 * `npx tsx scripts/dictionary/goesWithCandidates.ts` — dev-only. Finds "goes with" candidates for
 * the dictionary's word page: the nouns a common verb takes as its object (穿 → 衣服) and the verbs a
 * common noun is the object of (衣服 → 穿), counted in the course-book sentences and the Tatoeba
 * pool (output/dictionary-examples/tatoeba.json), each with up to two sentences as evidence. A pair
 * that is itself a book word (打電話, 吃飯) is left out: the word page already lists it under Words.
 * Writes Codex batches to output/dictionary-usage/goes-with-batches/ for goesWithReview.ts.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-usage');
const TATOEBA = resolve(process.cwd(), 'output/dictionary-examples/tatoeba.json');
const TAGS = resolve(process.cwd(), 'content/dictionary/posTags.json');
const MAX_WORD = 6;
const MIN_COUNT = 2;
const PER_WORD = 8;
const BATCH_SIZE = 25;
/** Never an object worth teaching: pronouns, question words, demonstratives. */
const NOT_OBJECTS = new Set(['什麼', '哪裡', '哪兒', '誰', '這', '那', '這個', '那個', '多少', '幾', '我', '你', '妳', '您', '他', '她', '它', '我們', '你們', '他們', '她們', '自己', '大家', '人', '別人', '一點', '一下']);
/** Too general to say how a noun is used. */
const GENERIC_VERBS = new Set(['有', '是', '在', '來', '去', '要', '想', '會', '能', '可以', '來自', '沒有', '看到', '覺得', '知道', '喜歡', '需要', '給', '用', '讓']);
const HAN = /[㐀-鿿]/;

export interface GoesWithCandidate { partner: string; phrase: string; count: number; sentences: Array<{ chinese: string; english: string }> }
export interface GoesWithBatchEntry { word: string; kind: 'verb' | 'noun'; meaning: string; candidates: GoesWithCandidate[] }

async function main() {
  const tags = (JSON.parse(await readFile(TAGS, 'utf8')) as { entries: Record<string, string> }).entries;
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const levels = await readLevelWords();
  const book = await readBookSentences();
  const tatoeba = existsSync(TATOEBA) ? JSON.parse(await readFile(TATOEBA, 'utf8')) as Array<{ chinese: string; english: string }> : [];

  const learner = new Set([...cards.keys(), ...[...levels].filter(([, level]) => level <= 4).map(([word]) => word)]);
  // A word's type: the book's tag, else the word type of its first tagged dictionary reading.
  const typeOf = new Map<string, string>();
  for (const word of learner) {
    const course = cards.get(word)?.find((card) => card.pos)?.pos?.trim();
    const tagged = (byWord.get(word) ?? []).map((row) => firstPosTag(tags[posTagsKey(word, row.pinyin_accented)])).find(Boolean);
    const type = course ?? tagged;
    if (type) typeOf.set(word, type);
  }
  const isNoun = (word: string) => /^N$/.test(typeOf.get(word) ?? '');
  const isActionVerb = (word: string) => /^V[ti]?$/.test(typeOf.get(word) ?? '');
  const isAnyVerb = (word: string) => /^V/.test(typeOf.get(word) ?? '');

  const segment = (text: string) => {
    const chars = Array.from(text);
    const tokens: string[] = [];
    for (let start = 0; start < chars.length;) {
      let length = Math.min(MAX_WORD, chars.length - start);
      while (length > 1 && !byWord.has(chars.slice(start, start + length).join(''))) length -= 1;
      tokens.push(chars.slice(start, start + length).join(''));
      start += length;
    }
    return tokens;
  };
  /** The object noun after the verb at `index`: past 了/著/過, numbers, measure words and 的 modifiers, before any other verb or punctuation. */
  const objectAfter = (tokens: string[], index: number): string | null => {
    for (let at = index + 1; at < Math.min(tokens.length, index + 7); at += 1) {
      const token = tokens[at];
      if (!HAN.test(token) || NOT_OBJECTS.has(token) || isAnyVerb(token)) return null;
      if (isNoun(token) && tokens[at + 1] !== '的' && !isNoun(tokens[at + 1] ?? '')) return token;
    }
    return null;
  };

  const sentences = [...book.map((item) => ({ chinese: item.chinese, english: item.english })), ...tatoeba.map((item) => ({ chinese: item.chinese, english: item.english }))]
    .flatMap((item) => {
      const zh = item.chinese.split('\n');
      const en = item.english.split('\n');
      return zh.length === en.length ? zh.map((line, index) => ({ chinese: line.trim(), english: en[index].trim() })) : [];
    });
  // pairs: verb → object → sentence indexes.
  const pairs = new Map<string, Map<string, number[]>>();
  const count = (verb: string, object: string, sentenceIndex: number) => {
    const objects = pairs.get(verb) ?? new Map<string, number[]>();
    objects.set(object, [...(objects.get(object) ?? []), sentenceIndex]);
    pairs.set(verb, objects);
  };
  sentences.forEach((sentence, sentenceIndex) => {
    const tokens = segment(sentence.chinese);
    tokens.forEach((token, index) => {
      if (isActionVerb(token) && learner.has(token)) {
        const object = objectAfter(tokens, index);
        if (object && learner.has(object)) count(token, object, sentenceIndex);
        return;
      }
      // A verb–object phrase the dictionary lists as one word (吃午飯, 打籃球) still pairs its verb and noun.
      const chars = Array.from(token);
      for (let cut = 1; cut < chars.length; cut += 1) {
        const verb = chars.slice(0, cut).join('');
        const object = chars.slice(cut).join('');
        if (isActionVerb(verb) && learner.has(verb) && isNoun(object) && learner.has(object)) { count(verb, object, sentenceIndex); break; }
      }
    });
  });

  const meaningOf = (word: string) => cards.get(word)?.[0]?.back ?? (byWord.get(word)?.[0]?.definitions ?? []).slice(0, 2).join('; ');
  const evidence = (indexes: number[]) => [...new Set(indexes)].slice(0, 2).map((index) => sentences[index]);
  const entries: GoesWithBatchEntry[] = [];
  const candidatesFor = (word: string, kind: 'verb' | 'noun') => {
    const found: GoesWithCandidate[] = [];
    if (kind === 'verb') {
      for (const [object, indexes] of pairs.get(word) ?? []) {
        const phrase = word + object;
        if (indexes.length >= MIN_COUNT && !cards.has(phrase)) found.push({ partner: object, phrase, count: indexes.length, sentences: evidence(indexes) });
      }
    } else {
      for (const [verb, objects] of pairs) {
        const indexes = objects.get(word);
        const phrase = verb + word;
        if (indexes && indexes.length >= MIN_COUNT && !GENERIC_VERBS.has(verb) && !cards.has(phrase)) found.push({ partner: verb, phrase, count: indexes.length, sentences: evidence(indexes) });
      }
    }
    return found.sort((a, b) => b.count - a.count).slice(0, PER_WORD);
  };
  for (const word of [...learner].sort()) {
    const kind = isActionVerb(word) ? 'verb' : isNoun(word) ? 'noun' : null;
    if (!kind) continue;
    const candidates = candidatesFor(word, kind);
    if (candidates.length > 0) entries.push({ word, kind, meaning: meaningOf(word), candidates });
  }

  await rm(resolve(OUT, 'goes-with-batches'), { recursive: true, force: true });
  await mkdir(resolve(OUT, 'goes-with-batches'), { recursive: true });
  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    const name = `goes-${String(start / BATCH_SIZE).padStart(3, '0')}.json`;
    await writeFile(resolve(OUT, 'goes-with-batches', name), `${JSON.stringify(entries.slice(start, start + BATCH_SIZE), null, 1)}\n`, 'utf8');
  }
  const verbs = entries.filter((entry) => entry.kind === 'verb').length;
  console.log(`Goes-with candidates: ${entries.length} words (${verbs} verbs, ${entries.length - verbs} nouns), ${entries.reduce((sum, entry) => sum + entry.candidates.length, 0)} pairs, ${Math.ceil(entries.length / BATCH_SIZE)} batches.`);
}

main().catch((error) => {
  console.error('Goes-with candidates failed:', error);
  process.exit(1);
});
