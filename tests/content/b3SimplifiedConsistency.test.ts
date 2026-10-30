import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';

/**
 * Book 3 simplified text is authored by hand, so a slip like 是 → 事 can hide in it. Within a
 * redone lesson every traditional character must map to one simplified character everywhere.
 */
const REDONE = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
/** Traditional characters that genuinely have more than one simplified form. */
const ONE_TO_MANY = new Set(['著', '乾', '藉', '瞭', '覆', '餘', '麼', '幹', '徵', '於', '甚', '畫', '路']);

function pairs(value: unknown, out: [string, string][] = []): [string, string][] {
  if (Array.isArray(value)) value.forEach((entry) => pairs(entry, out));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.traditional === 'string' && typeof record.simplified === 'string') out.push([record.traditional, record.simplified]);
    Object.values(record).forEach((entry) => pairs(entry, out));
  }
  return out;
}

test('simplified is consistent in redone Book 3 lessons', () => {
  const problems: string[] = [];
  for (const lesson of REDONE) {
    const found = new Map<string, Map<string, string>>();
    for (const file of [`content/grammar/b3Lesson${lesson}.json`]) {
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
      if (forms.size > 1) problems.push(`b3Lesson${lesson}: ${char} → ${[...forms].map(([form, where]) => `${form} (in "${where}")`).join(', ')}`);
    }
  }
  assert.deepEqual(problems, []);
});
