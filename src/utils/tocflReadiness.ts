import { tocflBand } from './levels';

/**
 * TOCFL readiness from local learning state: how many TBCL characters per
 * TOCFL band the learner already knows (a character is known once a passed
 * course word contains it), and how far the focus band is from its 90% goal.
 */
export type TocflBand = 'A' | 'B' | 'C';

export interface BandProgress {
  band: TocflBand;
  known: number;
  total: number;
}

export interface TocflReadiness {
  bands: BandProgress[];
  /** Lowest band not yet 90% known (C once everything is). */
  focusBand: TocflBand;
  /** Characters still to learn for the focus band to reach 90% known (0 once there). */
  focusToGo: number;
}

export interface ReadinessCourseCard {
  id: string;
  front: string;
  bookId: number;
  lessonId: number;
}

const BANDS: TocflBand[] = ['A', 'B', 'C'];
/** A band counts as done at 90% known; the lowest band below it is the focus. */
export const FOCUS_THRESHOLD = 0.9;

export function computeTocflReadiness(
  tbclChars: Map<string, number>,
  courseCards: ReadinessCourseCard[],
  learnedCardIds: Iterable<string>,
): TocflReadiness {
  const learned = new Set(learnedCardIds);
  const known = new Set<string>();
  for (const card of courseCards) {
    if (learned.has(card.id)) for (const char of card.front) known.add(char);
  }

  const bands = BANDS.map((band) => ({ band, known: 0, total: 0 }));
  for (const [char, level] of tbclChars) {
    const progress = bands[BANDS.indexOf(tocflBand(level))];
    progress.total += 1;
    if (known.has(char)) progress.known += 1;
  }
  const focus = bands.find((b) => b.total > 0 && b.known / b.total < FOCUS_THRESHOLD) ?? bands[bands.length - 1];

  const focusToGo = Math.max(0, Math.ceil(focus.total * FOCUS_THRESHOLD) - focus.known);

  return { bands, focusBand: focus.band, focusToGo };
}
