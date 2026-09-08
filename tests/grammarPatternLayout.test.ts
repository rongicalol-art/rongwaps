import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrammarWordToken } from '../src/types/models';
import {
  getDisplayText,
  getPatternColumnWeights,
  getPatternSectionLayout,
} from '../src/utils/grammarPatternLayout';

/** Counts tracks in a `grid-template-columns` value (each track contains one `minmax(`/`fit-content(`/`1fr`). */
function gridTemplateTrackCount(template: string): number {
  return template.split(' ').filter((token) => token.endsWith('fr)') || token.endsWith('fr') || token.endsWith('rem)')).length;
}

function token(overrides: Partial<GrammarWordToken>): GrammarWordToken {
  return {
    id: 't',
    traditional: '字',
    pinyin: 'zì',
    meaning: 'word',
    ...overrides,
  };
}

const group = (texts: string[]) => texts.map((text, index) => token({
  id: `t${index}-${text}`,
  traditional: text,
  pinyin: 'pinyin',
  meaning: 'word',
}));

function row(overrides: Partial<{
  subject: GrammarWordToken[];
  grammar: GrammarWordToken[];
  complement: GrammarWordToken[];
  columns: GrammarWordToken[][];
}> = {}) {
  return {
    id: 'row',
    subject: group(['她']),
    grammar: group(['是']),
    complement: group(['嗎']),
    english: 'Example meaning.',
    ...overrides,
  };
}

test('Three short groups produce approximately balanced weights', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['她']), group(['是']), group(['嗎'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.deepEqual(weights, [1, 1, 1]);
});

test('A long subject receives more space than short neighbors', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['辦公室', '的', '同事']), group(['是']), group(['嗎'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(weights[0] > weights[1]);
  assert.ok(weights[0] > weights[2]);
  assert.equal(weights[1], 1);
});

test('A long middle phrase receives more space', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['她']), group(['在', '辦公室', '工作', '了']), group(['嗎'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(weights[1] > weights[0]);
  assert.ok(weights[1] > weights[2]);
});

test('A long complement receives more space', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['她']), group(['是']), group(['一位', '非常', '認真的', '老師'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(weights[2] > weights[0]);
  assert.ok(weights[2] > weights[1]);
});

test('Empty columns are omitted', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['她']), [], group(['嗎'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.deepEqual(weights, [1, 1]);
});

test('All weights remain within the clamp', () => {
  const longSentence = Array.from({ length: 40 }, (_, index) => token({
    id: `long-${index}`,
    traditional: '很',
    pinyin: 'hěn',
    meaning: 'word',
  }));
  const weights = getPatternColumnWeights({
    groups: [longSentence, group(['是']), group(['嗎'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(weights.every((weight) => weight >= 1 && weight <= 5));
  assert.equal(weights[0], 5);
});

test('Traditional and simplified variants can produce different weights', () => {
  const traditional = group(['辦公室']);
  const withSimplified = [token({ id: 't-offices', traditional: '辦公室', simplified: '办公' })];
  assert.equal(getPatternColumnWeights({
    groups: [traditional],
    characterPreference: 'traditional',
    showPinyin: false,
  })[0], 3);
  assert.equal(getPatternColumnWeights({
    groups: [withSimplified],
    characterPreference: 'simplified',
    showPinyin: false,
  })[0], 2);
});

test('Punctuation such as 呢？ stays with its phrase', () => {
  const weights = getPatternColumnWeights({
    groups: [group(['你']), group(['累']), group(['嗎', '呢？'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  assert.ok(weights[2] > weights[0]);
  const text = getDisplayText(token({ traditional: '呢', suffix: '？' }), 'traditional');
  assert.equal(text, '呢？');
});

test('Pinyin extends a column when shown', () => {
  const withoutPinyin = getPatternColumnWeights({
    groups: [group(['中明']), group(['是'])],
    characterPreference: 'traditional',
    showPinyin: false,
  });
  const withPinyin = getPatternColumnWeights({
    groups: [
      [token({ id: 'zm', traditional: '中明', pinyin: 'Zhōngmíng' })],
      group(['是']),
    ],
    characterPreference: 'traditional',
    showPinyin: true,
  });
  assert.ok(withPinyin[0] > withoutPinyin[0]);
});

test('A clearly heaviest column receives proportionally more share without starving neighbors', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who', 'Action', 'What'],
    patternRows: [
      row(),
      row({
        subject: group(['我明天下午要去圖書館']),
        grammar: group(['和我的朋友一起']),
      }),
    ],
    characterPreference: 'traditional',
    showPinyin: true,
  });

  assert.deepEqual(layout.sourceColumns, [0, 1, 2]);
  assert.equal(layout.weights.length, 3);
  assert.ok(layout.weights.every((weight) => weight >= 1 && weight <= 5));
  assert.ok(layout.weights[0] > layout.weights[2]);
  // The heavy subject column receives more share, bounded within [0.20, 0.60].
  assert.ok(layout.shares[0] > layout.shares[2]);
  assert.ok(layout.shares[0] >= 0.38);
  assert.ok(layout.shares[2] >= 0.20);
  assert.match(layout.gridTemplateColumns, /^minmax\(0, 0\.\d+fr\)/);
  assert.equal(layout.flexColumnIndex, null);
});

test('Near-equal columns share balanced proportional tracks', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Time', 'Not word', 'Action'],
    patternRows: [
      row({ subject: group(['她']), grammar: group(['是']), complement: group(['嗎']) }),
      row({ subject: group(['你']), grammar: group(['是']), complement: group(['嗎']) }),
    ],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.equal(layout.flexColumnIndex, null);
  assert.match(layout.gridTemplateColumns, /^minmax\(0, 0\.\d+fr\)/);
  assert.ok(Math.abs(layout.shares[0] - layout.shares[1]) < 0.05);
  assert.ok(Math.abs(layout.shares[1] - layout.shares[2]) < 0.05);
});

test('A short one-character ending stays bounded next to a heavy column', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who or what', 'Rest of the sentence', '嗎'],
    patternColumnDetails: ['S', 'keep the order', 'question ending'],
    patternRows: [
      {
        id: 'r1',
        subject: [token({ id: 'he', traditional: '他', pinyin: 'tā' })],
        grammar: [
          token({ id: 'is', traditional: '是', pinyin: 'shì' }),
          token({ id: 'tw', traditional: '臺灣', pinyin: 'Táiwān' }),
          token({ id: 'ren', traditional: '人', pinyin: 'rén' }),
        ],
        complement: [token({ id: 'ma1', traditional: '嗎', pinyin: 'ma' })],
        english: 'Is he Taiwanese?',
      },
      {
        id: 'r2',
        subject: [token({ id: 'she', traditional: '她', pinyin: 'tā' })],
        grammar: [token({ id: 'pretty', traditional: '漂亮', pinyin: 'piàoliang' })],
        complement: [token({ id: 'ma2', traditional: '嗎', pinyin: 'ma' })],
        english: 'Is she pretty?',
      },
    ],
    characterPreference: 'traditional',
    showPinyin: true,
  });

  assert.equal(layout.flexColumnIndex, null);
  assert.ok(layout.shares[1] > layout.shares[2]);
  assert.ok(layout.shares[2] >= 0.20);
  assert.match(layout.gridTemplateColumns, /^minmax\(0, 0\.\d+fr\)/);
});

test('Proportional tracks maintain bounded shares summing to 1', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who or what', 'Rest of the sentence', '嗎'],
    patternColumnDetails: ['S', 'keep the order', 'question ending'],
    patternRows: [
      {
        id: 'r1',
        subject: [token({ id: 'he', traditional: '他', pinyin: 'tā' })],
        grammar: [
          token({ id: 'is', traditional: '是', pinyin: 'shì' }),
          token({ id: 'tw', traditional: '臺灣', pinyin: 'Táiwān' }),
          token({ id: 'ren', traditional: '人', pinyin: 'rén' }),
        ],
        complement: [token({ id: 'ma1', traditional: '嗎', pinyin: 'ma' })],
        english: 'Is he Taiwanese?',
      },
      {
        id: 'r2',
        subject: [token({ id: 'she', traditional: '她', pinyin: 'tā' })],
        grammar: [token({ id: 'pretty', traditional: '漂亮', pinyin: 'piàoliang' })],
        complement: [token({ id: 'ma2', traditional: '嗎', pinyin: 'ma' })],
        english: 'Is she pretty?',
      },
    ],
    characterPreference: 'traditional',
    showPinyin: true,
    sideColumnSizing: 'proportional',
  });

  assert.equal(layout.flexColumnIndex, null);
  assert.match(layout.gridTemplateColumns, /^minmax\(0, 0\.\d+fr\) /);
  assert.equal(gridTemplateTrackCount(layout.gridTemplateColumns), 3);
  assert.ok(Math.abs(layout.shares.reduce((sum, share) => sum + share, 0) - 1) < 0.002);
});

test('Globally empty columns are removed', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who', 'Action', 'What'],
    patternRows: [row({ grammar: [], complement: [] })],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.deepEqual(layout.sourceColumns, [0]);
  assert.equal(layout.weights.length, 1);
  assert.equal(layout.gridTemplateColumns, 'minmax(0, 1fr)');
});

test('Locally empty cells preserve the shared column position', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who', 'Action', 'What'],
    patternRows: [
      row({ grammar: [] }),
      row(),
    ],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.deepEqual(layout.sourceColumns, [0, 1, 2]);
  assert.equal(layout.weights.length, 3);
});

test('Two-column layouts distribute bounded proportional shares', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Adjustment', 'Action'],
    patternRows: [row({
      columns: [
        [token({ id: 'more', traditional: '多', pinyin: 'duō' })],
        [token({ id: 'drink', traditional: '喝熱茶', pinyin: 'hē rè chá' })],
      ],
      complement: [],
    })],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.deepEqual(layout.sourceColumns, [0, 1]);
  assert.equal(layout.flexColumnIndex, null);
  assert.ok(layout.shares[1] > layout.shares[0]);
  assert.ok(layout.shares[0] >= 0.35);
  assert.ok(layout.shares[1] <= 0.65);
  assert.match(layout.gridTemplateColumns, /^minmax\(0, 0\.\d+fr\) minmax\(0, 0\.\d+fr\)$/);
});

test('Extended four-column layouts remain finite and bounded', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['Who', 'Time', 'Action', 'What'],
    patternRows: [row({
      columns: [group(['她']), group(['明天']), group(['去']), group(['圖書館'])],
    })],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.deepEqual(layout.sourceColumns, [0, 1, 2, 3]);
  assert.ok(layout.weights.every((weight) => Number.isFinite(weight) && weight >= 1 && weight <= 5));
  assert.equal(layout.isScrollable, true);
});

test('Three or more columns opt into scrollable table layout', () => {
  const layout = getPatternSectionLayout({
    patternColumns: ['A', 'B', 'C', 'D', 'E'],
    patternRows: [row({
      columns: [group(['一']), group(['二']), group(['三']), group(['四']), group(['五'])],
    })],
    characterPreference: 'traditional',
    showPinyin: false,
  });

  assert.equal(layout.sourceColumns.length, 5);
  assert.equal(layout.isScrollable, true);
});

test('Lesson 3 Grammar 4 defines 3 sequential subsections for continuous scrolling', async () => {
  const { LESSON_THREE_GRAMMAR_FOUR } = await import('../src/data/grammar/lessonThreePartTwo');
  assert.ok(LESSON_THREE_GRAMMAR_FOUR.subsections);
  assert.equal(LESSON_THREE_GRAMMAR_FOUR.subsections.length, 3);

  const [part1, part2, part3] = LESSON_THREE_GRAMMAR_FOUR.subsections;

  // Part 1: Vs + 的 + 名詞
  assert.equal(part1.sectionNumber, 1);
  assert.ok(part1.title);
  assert.ok(part1.explanation);
  assert.ok(part1.patternColumns && part1.patternColumns.length > 0);
  assert.ok(part1.patternRows && part1.patternRows.length > 0);
  assert.ok(part1.exampleIds && part1.exampleIds.length > 0);

  // Part 2: 單音節 Vs + 名詞 (省略 的)
  assert.equal(part2.sectionNumber, 2);
  assert.ok(part2.title);
  assert.ok(part2.explanation);
  assert.ok(part2.patternColumns && part2.patternColumns.length > 0);
  assert.ok(part2.patternRows && part2.patternRows.length > 0);
  assert.ok(part2.exampleIds && part2.exampleIds.length > 0);

  // Part 3: Dropping the Noun
  assert.equal(part3.sectionNumber, 3);
  assert.ok(part3.title);
  assert.ok(part3.explanation);
  assert.deepEqual(part3.patternColumns, ['Adjective', '的', '(Noun Dropped)']);
  assert.equal(part3.patternRows?.[0].english, 'big cakes');
  assert.ok(part3.exampleIds && part3.exampleIds.length > 0);
});

test('Every Lesson 3 Grammar 4 subsection example ID resolves to a valid example in root examples', async () => {
  const { LESSON_THREE_GRAMMAR_FOUR } = await import('../src/data/grammar/lessonThreePartTwo');
  const rootExampleIds = new Set(LESSON_THREE_GRAMMAR_FOUR.examples.map((e) => e.id));

  for (const subsection of LESSON_THREE_GRAMMAR_FOUR.subsections ?? []) {
    assert.ok(subsection.exampleIds && subsection.exampleIds.length > 0);
    for (const id of subsection.exampleIds) {
      assert.ok(rootExampleIds.has(id), `Example ID ${id} not found in root examples`);
    }
  }
});

test('Pattern layout resolves correctly for all subsections in Lesson 3 Grammar 4', async () => {
  const { LESSON_THREE_GRAMMAR_FOUR } = await import('../src/data/grammar/lessonThreePartTwo');

  for (const subsection of LESSON_THREE_GRAMMAR_FOUR.subsections ?? []) {
    const layout = getPatternSectionLayout({
      patternColumns: subsection.patternColumns ?? [],
      patternColumnDetails: subsection.patternColumnDetails,
      patternRows: subsection.patternRows ?? [],
      characterPreference: 'traditional',
      showPinyin: true,
      sideColumnSizing: 'proportional',
    });

    assert.ok(layout.gridTemplateColumns);
    assert.ok(layout.sourceColumns.length > 0);
    assert.equal(layout.sourceColumns.length, (subsection.patternColumns ?? []).length);
  }
});

