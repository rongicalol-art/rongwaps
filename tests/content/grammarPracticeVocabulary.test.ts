import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPage, InteractiveGrammarPart } from '../../src/types/models';

/**
 * Book exercises may only use words taught up to their lesson part: Book 1 vocabulary
 * through that lesson, words in the book's grammar examples so far (not authored glossaries), and the
 * words a page explicitly allows because the book prints them beside the exercise.
 */

interface VocabItem { id: string; traditional: string }
const vocab = readJson<{ items: VocabItem[] }>('public/data/vocabulary/book-1.json').items;
const grammar = readJson<{ items: InteractiveGrammarPart[] }>('public/data/grammar/book-1.json').items;

const B3_REDONE = new Set([1, 2, 3, 4, 5]);
const b3Vocab = readJson<{ items: VocabItem[] }>('public/data/vocabulary/book-3.json').items;
const earlierVocab = [...vocab, ...readJson<{ items: VocabItem[] }>('public/data/vocabulary/book-2.json').items];
const b3Grammar = readJson<{ items: InteractiveGrammarPart[] }>('public/data/grammar/book-3.json').items;
const parts = [...grammar, ...b3Grammar.filter((part) => B3_REDONE.has(part.lessonId))];

/** Book order of a vocabulary id (B1L01-2-06 → lesson 1, part 2). */
const orderOf = (id: string) => { const m = /^B[13]L(\d+)-(\d+)/.exec(id); return m ? Number(m[1]) * 10 + Number(m[2]) : Infinity; };
/** "（一）點（兒）" → 點, 一點, 點兒, 一點兒; "臺灣/台灣" → both. */
function forms(entry: string): string[] {
  return entry.split(/[/／]/).flatMap((form) => {
    const optional = [...form.matchAll(/（([^）]*)）/g)].map((match) => match[0]);
    let variants = [form];
    for (const part of optional) variants = variants.flatMap((variant) => [variant.replace(part, ''), variant.replace(part, part.slice(1, -1))]);
    return variants.map((variant) => variant.trim()).filter(Boolean);
  });
}
/** Every `traditional` string inside a JSON value. */
function chineseStrings(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((entry) => chineseStrings(entry, out));
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'traditional' && typeof entry === 'string') out.push(entry);
      else chineseStrings(entry, out);
    }
  }
  return out;
}
const HAN = /\p{Script=Han}/u;

/** Book 3 includes the preceding books, earlier examples, printed allowances and numerals. */
function taughtB3(page: InteractiveGrammarPage): Set<string> {
  const through = page.lessonId * 10 + page.partId;
  return new Set([
    ...earlierVocab.flatMap((item) => forms(item.traditional)),
    ...b3Vocab.filter((item) => orderOf(item.id) <= through).flatMap((item) => forms(item.traditional)),
    ...b3Grammar.filter((part) => part.lessonId * 10 + part.partId <= through)
      .flatMap((part) => part.grammarPages).flatMap((other) => other.examples)
      .flatMap((example) => example.text.words ?? []).map((word) => word.traditional),
    ...(page.practice?.allowWords ?? []),
    ...'〇一二三四五六七八九十百千萬兩',
  ]);
}

test('Grammar practice uses only taught words', () => {
  const problems: string[] = [];
  for (const part of parts) {
    for (const page of part.grammarPages) {
      if (!page.practice) continue;
      const taught = page.bookId === 3 ? taughtB3(page) : new Set([
        ...vocab.filter((item) => orderOf(item.id) <= page.lessonId * 10 + page.partId).flatMap((item) => forms(item.traditional)),
        ...grammar.filter((other) => other.lessonId * 10 + other.partId <= page.lessonId * 10 + page.partId)
          .flatMap((other) => other.grammarPages)
          .flatMap((other) => other.examples.flatMap((example) => example.text.words ?? []))
          .map((word) => word.traditional),
        ...(page.practice.allowWords ?? []),
      ]);
      for (const text of chineseStrings(page.practice)) {
        const chars = [...text];
        for (let index = 0; index < chars.length;) {
          if (!HAN.test(chars[index])) { index += 1; continue; }
          const length = [6, 5, 4, 3, 2, 1].find((size) => taught.has(chars.slice(index, index + size).join('')));
          if (!length) {
            problems.push(`${page.id}: "${chars[index]}" in "${text}" is not taught by Lesson ${page.lessonId} Part ${page.partId}`);
            index += 1;
          } else index += length;
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('a gloss only explains a word the vocabulary has not taught yet', () => {
  const problems: string[] = [];
  for (const part of parts) {
    for (const page of part.grammarPages) {
      if (!page.practice) continue;
      const taught = page.bookId === 3 ? taughtB3(page) : new Set(vocab.filter((item) => orderOf(item.id) <= page.lessonId * 10 + page.partId).flatMap((item) => forms(item.traditional)));
      for (const item of page.practice.items) {
        for (const entry of item.glossary ?? []) {
          if (taught.has(entry.traditional)) problems.push(`${page.id} ${item.id}: ${entry.traditional} is already taught, so it needs no gloss.`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});
