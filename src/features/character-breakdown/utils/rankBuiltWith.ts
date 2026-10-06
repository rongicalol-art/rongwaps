import type { SoundGrade } from '../../../utils/parts';
import { bookRank } from '../../../utils/wordOrdering';

/** A character built from the active part, with where the learner meets it. */
export interface BuiltWithMember {
  character: string;
  /** Sound grade against the part; null when only the shape/meaning is shared. */
  grade: SoundGrade | null;
  bookId?: number;
  lessonId?: number;
}

export interface BuiltWithGroups<T extends BuiltWithMember> {
  /** Sound-alikes of the part (same, then tone, then close; pack order within a grade). */
  alike: T[];
  /** Characters that share the shape but not the sound. */
  shape: T[];
}

/**
 * Splits members into sound-alikes and shape-only, each ordered for display:
 * course characters first (current book, then 1-4), easiest TOCFL level first,
 * then lesson. Stable, so pack order breaks remaining ties.
 */
export function rankBuiltWith<T extends BuiltWithMember>(
  members: readonly T[],
  levelOf: (character: string) => number | undefined,
  activeBookId?: number | null,
): BuiltWithGroups<T> {
  const key = (member: T): [number, number, number, number] => [
    member.bookId === undefined ? 1 : 0,
    member.bookId === undefined ? 0 : bookRank(member.bookId, activeBookId),
    levelOf(member.character) ?? 99,
    member.lessonId ?? 0,
  ];
  const order = (a: T, b: T) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    return 0;
  };
  const alike = members.filter((member) => member.grade).sort(order);
  const shape = members.filter((member) => !member.grade).sort(order);
  return { alike, shape };
}

/** A sound family with every member tagged by course lesson (see `soundFamily`). */
export interface RankedSoundFamily {
  from?: { part: string; partRank?: { bookId: number; lessonId: number }; grade: SoundGrade; siblings: BuiltWithMember[] };
  lends: BuiltWithMember[];
}

export const GRADE_SEQUENCE: readonly SoundGrade[] = ['same', 'tone', 'close'];

/** Members split by sound grade (same, tone, close), each ranked like `rankBuiltWith`; empty grades dropped. */
export function groupByGrade<T extends BuiltWithMember>(
  members: readonly T[],
  levelOf: (character: string) => number | undefined,
  activeBookId?: number | null,
): Array<{ grade: SoundGrade; members: T[] }> {
  const { alike } = rankBuiltWith(members, levelOf, activeBookId);
  return GRADE_SEQUENCE
    .map((grade) => ({ grade, members: alike.filter((member) => member.grade === grade) }))
    .filter((group) => group.members.length > 0);
}
