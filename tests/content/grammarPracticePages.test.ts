import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { GrammarPractice, InteractiveGrammarPart, SlotBuildItem } from '../../src/types/models';
import { practiceSlots, slotBuildSolutions, slotBuildText } from '../../src/utils/grammar/grammarPracticeCheck';
import { NUMERAL_CHARACTERS } from '../../src/utils/lesson/lessonScope';
import { readJson } from '../acceptance_helpers';

/**
 * Exercise pages of Book 1 and Book 2 (docs/grammar/briefs/B1-exercise-pages.md and B2-exercise-pages.md):
 * one scrolling page per grammar point, fill-the-blank items only, at least four plausible words, every
 * wrong word explained, nothing given away. Book 2 differs in one rule: a tile may be a short phrase.
 * `PRACTICE_LESSON=b2LessonTwo` (or `BOOK1_LESSON=lessonTwo`) checks one lesson file while it is being authored.
 */
const dir = path.resolve('content/grammar-practice');
const only = process.env.PRACTICE_LESSON ?? process.env.BOOK1_LESSON;
const bookOf = (key: string) => Number(/^B(\d+)L/.exec(key)?.[1]);
/** Book 1 tiles are single words; Book 2 exercises ask for whole clauses, so a tile may be a short phrase. */
const MAX_TILE = { 1: 4, 2: 8 } as Record<number, number>;
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json') && (!only || file === `${only}.json`));
const pages = files.flatMap((file) => Object.entries(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Record<string, GrammarPractice>)
  .filter(([key]) => bookOf(key) in MAX_TILE)
  .map(([key, page]) => ({ key, page })));
const slotItems = pages.flatMap(({ key, page }) => page.items.flatMap((item) => (item.kind === 'slot-build' ? [{ key, item }] : [])));
const bare = (text: string) => text.replace(/[\s，。！？、：；,.!?]/gu, '');
const lineText = (item: SlotBuildItem) => item.lines.flatMap((line) => line.segments.map((segment) => (segment.type === 'text' ? segment.traditional : ''))).join('');

test('a page is fill-the-blank items only, with no per-item titles or glosses', () => {
  const found = pages.flatMap(({ key, page }) => page.items.flatMap((item) => {
    if (item.kind !== 'slot-build') return [`${key} ${item.id}: kind ${item.kind}`];
    const extra = (['prompt', 'quiet', 'sub', 'glossary', 'gaps', 'successNote'] as const).filter((field) => item[field] !== undefined);
    const speakers = item.lines.flatMap((line) => (line.me ? ['me'] : [])).concat(extra);
    return speakers.length ? [`${key} ${item.id}: ${speakers.join(', ')}`] : [];
  }));
  assert.deepEqual(found, []);
});

test('book items come first, in book order, with at most two own items after them', () => {
  const found = pages.flatMap(({ key, page }) => {
    const sources = page.items.map((item) => item.source);
    const firstOwn = sources.indexOf('own');
    const problems: string[] = [];
    if (firstOwn >= 0 && sources.slice(firstOwn).some((source) => source !== 'own')) problems.push(`${key}: a book item after an own item`);
    if (sources.filter((source) => source === 'own').length > 2) problems.push(`${key}: more than two own items`);
    const book = sources.filter((source) => source !== 'own');
    // "p.189 #3", or "p.189 (2) #1" for the second exercise box of that point on the same page.
    if (book.some((source) => !/^p\.\d+(?: \(\d+\))? #\d+$/.test(source))) problems.push(`${key}: source must be "p.<page> #<n>" or "p.<page> (<box>) #<n>"`);
    const order = book.map((source) => { const [, pageNo, box, n] = /^p\.(\d+)(?: \((\d+)\))? #(\d+)$/.exec(source) ?? []; return Number(pageNo) * 10000 + Number(box ?? 1) * 100 + Number(n); });
    if (order.some((at, index) => index > 0 && at <= order[index - 1])) problems.push(`${key}: book items out of order`);
    return problems;
  });
  assert.deepEqual(found, []);
});

test('every item offers at least four words, more than its blanks, and at most six', () => {
  const found = slotItems.flatMap(({ key, item }) => {
    const blanks = practiceSlots(item).length;
    const count = item.tiles.length;
    return count < 4 || count <= blanks || count > 6 ? [`${key} ${item.id}: ${count} tiles for ${blanks} blanks`] : [];
  });
  assert.deepEqual(found, []);
});

test('tiles are short', () => {
  const found = slotItems.flatMap(({ key, item }) => item.tiles.filter((tile) => [...tile.traditional].length > MAX_TILE[bookOf(key)]).map((tile) => `${key} ${item.id}: ${tile.traditional}`));
  assert.deepEqual(found, []);
});

test('every right fill is an authored sentence with its English', () => {
  const found = slotItems.flatMap(({ key, item }) => {
    const sentences = [item.result, ...(item.alternatives ?? [])];
    const problems = sentences.filter((sentence) => !sentence.english?.trim() || !sentence.pinyin?.trim()).map((sentence) => `${key} ${item.id}: ${sentence.traditional} needs pinyin and English`);
    const solutions = slotBuildSolutions(item);
    if (solutions.length === 0) problems.push(`${key} ${item.id}: no way to fill the blanks`);
    for (const solution of solutions) {
      const built = bare(slotBuildText(item, solution));
      if (!sentences.some((sentence) => bare(sentence.traditional) === built)) problems.push(`${key} ${item.id}: accepted fill "${built}" has no sentence`);
    }
    return problems;
  });
  assert.deepEqual(found, []);
});

test('the answer is never printed in the item itself', () => {
  const found = slotItems.flatMap(({ key, item }) => slotBuildSolutions(item).flatMap((solution) => {
    const answer = practiceSlots(item).map((slot) => solution[slot.id]).join('');
    return [...answer].length > 1 && bare(lineText(item)).includes(answer) ? [`${key} ${item.id}: "${answer}" is in the lines`] : [];
  }));
  assert.deepEqual(found, []);
});

test('every wrong tile explains itself wherever it lands', () => {
  const found = slotItems.flatMap(({ key, item }) => {
    const placed = new Set((item.repairs ?? []).flatMap((repair) => repair.placed ?? []));
    const covered = new Set((item.repairs ?? []).flatMap((repair) => (repair.slot ? [`${repair.slot.id}|${repair.slot.tile}`] : [])));
    const tiles = [...new Set(item.tiles.map((tile) => tile.traditional))];
    const answers = new Set(practiceSlots(item).flatMap((slot) => slot.answers));
    // A tile that is right somewhere may land in the wrong blank: `fallbackRepair` covers order.
    return practiceSlots(item).flatMap((slot) => tiles
      .filter((tile) => !answers.has(tile) && !placed.has(tile) && !covered.has(`${slot.id}|${tile}`))
      .map((tile) => `${key} ${item.id} ${slot.id}←${tile}`));
  });
  assert.deepEqual(found, []);
});

test('lines are short, with no typed pinyin or captions, and speakers are the book letters', () => {
  const found = slotItems.flatMap(({ key, item }) => item.lines.flatMap((line) => {
    const text = line.segments.map((segment) => (segment.type === 'text' ? segment.traditional : '＿')).join('');
    const problems: string[] = [];
    if ([...text].length > 45) problems.push(`${key} ${item.id}: long line ${text.slice(0, 12)}…`);
    if (/[（(][a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǚ\s]+[）)]/i.test(text)) problems.push(`${key} ${item.id}: typed pinyin in ${text.slice(0, 12)}…`);
    if (line.speaker && !/^[A-D]$|\p{Script=Han}/u.test(line.speaker.traditional)) problems.push(`${key} ${item.id}: speaker ${line.speaker.traditional}`);
    return problems;
  }));
  assert.deepEqual(found, []);
});

test('item ids are unique', () => {
  const ids = slotItems.map(({ item }) => item.id);
  assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
});

// Taught scope: reads the grammar pack only for lesson parts and book examples, which authors don't change.
// A later book starts from everything the books before it taught.
const BOOKS = Object.keys(MAX_TILE).map(Number);
const vocab = BOOKS.flatMap((book) => readJson<{ items: Array<{ id: string; traditional: string; simplified?: string }> }>(`public/data/vocabulary/book-${book}.json`).items);
const grammar = BOOKS.flatMap((book) => readJson<{ items: InteractiveGrammarPart[] }>(`public/data/grammar/book-${book}.json`).items);
const pageInfo = new Map(grammar.flatMap((part) => part.grammarPages.map((page) => [page.id, part.bookId * 1000 + part.lessonId * 10 + part.partId] as const)));
const orderOf = (id: string) => { const match = /^B(\d+)L(\d+)-(\d+)/.exec(id); return match ? Number(match[1]) * 1000 + Number(match[2]) * 10 + Number(match[3]) : Infinity; };
const forms = (entry: string) => entry.split(/[/／]/).flatMap((form) => {
  let variants = [form];
  for (const optional of form.match(/（[^）]*）/g) ?? []) variants = variants.flatMap((variant) => [variant.replace(optional, ''), variant.replace(optional, optional.slice(1, -1))]);
  return variants.map((variant) => variant.trim()).filter(Boolean);
});

// Characters whose simplified form differs, learned from the vocabulary pack's paired forms.
const changes = new Set(vocab.flatMap((word) => {
  const t = [...word.traditional];
  const s = [...(word.simplified ?? '')];
  return t.length === s.length ? t.filter((char, index) => char !== s[index]) : [];
}));

test('Chinese whose simplified form differs carries it, so simplified learners never see traditional', () => {
  const missing = (text: { traditional: string; simplified?: string }, where: string) => {
    if (!text.simplified) return [...text.traditional].some((char) => changes.has(char)) ? [`${where}: ${text.traditional} needs simplified`] : [];
    // A simplified form must not keep a traditional character (馬上 left in place of 马上).
    return [...text.simplified].some((char) => changes.has(char)) ? [`${where}: simplified ${text.simplified} keeps a traditional character`] : [];
  };
  const found = slotItems.flatMap(({ key, item }) => [
    ...item.lines.flatMap((line) => line.segments.flatMap((segment) => (segment.type === 'text' ? missing(segment, `${key} ${item.id}`) : []))),
    ...item.tiles.flatMap((tile) => missing(tile, `${key} ${item.id} tile`)),
    ...[item.result, ...(item.alternatives ?? [])].flatMap((sentence) => missing(sentence, `${key} ${item.id} sentence`)),
  ]);
  assert.deepEqual(found, []);
});

test('only taught words', () => {
  const found = pages.flatMap(({ key, page }) => {
    const through = pageInfo.get(key);
    if (!through) return [`${key}: not a grammar page`];
    const taught = new Set([
      ...vocab.filter((word) => orderOf(word.id) <= through).flatMap((word) => forms(word.traditional)),
      ...grammar.filter((part) => part.bookId * 1000 + part.lessonId * 10 + part.partId <= through).flatMap((part) => part.grammarPages)
        .flatMap((other) => other.examples.flatMap((example) => example.text.words ?? [])).map((word) => word.traditional),
      ...(page.allowWords ?? []),
      // Book 1 teaches the numerals; later books count freely.
      ...(bookOf(key) > 1 ? NUMERAL_CHARACTERS : []),
    ]);
    const texts = page.items.flatMap((item) => (item.kind === 'slot-build'
      ? [...item.lines.flatMap((line) => line.segments.flatMap((segment) => (segment.type === 'text' ? [segment.traditional] : []))), ...item.tiles.map((tile) => tile.traditional), item.result.traditional, ...(item.alternatives ?? []).map((sentence) => sentence.traditional)]
      : []));
    return texts.flatMap((text) => {
      const chars = [...text];
      const missing: string[] = [];
      for (let index = 0; index < chars.length;) {
        if (!/\p{Script=Han}/u.test(chars[index])) { index += 1; continue; }
        const length = [6, 5, 4, 3, 2, 1].find((size) => taught.has(chars.slice(index, index + size).join('')));
        if (length) index += length;
        else { missing.push(`${key}: "${chars[index]}" in "${text}"`); index += 1; }
      }
      return missing;
    });
  });
  assert.deepEqual([...new Set(found)], []);
});
