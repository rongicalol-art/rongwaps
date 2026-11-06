import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import { splitPinyinWordToSyllables } from '../../src/utils/pinyin/pinyinSyllables';
import { stripTones } from '../../src/data/pinyinTables';
import { getPinyinTone } from '../../src/utils/pinyin/pinyinTones';
import type { GrammarWordToken } from '../../src/types/grammar';

/**
 * Books 2 and 3 were rebuilt (scripts/content/rebuildGrammarWords.ts) so their grammar word blocks are real
 * words with the book's Taiwan readings, and their readings and card examples follow the same pinyin rules.
 * These checks keep them that way.
 */
const BOOKS = [2, 3];
const LESSONS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
const HAN = /\p{Script=Han}/u;
const PARTICLES = new Set([...'的了嗎呢吧啊呀喔哦啦們著得地麼個子頭過']);
/**
 * Same characters, another word than the card: 颱風假's 假 jià "day off" is not the card 假 jiǎ "false";
 * 拿得了's 了 liǎo "manage" is not the card 了 le.
 */
const HOMOGRAPHS = new Map([['假', ['jia4']], ['了', ['liao3']]]);

interface Text { traditional: string; pinyin?: string; words?: GrammarWordToken[] }
interface Page { id: string; examples: { id: string; text: Text }[] }

function pages(book: number): Page[] {
  return LESSONS.flatMap((name) => Object.values(readJson<Record<string, { grammarPages?: Page[] }>>(`content/grammar/b${book}Lesson${name}.json`))
    .flatMap((part) => part?.grammarPages ?? []));
}

const hanOf = (text: string) => [...text].filter((c) => HAN.test(c)).join('');

/**
 * Spoken syllables of a pinyin string. A/B labels are not spoken; nor is Latin the text itself prints: a gloss
 * like （xīguǎn, straw） or a letter like 3C or 專櫃A. Erhua "r" counts as the syllable of its 兒.
 */
function syllables(pinyin: string, text = ''): string[] {
  let spoken = pinyin.normalize('NFC').replace(/(^|\s|\n)[A-D][:：]/g, ' ');
  let printed = text.replace(/(^|\n)[A-D][：:]/g, '$1');
  for (const [group, gloss] of printed.matchAll(/（([^）\p{Script=Han}]*[A-Za-z][^）\p{Script=Han}]*)）/gu)) {
    spoken = spoken.replace(`(${gloss})`, ' ');
    printed = printed.replace(group, '');
  }
  const words = spoken.split(/[^A-Za-zÀ-ɏ'’]+/u).filter(Boolean);
  // Latin the text itself prints, pinyin included (都唸 yú), is not a syllable of the sentence.
  for (const latin of printed.match(/[A-Za-zÀ-ɏ]+/gu) ?? []) {
    const index = words.indexOf(latin);
    if (index >= 0) words.splice(index, 1);
  }
  return words.flatMap((word) => splitPinyinWordToSyllables(word.replace(/’/g, "'")));
}
const key = (syllable: string) => `${stripTones(syllable).toLowerCase()}${getPinyinTone(syllable)}`;

/** Course cards (Books 1–4) by word, with each reading's syllable keys; "哪/哪" and "nǎ/něi" give one entry per form. */
function cardReadings(): Map<string, string[][]> {
  const cards = new Map<string, string[][]>();
  for (const book of [1, 2, 3, 4]) {
    const { items } = readJson<{ items: { traditional: string; pinyin: string }[] }>(`public/data/vocabulary/book-${book}.json`);
    for (const item of items) {
      if (/[（(]/.test(item.traditional + item.pinyin)) continue;
      const forms = item.traditional.split('/');
      const variants = item.pinyin.split('/');
      forms.forEach((form, i) => {
        const list = cards.get(form) ?? [];
        for (const variant of variants.length === forms.length ? [variants[i]] : variants) list.push(syllables(variant, form).map(key));
        cards.set(form, list);
      });
    }
  }
  return cards;
}

for (const book of BOOKS) {
  test(`Book ${book} grammar word blocks spell their sentence, one syllable per character`, () => {
    const problems: string[] = [];
    for (const page of pages(book)) {
      for (const example of page.examples) {
        const words = example.text.words ?? [];
        if (hanOf(words.map((w) => w.traditional).join('')) !== hanOf(example.text.traditional.replace(/(^|\n)[A-D][：:]/g, '$1'))) {
          problems.push(`${example.id}: blocks do not spell the sentence`);
        }
        for (const word of words) {
          const han = hanOf(word.traditional);
          if (!han) continue;
          if (syllables(word.pinyin, word.traditional).length !== [...han].length) problems.push(`${example.id}: ${word.traditional} = ${word.pinyin}`);
        }
        const fromWords = words.flatMap((w) => (hanOf(w.traditional) ? syllables(w.pinyin, w.traditional) : [])).map(key).join(' ');
        const sentence = syllables(example.text.pinyin ?? '', example.text.traditional).map(key).join(' ');
        if (fromWords !== sentence) problems.push(`${example.id}: sentence pinyin differs from its blocks`);
      }
    }
    assert.deepEqual(problems, []);
  });

  test(`Book ${book} grammar course words read as the book's word lists write them`, () => {
    const cards = cardReadings();
    const problems: string[] = [];
    for (const page of pages(book)) {
      for (const example of page.examples) {
        for (const word of example.text.words ?? []) {
          const readings = cards.get(word.traditional);
          if (!readings) continue;
          const got = syllables(word.pinyin, word.traditional).map(key);
          if (HOMOGRAPHS.get(word.traditional)?.includes(got.join(' '))) continue;
          const particle = PARTICLES.has(word.traditional) && got[0]?.endsWith('5');
          if (!particle && !readings.some((reading) => reading.join() === got.join())) {
            problems.push(`${example.id}: ${word.traditional} = ${word.pinyin}`);
          }
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  test(`Book ${book} readings have one pinyin syllable per character`, () => {
    const problems: string[] = [];
    for (const reading of readJson<{ id: string; paragraphs: Text[] }[]>(`content/readings/book-${book}.json`)) {
      reading.paragraphs.forEach((paragraph, index) => {
        const han = hanOf(paragraph.traditional);
        const count = syllables(paragraph.pinyin ?? '', paragraph.traditional).length;
        if (count !== han.length) problems.push(`${reading.id} p${index + 1}: ${han.length} characters, ${count} syllables`);
      });
    }
    assert.deepEqual(problems, []);
  });
}

const allPinyin = (book: number) => [
  ...pages(book).flatMap((page) => page.examples.map((example) => [example.text.traditional, example.text.pinyin ?? ''])),
  ...readJson<{ paragraphs: Text[] }[]>(`content/readings/book-${book}.json`)
    .flatMap((reading) => reading.paragraphs.map((p) => [p.traditional, p.pinyin ?? ''])),
  ...Object.values(readJson<Record<string, { chinese: string; pinyin: string }>>(`content/vocabulary/book-${book}-examples.json`))
    .map((example) => [example.chinese, example.pinyin]),
];

test('Book 2 card examples have one pinyin syllable per character', () => {
  const problems: string[] = [];
  for (const [id, example] of Object.entries(readJson<Record<string, { chinese: string; pinyin: string }>>('content/vocabulary/book-2-examples.json'))) {
    const text = example.chinese.replace(/(^|\s)[A-D][：:]/g, '$1');
    const count = syllables(example.pinyin, text).length;
    if (count !== hanOf(text).length) problems.push(`${id}: ${hanOf(text).length} characters, ${count} syllables`);
  }
  assert.deepEqual(problems, []);
});

test('Book 2: 一 keeps yī in weekdays and reads yì in 一、兩; final 啊 stays neutral; potential 得了 is de liǎo', () => {
  const problems: string[] = [];
  for (const [text, pinyin] of allPinyin(2)) {
    if (/(星期|禮拜)一/.test(text) && /xīngq[ií]y[íì]|lǐbàiy[íì]/i.test(pinyin)) problems.push(`weekday 一 changed: ${text}`);
    if (text.includes('一、兩') && /\by[īí], liǎng/.test(pinyin)) problems.push(`一、兩 not yì: ${text}`);
    if (/[對是好]啊[！？。，]/.test(text) && /\b(Duì|Shì|Hǎo) ā\b/i.test(pinyin)) problems.push(`particle 啊 toned: ${text}`);
    if (/[拿吃喝做走看]得了/.test(text) && /\bdéle\b/.test(pinyin)) problems.push(`potential 得了 read déle: ${text}`);
  }
  assert.deepEqual(problems, []);
});
