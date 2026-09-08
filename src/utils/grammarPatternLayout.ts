import type { GrammarPatternRow, GrammarWordToken } from '../types/models';

export interface PatternColumnWeightOptions {
  groups: GrammarWordToken[][];
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
}

const CJK_WEIGHT = 1;
const LATIN_WEIGHT = 0.45;
const PINYIN_WEIGHT = 0.45;
const MIN_WEIGHT = 1;
const MAX_WEIGHT = 5;


function isCjk(char: string): boolean {
  return /[\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(char);
}

function textScore(text: string): number {
  let score = 0;
  for (const char of text) {
    if (/\s/.test(char)) continue;
    if (isCjk(char)) {
      score += CJK_WEIGHT;
    } else if (/[,.!?;:，。！？；：·]/.test(char)) {
      score += LATIN_WEIGHT * 0.75;
    } else {
      score += LATIN_WEIGHT;
    }
  }
  return Math.round(score * 10) / 10;
}

export function getDisplayText(
  token: GrammarWordToken,
  characterPreference: 'traditional' | 'simplified',
): string {
  const base = characterPreference === 'simplified' && token.simplified
    ? token.simplified
    : token.traditional;
  return `${token.prefix ?? ''}${base}${token.suffix ?? ''}`;
}

function groupScore(
  tokens: GrammarWordToken[],
  characterPreference: 'traditional' | 'simplified',
  showPinyin: boolean,
): number {
  let score = 0;
  for (const token of tokens) {
    for (const char of getDisplayText(token, characterPreference)) {
      if (char === ' ') continue;
      score += isCjk(char) ? CJK_WEIGHT : LATIN_WEIGHT;
    }
  }
  if (showPinyin && tokens.length > 0) {
    const longestPinyin = Math.max(...tokens.map((token) => token.pinyin.length));
    score = Math.max(score, longestPinyin * PINYIN_WEIGHT);
  }
  return Math.round(score * 10) / 10;
}

/**
 * Relative content weight of one column group, clamped so a single very long
 * sentence cannot push its weight past the bounded range.
 */
export function getPatternColumnWeights({
  groups,
  characterPreference,
  showPinyin,
}: PatternColumnWeightOptions): number[] {
  return groups
    .filter((group) => group.length > 0)
    .map((group) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, groupScore(group, characterPreference, showPinyin))));
}

export interface PatternSectionLayoutOptions {
  patternColumns: string[];
  patternColumnDetails?: Array<string | undefined>;
  patternRows: GrammarPatternRow[];
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  /**
   * How columns are distributed next to the content sizing:
   * - `min-content` (narrow viewports): a single flexible `1fr` track absorbs
   *   all leftover space and its neighbors hug their content, so a
   *   one-character slot never stretches and the table fills its card.
   * - `proportional` (wide viewports): every track gets a content-weighted
   *   `fr` share with a content-based minimum, so the table fills its card
   *   proportionally instead of one column ballooning past its content.
   */
  sideColumnSizing?: 'min-content' | 'proportional';
}

export interface PatternSectionLayout {
  /** Original indexes retained so empty cells never shift later grammar slots. */
  sourceColumns: number[];
  /** Bounded content weights per column (longest visible content incl. heading). */
  weights: number[];
  /** Bounded proportional shares per column (sum ≈ 1); content weights normalized. */
  shares: number[];
  /**
   * One shared adaptive template. The legend and every row resolve this
   * identically because they live in one shared grid.
   */
  gridTemplateColumns: string;
  /** Source-column index of the single flexible track, or null when none. */
  flexColumnIndex: number | null;
  isScrollable: boolean;
}

function clampShares(rawWeights: number[]): number[] {
  if (rawWeights.length === 0) return [];
  if (rawWeights.length === 1) return [1];

  const count = rawWeights.length;
  const minShare = count === 2 ? 0.35 : count === 3 ? 0.2 : count === 4 ? 0.16 : 0.12;
  const maxShare = count === 2 ? 0.65 : count === 3 ? 0.60 : count === 4 ? 0.52 : 0.40;
  const rawTotal = rawWeights.reduce((total, weight) => total + weight, 0);
  const normalized = rawWeights.map((weight) => weight / rawTotal);
  const shares = Array<number>(count).fill(0);
  const remaining = new Set(normalized.map((_, index) => index));
  let remainingShare = 1;

  while (remaining.size > 0) {
    const remainingWeight = [...remaining].reduce((total, index) => total + normalized[index], 0);
    let changed = false;

    for (const index of remaining) {
      const proposed = (normalized[index] / remainingWeight) * remainingShare;
      if (proposed < minShare) {
        shares[index] = minShare;
        remainingShare -= minShare;
        remaining.delete(index);
        changed = true;
      } else if (proposed > maxShare) {
        shares[index] = maxShare;
        remainingShare -= maxShare;
        remaining.delete(index);
        changed = true;
      }
    }

    if (!changed) {
      for (const index of remaining) {
        shares[index] = (normalized[index] / remainingWeight) * remainingShare;
      }
      break;
    }
  }

  // Ensure total sum is strictly 1.0
  const sum = shares.reduce((total, share) => total + share, 0);
  if (sum > 0 && Math.abs(sum - 1) > 0.0001) {
    return shares.map((share) => Math.round((share / sum) * 1000) / 1000);
  }

  return shares.map((share) => Math.round(share * 1000) / 1000);
}

function getSectionColumnScore(
  columnGroups: GrammarWordToken[][],
  label: string,
  detail: string | undefined,
  characterPreference: 'traditional' | 'simplified',
  showPinyin: boolean,
): number {
  const contentScore = columnGroups.length === 0
    ? 0
    : Math.max(...columnGroups.map((group) => group.length > 0
      ? groupScore(group, characterPreference, showPinyin)
      : 0));
  // English headers wrap across lines; score by segments/words rather than total length
  // so compound English titles (e.g. "What is there / Second Action") do not artificially
  // dominate over the Chinese text weights.
  const words = label.split(/[\s/]+/).filter(Boolean);
  const longestLabelWord = words.length > 0
    ? Math.max(...words.map((w) => textScore(w)))
    : 0;
  const headerScore = Math.min(longestLabelWord * 0.8, textScore(label) * 0.25)
    + (detail ? Math.min(textScore(detail) * 0.15, 1) : 0);
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, contentScore, headerScore));
}

export function getPatternRowGroups(row: GrammarPatternRow): GrammarWordToken[][] {
  return row.columns ?? [row.subject, row.grammar, row.complement];
}

/**
 * Builds one adaptive template for the legend and every row in a pattern
 * section. Column weights come from the longest visible content in each
 * source column (Chinese text, attached punctuation, pinyin, and the slot
 * heading). Proportional shares are used across all viewports to guarantee
 * balanced column distribution without starving narrow columns or blowing
 * out wide ones.
 */
export function getPatternSectionLayout({
  patternColumns,
  patternColumnDetails = [],
  patternRows,
  characterPreference,
  showPinyin,
}: PatternSectionLayoutOptions): PatternSectionLayout {
  const sourceColumnCount = Math.max(
    patternColumns.length,
    ...patternRows.map((row) => getPatternRowGroups(row).length),
    1,
  );
  const sourceColumns = Array.from({ length: sourceColumnCount }, (_, index) => index)
    .filter((index) => patternRows.some((row) => getPatternRowGroups(row)[index]?.length > 0));
  const safeSourceColumns = sourceColumns.length > 0 ? sourceColumns : [0];
  const weights = safeSourceColumns.map((sourceIndex) => getSectionColumnScore(
    patternRows
      .map((row) => getPatternRowGroups(row)[sourceIndex] ?? [])
      .filter((group) => group.length > 0),
    patternColumns[sourceIndex] ?? '',
    patternColumnDetails[sourceIndex],
    characterPreference,
    showPinyin,
  ));
  const shares = clampShares(weights);
  const gridTemplateColumns = shares.map((share) => `minmax(0, ${share}fr)`).join(' ');

  return {
    sourceColumns: safeSourceColumns,
    weights,
    shares,
    gridTemplateColumns,
    flexColumnIndex: null,
    isScrollable: safeSourceColumns.length >= 3,
  };
}
