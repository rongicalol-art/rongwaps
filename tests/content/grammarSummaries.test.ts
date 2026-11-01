import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPart } from '../../src/types/models';

/**
 * Every grammar page has a plain-English summary (content/grammar-summaries/, merged by
 * `npm run content:export`): 1–4 short sentences, and any Chinese in them is copied from the page.
 */

const HAN_RUN = /[㐀-鿿豈-﫿]+/gu;
const MAX_WORDS = 22;

for (const bookId of [1, 2, 3]) {
  const parts = readJson<{ items: InteractiveGrammarPart[] }>(`public/data/grammar/book-${bookId}.json`).items;
  const pages = parts.flatMap((part) => part.grammarPages);

  test(`Book ${bookId} grammar summaries are short, complete and use only the page's Chinese`, () => {
    const problems: string[] = [];
    for (const page of pages) {
      const { summary, ...rest } = page;
      if (!summary?.length) { problems.push(`${page.id}: no summary in content/grammar-summaries/book-${bookId}.json`); continue; }
      if (summary.length > 4) problems.push(`${page.id}: ${summary.length} lines (max 4)`);
      const source = JSON.stringify(rest);
      for (const line of summary) {
        const words = line.replace(HAN_RUN, ' X ').split(/\s+/).filter(Boolean).length;
        if (words > MAX_WORDS) problems.push(`${page.id}: ${words} words (max ${MAX_WORDS}): ${line}`);
        if (!/[.!?]$/.test(line.trim())) problems.push(`${page.id}: not a full sentence: ${line}`);
        for (const run of line.match(HAN_RUN) ?? []) {
          if (!source.includes(run)) problems.push(`${page.id}: "${run}" is not on the page`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });
}
