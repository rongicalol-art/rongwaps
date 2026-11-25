export function currentItemProgress(currentIndex: number, totalCount: number) {
  if (totalCount <= 0) return 0;
  const clampedIndex = Math.min(totalCount - 1, Math.max(0, currentIndex));
  return ((clampedIndex + 1) / totalCount) * 100;
}

/** Minimum visible progress width expressed as a compositor scale. */
export function visibleProgressScale(progress: number, trackWidth: number, minimumWidth = 28): number {
  const fraction = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0)) / 100;
  if (fraction === 0 || trackWidth <= 0) return fraction;
  return Math.min(1, fraction + minimumWidth * (1 - fraction) / trackWidth);
}
