import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { GrammarPractice, SlotBuildItem } from '../../src/types/models';

/** Owner's exercise rules (2026-10-17): no pinyin or captions typed into sentences, no own item that repeats a book item. */
const dir = path.resolve('content/grammar-practice');
const lessons = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).flatMap((file) => {
  const pages = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Record<string, GrammarPractice>;
  return Object.entries(pages).map(([key, page]) => ({ key, items: page.items.filter((item): item is SlotBuildItem => item.kind === 'slot-build') }));
});

test('sentences carry no typed pinyin or captions', () => {
  const found = lessons.flatMap(({ key, items }) => items.flatMap((item) => item.lines.flatMap((line) => line.segments.flatMap((segment) =>
    (segment.type === 'text' && /[（(][a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǚ]+[）)]/.test(segment.traditional) ? [`${key} ${item.id}`] : [])))));
  assert.deepEqual(found, []);
});

test('an own item never repeats a book item in its group', () => {
  const tileSet = (item: SlotBuildItem) => item.tiles.map((tile) => tile.traditional).sort().join('|');
  const found = lessons.flatMap(({ key, items }) => items
    .filter((item) => item.source === 'own')
    .filter((own) => items.some((book) => book.source !== 'own' && tileSet(book) === tileSet(own)))
    .map((own) => `${key} ${own.id}`));
  assert.deepEqual(found, []);
});
