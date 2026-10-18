import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';

interface GrammarToken {
  traditional: string;
  prefix?: string;
  suffix?: string;
}

interface GrammarPatternRow {
  id: string;
  exampleId?: string;
  columns?: GrammarToken[][];
  subject: GrammarToken[];
  grammar: GrammarToken[];
  complement: GrammarToken[];
  audio?: { voice: string; file: string; start?: number; end?: number };
}

interface GrammarExample {
  id: string;
  text: { traditional: string; audio?: { voice: string; file: string; start?: number; end?: number } };
}

interface GrammarPage {
  id: string;
  patternRows?: GrammarPatternRow[];
  subsections?: Array<{ patternRows?: GrammarPatternRow[] }>;
  examples: GrammarExample[];
}

interface GrammarPart {
  lessonId: number;
  partId: number;
  grammarPages: GrammarPage[];
}

interface GrammarTrackClip {
  file: string;
  start: number;
  end: number;
  score: number;
  minScore: number;
  onsets: number[];
  page: string;
  rowId?: string;
  exampleId?: string;
  approved?: string;
}

interface GrammarTrackApproval {
  file: string;
  start: number;
  end: number;
  approved: string;
}

const hanOnly = (text: string) => [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('');
const rowText = (row: GrammarPatternRow) => (row.columns ?? [row.subject, row.grammar, row.complement])
  .flat()
  .map((token) => `${token.prefix ?? ''}${token.traditional}${token.suffix ?? ''}`)
  .join('');
const rowsForPage = (page: GrammarPage) => [
  ...(page.patternRows ?? []),
  ...(page.subsections ?? []).flatMap((subsection) => subsection.patternRows ?? []),
].filter((row) => !row.exampleId);
const sentenceTurnBoundaries = (text: string) => {
  const chars = [...text];
  const boundaries = new Set<number>();
  let hanCount = 0;
  let pendingBoundary = false;

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (/^\p{Script=Latin}$/u.test(char) && (chars[index + 1] === '：' || chars[index + 1] === ':')) {
      if (hanCount > 0) pendingBoundary = true;
      index += 1;
      continue;
    }
    if ('。？！，、；：'.includes(char)) {
      if (hanCount > 0) pendingBoundary = true;
      continue;
    }
    if (/\p{Script=Han}/u.test(char)) {
      if (pendingBoundary && hanCount > 0) boundaries.add(hanCount - 1);
      hanCount += 1;
      pendingBoundary = false;
    }
  }
  return boundaries;
};

const sourceItems = fs.readdirSync('content/grammar')
  .filter((file) => file.endsWith('.json'))
  .flatMap((file) => Object.entries(readJson<Record<string, GrammarPart>>(`content/grammar/${file}`))
    .filter(([key]) => key.includes('_PART_'))
    .flatMap(([, part]) => part.grammarPages.flatMap((page) => [
      ...rowsForPage(page).map((row) => ({ type: 'row' as const, id: row.id, text: rowText(row), part, page })),
      ...page.examples.map((example) => ({ type: 'example' as const, id: example.id, text: example.text.traditional, part, page })),
    ])));

const exportedParts = readJson<{ items: GrammarPart[] }>('public/data/grammar/book-1.json').items;
const exportedExamples = new Map(exportedParts.flatMap((part) => part.grammarPages.flatMap((page) => page.examples
  .map((example) => [`${page.id}:${example.id}`, example] as const))));
const exportedRows = new Map(exportedParts.flatMap((part) => part.grammarPages.flatMap((page) => rowsForPage(page)
  .map((row) => [`${page.id}:${row.id}`, row] as const))));

test('grammar-track clips identify source rows or examples and reach the exported pack', () => {
  const clips = readJson<Record<string, GrammarTrackClip>>('content/audio/grammar_track_clips.json');
  const approvals = readJson<Record<string, GrammarTrackApproval>>('content/audio/grammar_track_approved.json');
  assert.ok(Object.keys(clips).length > 0, 'at least one grammar-track clip should be matched');

  for (const [key, clip] of Object.entries(clips)) {
    assert.equal(Number(clip.rowId !== undefined) + Number(clip.exampleId !== undefined), 1, `${key} must identify exactly one row or example`);
    const source = sourceItems.find((item) => item.page.id === clip.page
      && item.type === (clip.rowId !== undefined ? 'row' : 'example')
      && item.id === (clip.rowId ?? clip.exampleId));
    assert.ok(source, `${key} does not identify a real source item on ${clip.page}`);
    assert.equal(key, hanOnly(source.text), `${key} is not the Han-only source text`);
    if (clip.rowId !== undefined) {
      const row = sourceItems.find((item) => item.type === 'row' && item.id === clip.rowId && item.page.id === clip.page);
      assert.ok(row, `${key} does not identify an eligible row without exampleId`);
    }

    const file = /^B1-(\d{2})-([12])-3\.mp3$/.exec(clip.file);
    assert.ok(file, `${key} has an invalid grammar track filename: ${clip.file}`);
    assert.equal(Number(file[1]), source.part.lessonId, `${key} track lesson does not match ${clip.page}`);
    assert.equal(Number(file[2]), source.part.partId, `${key} track part does not match ${clip.page}`);
    assert.ok(clip.start >= 0 && clip.start < clip.end, `${key} has invalid clip bounds`);
    assert.ok(clip.end - clip.start <= 15, `${key} clip exceeds 15 seconds`);
    if (clip.approved !== undefined) {
      const approval = approvals[key];
      assert.ok(approval, `${key} is marked approved without an approval entry`);
      assert.match(approval.approved, /^owner \d{4}-\d{2}-\d{2}$/, `${key} approval needs an owner date`);
      assert.equal(clip.approved, approval.approved, `${key} approval label does not match`);
      assert.deepEqual(
        { file: clip.file, start: clip.start, end: clip.end },
        { file: approval.file, start: approval.start, end: approval.end },
        `${key} approved clip does not match its approved file and bounds`,
      );
      assert.ok(clip.score >= 0.78, `${key} approved mean score is below threshold`);
      assert.ok(clip.minScore >= 0.3, `${key} approved minimum syllable score is below threshold`);
    } else {
      assert.ok(clip.score >= 0.85, `${key} mean score is below threshold`);
      assert.ok(clip.minScore >= 0.5, `${key} minimum syllable score is below threshold`);
    }
    assert.match(key, /^\p{Script=Han}+$/u, `${key} must contain Han only`);
    assert.equal(clip.onsets.length, [...key].length, `${key} needs one onset per Han character`);
    assert.ok(clip.onsets.every(Number.isFinite), `${key} has a non-finite onset`);
    assert.ok(clip.onsets.every((onset) => onset >= clip.start && onset <= clip.end), `${key} has an onset outside its clip`);
    for (let index = 1; index < clip.onsets.length; index += 1) {
      const gap = clip.onsets[index] - clip.onsets[index - 1];
      assert.ok(gap > 0, `${key} onsets must be strictly increasing`);
      assert.ok(gap <= 2.5, `${key} has an onset gap over 2.5 seconds`);
      if (gap > 0.9) {
        assert.ok(
          sentenceTurnBoundaries(source.text).has(index - 1),
          `${key} has an onset gap over 0.9 seconds without punctuation or a speaker change`,
        );
      }
    }

    const exported = clip.rowId !== undefined
      ? exportedRows.get(`${clip.page}:${clip.rowId}`)
      : exportedExamples.get(`${clip.page}:${clip.exampleId}`)?.text;
    assert.ok(exported, `${key} is missing from the exported grammar pack`);
    assert.deepEqual(exported.audio, {
      voice: 'book',
      file: clip.file,
      start: clip.start,
      end: clip.end,
    }, `${key} exported audio does not carry its grammar-track clip`);
  }
});
