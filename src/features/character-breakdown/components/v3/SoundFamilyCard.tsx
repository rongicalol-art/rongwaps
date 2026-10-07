import { useMemo, useState } from 'react';
import { SectionEyebrow } from '../../../../lib/widgets';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { groupByGrade, type BuiltWithMember, type RankedSoundFamily } from '../../utils/rankBuiltWith';
import { RAIL_CARD_CLASSES, SEE_ALL_CLASSES } from './railStyles';
import { SoundRow } from './SoundRow';

const COLLAPSED_ROWS = 5;
/** Expanded view stops here so a big family never mounts hundreds of rows. */
const EXPANDED_ROWS = 40;

/**
 * "Sound family": only the sound, as the same reference rows used by "In
 * words". For a character that borrows its sound the family is its sound part
 * followed by the characters that borrow it too (馬, 碼, 螞, 媽, 罵); for a
 * sound part it is the characters that borrow it. No explanatory text — the
 * rows carry pinyin, meaning and lesson. Order: same sound, new tone, close.
 * Every character built from the part (shape included) lives in `AppearsInCard`.
 */
export function SoundFamilyCard({ family, accentClassName, activeBookId, onOpen }: {
  family: RankedSoundFamily;
  activeBookId?: number;
  accentClassName: string;
  onOpen: (character: string) => void;
}) {
  const levels = useLevels();
  const [expanded, setExpanded] = useState(false);
  const { from } = family;
  const { siblings, lends } = useMemo(() => {
    const levelOf = (char: string) => resolveLevel(char, levels)?.level;
    const flatten = (members: readonly BuiltWithMember[]) => groupByGrade(members, levelOf, activeBookId).flatMap((group) => group.members);
    return { siblings: flatten(from?.siblings ?? []), lends: flatten(family.lends) };
  }, [from, family.lends, levels, activeBookId]);

  // The family includes its sound part (馬, then 碼 螞 媽 罵), so no sentence has to explain it.
  const partRow = useMemo<BuiltWithMember[]>(
    () => (from ? [{ character: from.part, grade: null, ...from.partRank }] : []),
    [from],
  );
  const total = partRow.length + siblings.length + lends.length;
  let budget = expanded ? EXPANDED_ROWS : COLLAPSED_ROWS;
  const take = (members: BuiltWithMember[]) => {
    const shown = members.slice(0, Math.max(0, budget));
    budget -= shown.length;
    return shown;
  };
  const shownFrom = take([...partRow, ...siblings]);
  const shownLends = take(lends);
  const rows = (members: BuiltWithMember[]) => members.map((member) => (
    <SoundRow key={member.character} member={member} accentClassName={accentClassName} onOpen={onOpen} />
  ));

  return (
    <div className={RAIL_CARD_CLASSES}>
      <SectionEyebrow title="Sound family" />

      {shownFrom.length > 0 && <div className="mt-1">{rows(shownFrom)}</div>}

      {/* No heading: under "Sound family" the rows are the characters that sound like this one. */}
      {lends.length > 0 && (
        <div className={from ? 'mt-2 border-t-2 border-ui-divider pt-2' : 'mt-1'}>{rows(shownLends)}</div>
      )}

      {total > COLLAPSED_ROWS && (
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className={`mt-2 ${SEE_ALL_CLASSES}`}>
          {expanded ? 'Show less' : `See all ${total}`}
        </button>
      )}
    </div>
  );
}
