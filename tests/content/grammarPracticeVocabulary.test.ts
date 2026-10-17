import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPart } from '../../src/types/models';

/**
 * Book exercises may only use words taught up to their lesson part: Book 1 vocabulary
 * through that lesson, words in the book's grammar examples so far (not authored glossaries), and the
 * words a page explicitly allows because the book prints them beside the exercise.
 */

interface VocabItem { id: string; traditional: string }
const vocab = readJson<{ items: VocabItem[] }>('public/data/vocabulary/book-1.json').items;
const grammar = readJson<{ items: InteractiveGrammarPart[] }>('public/data/grammar/book-1.json').items;

/** Book order of a vocabulary id (B1L01-2-06 → lesson 1, part 2). */
const orderOf = (id: string) => { const m = /^B1L(\d+)-(\d+)/.exec(id); return m ? Number(m[1]) * 10 + Number(m[2]) : Infinity; };
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

test('Grammar practice uses only taught words', () => {
  const problems: string[] = [];
  for (const part of grammar) {
    for (const page of part.grammarPages) {
      if (!page.practice) continue;
      const taught = new Set([
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
