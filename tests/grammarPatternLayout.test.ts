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

test('A clearly heaviest column becomes the single flexible track', () => {
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
  // The heavy subject column stretches; short neighbors size to their content.
  assert.equal(layout.flexColumnIndex, 0);
  assert.equal(layout.gridTemplateColumns, '1fr min-content min-content');
});

test('Near-equal columns share one flexible track each', () => {
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
  assert.equal(layout.gridTemplateColumns, '1fr 1fr 1fr');
});

test('A short one-character ending stays content-sized next to a heavy column', () => {
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

  assert.equal(layout.flexColumnIndex, 1);
  assert.equal(layout.gridTemplateColumns, 'min-content 1fr min-content');
});

test('Wide viewports spread tracks proportionally with content minimums', () => {
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
  assert.match(layout.gridTemplateColumns, /^minmax\(auto, 0\.\d+fr\) /);
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
  assert.equal(layout.gridTemplateColumns, '1fr');
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

test('Two-column layouts with one heavy side use one flexible track', () => {
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
  assert.equal(layout.flexColumnIndex, 1);
  assert.equal(layout.gridTemplateColumns, 'min-content 1fr');
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
  assert.equal(layout.isScrollable, false);
});

test('Five-column layouts opt into table-only horizontal scrolling', () => {
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
