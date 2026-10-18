import assert from 'node:assert/strict';
import test from 'node:test';
import type { InteractiveGrammarPart } from '../../src/types/models';
import { getPatternRowGroups } from '../../src/utils/grammar/grammarPatternLayout';
import { readJson } from '../acceptance_helpers';

/**
 * Voice B (studio) recordings fill only what the book doesn't say: every one is owner-approved and
 * published to its immutable R2 key, and the book's own recording always wins.
 */
interface StudioClip { file: string; sha256: string; approved: string; spoken: string }
const studio = readJson<Record<string, StudioClip>>('content/audio/grammar_studio_audio.json');
const book = new Set([
  ...Object.keys(readJson<Record<string, unknown>>('content/audio/grammar_track_clips.json')),
  ...Object.keys(readJson<Record<string, unknown>>('content/audio/grammar_track_approved.json')),
  ...Object.keys(readJson<Record<string, unknown>>('content/audio/grammar_book_clips.json')),
]);
const parts = readJson<{ items: InteractiveGrammarPart[] }>('public/data/grammar/book-1.json').items;
const han = (text: string) => [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('');

test('every studio clip is approved, published under its versioned key, and never replaces the book', () => {
  assert.ok(Object.keys(studio).length > 0);
  const problems = Object.entries(studio).flatMap(([key, clip]) => [
    ...(/^grammar-studio\/v1\/[0-9a-f]{12}\.mp3$/.test(clip.file) ? [] : [`${key}: key ${clip.file}`]),
    ...(/^[0-9a-f]{64}$/.test(clip.sha256) ? [] : [`${key}: sha256`]),
    ...(clip.approved.startsWith('owner ') ? [] : [`${key}: not approved by the owner`]),
    ...(book.has(key) ? [`${key}: the book already says it`] : []),
  ]);
  assert.deepEqual(problems, []);
});

test('every L1–L8 grammar example and table row plays a recording', () => {
  const silent = parts.filter((part) => part.lessonId <= 8).flatMap((part) => part.grammarPages.flatMap((page) => [
    ...page.examples.filter((example) => !example.text.audio).map((example) => `${page.id} ${example.text.traditional}`),
    ...[...page.patternRows, ...(page.subsections ?? []).flatMap((section) => section.patternRows ?? [])]
      .filter((row) => !row.exampleId && !row.audio)
      .map((row) => `${page.id} row ${getPatternRowGroups(row).flat().map((token) => token.traditional).join('')}`),
  ]));
  assert.deepEqual(silent, []);
  const used = new Set(parts.flatMap((part) => part.grammarPages.flatMap((page) => page.examples.map((example) => han(example.text.traditional)))));
  assert.ok(Object.keys(studio).some((key) => used.has(key)));
});
