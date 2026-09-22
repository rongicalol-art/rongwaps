export function segmentFill(currentIndex: number, startIndex: number, cardCount: number) {
  if (currentIndex < startIndex) return 0;
  if (currentIndex >= startIndex + cardCount - 1) return 100;
  return ((currentIndex - startIndex + 1) / cardCount) * 100;
}

export const PROGRESS_SPRING = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 32,
  mass: 0.7,
};

export const INTERACTION_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 28,
  mass: 0.55,
};

export type RailMotionTransition =
  | typeof INTERACTION_SPRING
  | typeof PROGRESS_SPRING
  | { duration: number };
