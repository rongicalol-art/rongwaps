import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TEST_ALL_READINGS as ALL_READINGS,
  TEST_INTERACTIVE_GRAMMAR_PARTS as INTERACTIVE_GRAMMAR_PARTS,
} from './acceptance_helpers';
import { VOCABULARY_SENSE_RULES } from '../src/data/vocabularySenseRules';
import { parseVocabularyId } from '../src/utils/vocabularyId';
import { buildReaderStudyTargets } from '../src/screens/reader/utils/readerStudyTargets';

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  pos: string | null;
  audio: string | null;
}

const BOOK_ID = 1;
const bookReadings = ALL_READINGS.filter((reading) => reading.bookId === BOOK_ID);

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/vocabulary/book-1.json'), 'utf8'),
) as { items: VocabularyRow[] };

const vocabulary = pack.items.map((row) => {
  const location = parseVocabularyId(row.id);
  return {
    id: row.id,
    bookId: location?.bookId ?? BOOK_ID,
    lessonId: location?.lessonId ?? 0,
    partId: location?.partId ?? 1,
    front: row.traditional ?? '',
    back: row.meaning ?? '',
    traditional: row.traditional ?? undefined,
    simplified: row.simplified ?? undefined,
    pinyin: row.pinyin ?? '',
    pos: row.pos ?? undefined,
    audio: row.audio ?? undefined,
  };
});

/** Pack rows grouped by the surface the rules are keyed on. */
const surfaceKey = (row: VocabularyRow) => row.simplified || row.traditional || '';

test('every sense rule mirrors a real pack row and a duplicated surface', () => {
  const rowById = new Map(pack.items.map((row) => [row.id, row]));
  const surfaceCounts = new Map<string, number>();
  for (const row of pack.items) {
    const key = surfaceKey(row);
    if (!key || /[/（）()]/.test(key)) continue;
    surfaceCounts.set(key, (surfaceCounts.get(key) ?? 0) + 1);
  }

  for (const [id, rule] of Object.entries(VOCABULARY_SENSE_RULES)) {
    const row = rowById.get(id);
    assert.ok(row, `${id} has a sense rule but no pack row`);
    assert.equal(rule.surface, surfaceKey(row), `${id} surface should mirror the pack`);
    assert.equal(rule.lessonId, parseVocabularyId(row.id)?.lessonId, `${id} lesson should mirror the pack`);
    assert.equal(rule.meaning, row.meaning, `${id} meaning should mirror the pack`);
    assert.ok(
      (surfaceCounts.get(rule.surface) ?? 0) > 1,
      `${id} (${rule.surface}) has a sense rule but the surface is taught only once`,
    );
    if (rule.detected) {
      assert.ok(rule.detected.anyOf.length > 0, `${id} detected rule without evidence`);
      assert.ok(rule.detected.citation.length > 0, `${id} detected rule without a citation`);
    } else {
      assert.ok(rule.undetectable && rule.undetectable.length > 0, `${id} needs evidence or a reason`);
    }
  }
});

test('every duplicated surface has a rule for each of its taught senses', () => {
  const ruledIds = new Set(Object.keys(VOCABULARY_SENSE_RULES));
  const missing: string[] = [];
  const surfaceCounts = new Map<string, number>();
  for (const row of pack.items) {
    const key = surfaceKey(row);
    if (!key || /[/（）()]/.test(key)) continue;
    surfaceCounts.set(key, (surfaceCounts.get(key) ?? 0) + 1);
  }
  for (const row of pack.items) {
    const key = surfaceKey(row);
    if (!key || /[/（）()]/.test(key) || (surfaceCounts.get(key) ?? 0) < 2) continue;
    if (!ruledIds.has(row.id)) missing.push(row.id);
  }
  assert.deepEqual(missing, [], 'duplicated surfaces without a sense rule');
});

const senseFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/readerVocabularySense.json'), 'utf8'),
) as Record<string, { status: string; alternatives: string[] }>;

test('per-reading sense resolutions match the reviewed snapshot', () => {
  const actual: Record<string, { status: string; alternatives: string[] }> = {};
  for (const reading of bookReadings) {
    const targets = buildReaderStudyTargets({
      reading,
      parts: INTERACTIVE_GRAMMAR_PARTS,
      vocabulary,
    });
    for (const word of targets.targetWords) {
      if (!word.sense) continue;
      actual[`${reading.id}:${word.id}`] = {
        status: word.sense.status,
        alternatives: word.sense.alternatives.map((alternative) => alternative.id),
      };
    }
  }
  assert.deepEqual(actual, senseFixture);
});

test('sense statuses are one of the three honest states', () => {
  for (const entry of Object.values(senseFixture)) {
    assert.ok(['this', 'other', 'unclear'].includes(entry.status), entry.status);
  }
});
