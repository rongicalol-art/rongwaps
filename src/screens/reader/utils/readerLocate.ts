/**
 * Shared vocabulary for the Study Guide's locate behavior: hovering (desktop)
 * or long-pressing (mobile) a word or grammar row highlights its place in the
 * reading text.
 */

/** How a Study Guide row targets its place in the reading text. */
export type ReaderLocateMode = 'hover' | 'tap';

/** A character range inside one reading paragraph. */
export interface ReaderLocatedRange {
  paragraphIndex: number;
  charStart: number;
  charEnd: number;
}

export function rangeOverlaps(a: ReaderLocatedRange, b: ReaderLocatedRange): boolean {
  return (
    a.paragraphIndex === b.paragraphIndex &&
    a.charStart < b.charEnd &&
    a.charEnd > b.charStart
  );
}

export function overlapsAnyLocatedRange(
  range: ReaderLocatedRange,
  others: readonly ReaderLocatedRange[],
): boolean {
  return others.some((other) => rangeOverlaps(range, other));
}
