/**
 * The parts index (public/data/relations/parts.json): the single owner of the
 * "which characters are built from this part, and which of them sound like it"
 * rule. The pack stores only relations; pinyin, meaning, level and lesson are
 * derived at runtime from the data each screen already loads.
 *
 *   parents:  part → every learner-pool character built from it, sound-alikes
 *             first, each followed by an optional grade mark.
 *   phonetic: character → the part that gives it its sound (a graded part only).
 */

/** How well a sound part predicts a reading in modern Mandarin (far never ships). */
export type SoundGrade = 'same' | 'tone' | 'close';

/** One character built from a part; `grade` is null for shape/meaning-only links. */
export interface PartMember {
  character: string;
  grade: SoundGrade | null;
}

export interface PartsIndex {
  parents: Map<string, PartMember[]>;
  phonetic: Map<string, string>;
}

export const GRADE_MARKS: Record<SoundGrade, string> = { same: '=', tone: '~', close: '≈' };

const MARK_TO_GRADE = new Map<string, SoundGrade>(
  (Object.entries(GRADE_MARKS) as Array<[SoundGrade, string]>).map(([grade, mark]) => [mark, grade]),
);

/** Display order of grades: sound-alikes (same, tone, close) before shape-only. */
export const GRADE_ORDER: Record<SoundGrade, number> = { same: 0, tone: 1, close: 2 };

/** Parses a `parents` value ("碼=螞=嗎~媽~罵~騎驗") into its members, keeping order. */
export function parseMembers(value: string): PartMember[] {
  const members: PartMember[] = [];
  for (const symbol of Array.from(value)) {
    const grade = MARK_TO_GRADE.get(symbol);
    if (grade) {
      const last = members[members.length - 1];
      if (last) last.grade = grade;
    } else {
      members.push({ character: symbol, grade: null });
    }
  }
  return members;
}

/** Inverse of `parseMembers`. */
export function formatMembers(members: readonly PartMember[]): string {
  return members.map((member) => member.character + (member.grade ? GRADE_MARKS[member.grade] : '')).join('');
}

/** The sound clue of a character that borrows its sound from a part (媽 ← 馬). */
export interface SoundClue {
  part: string;
  /** How well the part predicts this character's sound. */
  grade: SoundGrade;
  /** Other characters that share the part's sound, graded against the part. */
  siblings: Array<{ character: string; grade: SoundGrade }>;
}

/** Characters built from `part`, sound-alikes first ("gives" / "Built with"). */
export function builtWith(part: string, index: PartsIndex): PartMember[] {
  return index.parents.get(part) ?? [];
}

/** "Gets" mode: the part this character sounds like and its sound-alike siblings, or null. */
export function resolveSoundClue(char: string, index: PartsIndex): SoundClue | null {
  const part = index.phonetic.get(char);
  if (!part) return null;
  const members = builtWith(part, index);
  const grade = members.find((member) => member.character === char)?.grade;
  if (!grade) return null;
  const siblings = members.flatMap((member) => (
    member.grade && member.character !== char ? [{ character: member.character, grade: member.grade }] : []
  ));
  return { part, grade, siblings };
}

/** Sound-alike members of a part's family ("gives" mode), in pack order. */
export function soundAlikes(members: readonly PartMember[]): Array<{ character: string; grade: SoundGrade }> {
  return members.flatMap((member) => (member.grade ? [{ character: member.character, grade: member.grade }] : []));
}

/** A part must lend its sound to at least this many characters to count as a family (大 → 馱 alone is an accident). */
export const MIN_FAMILY_SIZE = 2;

/**
 * The sound family around a character, centred on the part that carries the
 * sound:
 *   from  — the part it borrows its sound from (嗎 ← 馬) and the other
 *           characters that borrow it too (媽 碼 螞 罵); siblings may be empty.
 *   lends — the characters that borrow this character's own sound (馬 → 嗎 媽 …);
 *           empty below MIN_FAMILY_SIZE. That single borrower still shows on its
 *           own page as "from".
 * A character can have both (星 ← 生, 星 → 猩 腥 醒). Null when it has neither.
 */
export interface SoundFamily {
  from?: SoundClue;
  lends: Array<{ character: string; grade: SoundGrade }>;
}

export function soundFamily(char: string, index: PartsIndex): SoundFamily | null {
  const from = resolveSoundClue(char, index) ?? undefined;
  const borrowers = soundAlikes(builtWith(char, index));
  const lends = borrowers.length >= MIN_FAMILY_SIZE ? borrowers : [];
  return from || lends.length > 0 ? { from, lends } : null;
}
