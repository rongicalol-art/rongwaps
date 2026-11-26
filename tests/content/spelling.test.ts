import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';

/** The owner's spelling choices (2026-11-26, .claude/rules/content.md). */
const jsonUnder = (dir: string) => readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.json')).map((name) => `${dir}/${name}`);
const holding = (files: string[], pattern: RegExp) => files.filter((file) => pattern.test(readFileSync(file, 'utf8').normalize('NFC')));

test('表示 is spelled biǎoshì, full fourth tone', () => {
  assert.deepEqual(holding(jsonUnder('content'), /biǎo(?: ?shi|sh[īíǐ])(?!\p{L})/iu), []);
});

test('what we wrote ourselves says 台灣, not 臺灣', () => {
  assert.deepEqual(holding([...jsonUnder('content/lesson-tests'), ...jsonUnder('content/grammar-pages')], /臺灣/), []);
  const own = jsonUnder('content/grammar-practice').flatMap((file) =>
    Object.values(JSON.parse(readFileSync(file, 'utf8')) as Record<string, { items: Array<{ id: string; source: string }> }>)
      .flatMap((practice) => practice.items).filter((item) => item.source === 'own' && JSON.stringify(item).includes('臺灣')).map((item) => item.id));
  assert.deepEqual(own, []);
});
