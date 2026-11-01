import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPage, InteractiveGrammarPart } from '../../src/types/models';
import { NUMERAL_CHARACTERS, traditionalStrings as chineseStrings, untaughtCharacters, vocabForms as forms, vocabOrder as orderOf } from '../../src/utils/lesson/lessonScope';

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
    ...NUMERAL_CHARACTERS,
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
        for (const char of untaughtCharacters(text, taught)) {
          problems.push(`${page.id}: "${char}" in "${text}" is not taught by Lesson ${page.lessonId} Part ${page.partId}`);
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
