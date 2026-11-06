import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';

/**
 * Simplified text was once authored by hand, so a slip like 是 → 事 can hide in it. Within a lesson of
 * Book 2 or 3 every traditional character must map to one simplified character everywhere.
 */
const REDONE = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
/** Traditional characters that genuinely have more than one simplified form. */
const ONE_TO_MANY = new Set(['著', '乾', '藉', '瞭', '覆', '餘', '麼', '幹', '徵', '於', '甚', '畫']);

function pairs(value: unknown, out: [string, string][] = []): [string, string][] {
  if (Array.isArray(value)) value.forEach((entry) => pairs(entry, out));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.traditional === 'string' && typeof record.simplified === 'string') out.push([record.traditional, record.simplified]);
    Object.values(record).forEach((entry) => pairs(entry, out));
  }
  return out;
}

test('simplified is consistent within each Book 2 and Book 3 lesson', () => {
  const problems: string[] = [];
  for (const [book, lesson] of [2, 3].flatMap((b) => REDONE.map((name) => [b, name] as const))) {
    const found = new Map<string, Map<string, string>>();
    for (const file of [`content/grammar/b${book}Lesson${lesson}.json`]) {
      for (const [traditional, simplified] of pairs(readJson(file))) {
        const t = [...traditional];
        const s = [...simplified];
        // Regional wording (印尼 → 印度尼西亚) changes length; only same-length text is compared.
        if (t.length !== s.length) continue;
        t.forEach((char, index) => {
          if (ONE_TO_MANY.has(char)) return;
          const forms = found.get(char) ?? new Map<string, string>();
          if (!forms.has(s[index])) forms.set(s[index], traditional);
          found.set(char, forms);
        });
      }
    }
    for (const [char, forms] of found) {
      if (forms.size > 1) problems.push(`b${book}Lesson${lesson}: ${char} → ${[...forms].map(([form, where]) => `${form} (in "${where}")`).join(', ')}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('Book 2 simplified writes 你 for 妳 and converts the book\'s own words (义大利, 想像)', () => {
  const problems: string[] = [];
  const texts = [
    ...pairs(readJson('content/readings/book-2.json')),
    ...REDONE.flatMap((lesson) => pairs(readJson(`content/grammar/b2Lesson${lesson}.json`))),
  ];
  for (const [traditional, simplified] of texts) {
    if (simplified.includes('妳')) problems.push(`妳 in simplified: ${simplified.slice(0, 30)}`);
    if (traditional.includes('義大利') && simplified.includes('意大利')) problems.push(`意大利: ${simplified.slice(0, 30)}`);
    if (traditional.includes('想像') && simplified.includes('想象')) problems.push(`想象: ${simplified.slice(0, 30)}`);
  }
  assert.deepEqual(problems, []);
});
