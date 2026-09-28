import assert from 'node:assert/strict';
import test from 'node:test';
import { TEST_INTERACTIVE_GRAMMAR_PARTS as INTERACTIVE_GRAMMAR_PARTS } from '../acceptance_helpers';
import { findNeighbourGrammarPart } from '../../src/utils/readingContext';
import type { InteractiveGrammarPage, InteractiveGrammarPart } from '../../src/types/models';
import {
  getPatternSectionLayout,
  grammarHeaderWeight,
  grammarHeaderWordCount,
} from '../../src/utils/grammarPatternLayout';

/**
 * Pattern-table headers are authored to read as a short 1-3 word title on one
 * line inside the narrowest mobile column (the compact `patternColumnDetails`
 * notation lives in the cell tooltip, never on a second line). These checks
 * keep that promise: a flat width cap and word cap for every label, plus a
 * layout-aware check that the label fits the column share it actually gets at
 * the table's mobile minimum width.
 */

const LABEL_MAX = 6;
const LABEL_WORDS_MAX = 3;
const DETAIL_MAX = 8;
/** Mobile minimum table widths from `GrammarPatternSection`. */
const MOBILE_TABLE_MIN_WIDTH = { wide: 340, narrow: 260 };
const CELL_PADDING_PX = 24;
const BODY_FONT_PX = 16;
/** Small tolerance so a borderline label does not fail on rounding. */
const BUDGET_TOLERANCE = 0.5;

interface TableUnderTest {
  location: string;
  page: Pick<InteractiveGrammarPage, 'patternColumns' | 'patternColumnDetails' | 'patternRows'> | {
    patternColumns?: string[];
    patternColumnDetails?: string[];
    patternRows?: InteractiveGrammarPage['patternRows'];
  };
}

function tablesForPart(part: InteractiveGrammarPart): TableUnderTest[] {
  return part.grammarPages.flatMap((page) => [
    {
      location: `${page.id} pattern table`,
      page: {
        patternColumns: page.patternColumns,
        patternColumnDetails: page.patternColumnDetails,
        patternRows: page.patternRows,
      },
    },
    ...(page.subsections ?? []).map((subsection) => ({
      location: `${page.id} subsection ${subsection.id}`,
      page: {
        patternColumns: subsection.patternColumns,
        patternColumnDetails: subsection.patternColumnDetails,
        patternRows: subsection.patternRows,
      },
    })),
  ]);
}

const bookTables = INTERACTIVE_GRAMMAR_PARTS
  .filter((part) => part.bookId === 1)
  .flatMap(tablesForPart);

test('every pattern-table header label stays within the one-line cap', () => {
  let labels = 0;
  for (const { location, page } of bookTables) {
    for (const [index, label] of (page.patternColumns ?? []).entries()) {
      labels += 1;
      assert.ok(label.trim(), `${location} column ${index + 1} needs a label`);
      assert.ok(
        grammarHeaderWeight(label) <= LABEL_MAX,
        `${location} column ${index + 1} label "${label}" is ${grammarHeaderWeight(label)} units; keep it to ${LABEL_MAX}`,
      );
    }
    for (const detail of page.patternColumnDetails ?? []) {
      assert.ok(
        grammarHeaderWeight(detail) <= DETAIL_MAX,
        `${location} detail "${detail}" is ${grammarHeaderWeight(detail)} units; keep it to ${DETAIL_MAX}`,
      );
    }
  }
  assert.ok(labels > 250, `expected the book tables to carry labels, found ${labels}`);
});

test('every pattern-table header label reads as a 1-3 word title', () => {
  for (const { location, page } of bookTables) {
    for (const [index, label] of (page.patternColumns ?? []).entries()) {
      const words = grammarHeaderWordCount(label);
      assert.ok(
        words > 0 && words <= LABEL_WORDS_MAX,
        `${location} column ${index + 1} label "${label}" is ${words} words; write a ${LABEL_WORDS_MAX}-word-or-shorter title`,
      );
      assert.ok(
        !label.startsWith('(') && !label.endsWith(')'),
        `${location} column ${index + 1} label "${label}" reads as a parenthetical note; write a plain title`,
      );
    }
  }
});

test('every label fits the column width it is given on mobile', () => {
  for (const { location, page } of bookTables) {
    const columns = page.patternColumns ?? [];
    const rows = page.patternRows ?? [];
    if (columns.length === 0 || rows.length === 0) continue;

    const layout = getPatternSectionLayout({
      patternColumns: columns,
      patternColumnDetails: page.patternColumnDetails,
      patternRows: rows,
      characterPreference: 'traditional',
      showPinyin: false,
    });
    const tableWidth = layout.sourceColumns.length >= 3
      ? MOBILE_TABLE_MIN_WIDTH.wide
      : MOBILE_TABLE_MIN_WIDTH.narrow;

    layout.sourceColumns.forEach((sourceIndex, index) => {
      const label = columns[sourceIndex] ?? '';
      if (!label) return;
      const budget = ((tableWidth - CELL_PADDING_PX) / BODY_FONT_PX) * layout.shares[index];
      assert.ok(
        grammarHeaderWeight(label) <= budget + BUDGET_TOLERANCE,
        `${location} label "${label}" (${grammarHeaderWeight(label)} units) exceeds its ${Math.round(budget * 10) / 10}-unit mobile column`,
      );
    });
  }
});

test('header text stays free of wrapping workarounds in the layout scorer', () => {
  // A wide header must not out-weigh far heavier Chinese cells beyond the
  // bounded range: the clamp keeps every column between 1 and 5 units.
  const layout = getPatternSectionLayout({
    patternColumns: ['Who / Thing', 'Action', 'Amount'],
    patternRows: [
      {
        id: 'row-1',
        subject: [{ id: 't1', traditional: '這一位新同學', pinyin: 'zhè yí wèi xīn tóngxué', meaning: 'this new classmate' }],
        grammar: [{ id: 't2', traditional: '是', pinyin: 'shì', meaning: 'is' }],
        complement: [{ id: 't3', traditional: '嗎', pinyin: 'ma', meaning: 'question' }],
        english: 'Is this new classmate…?',
      },
    ],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(layout.weights.every((weight) => weight >= 1 && weight <= 5));
});

test('keyboard part switching walks book order and stops at the ends', () => {
  const first = INTERACTIVE_GRAMMAR_PARTS[0];
  const second = INTERACTIVE_GRAMMAR_PARTS[1];
  const last = INTERACTIVE_GRAMMAR_PARTS[INTERACTIVE_GRAMMAR_PARTS.length - 1];

  assert.equal(findNeighbourGrammarPart(first.id, 'next', INTERACTIVE_GRAMMAR_PARTS)?.id, second.id);
  assert.equal(findNeighbourGrammarPart(second.id, 'previous', INTERACTIVE_GRAMMAR_PARTS)?.id, first.id);
  assert.equal(findNeighbourGrammarPart(first.id, 'previous', INTERACTIVE_GRAMMAR_PARTS), null);
  assert.equal(findNeighbourGrammarPart(last.id, 'next', INTERACTIVE_GRAMMAR_PARTS), null);
  assert.equal(findNeighbourGrammarPart('missing-part', 'next', INTERACTIVE_GRAMMAR_PARTS), null);
});
