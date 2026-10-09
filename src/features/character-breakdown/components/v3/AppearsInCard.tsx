import { useMemo, useState } from 'react';
import { useLevels } from '../../../../hooks/useLevels';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { rankBuiltWith, type BuiltWithMember } from '../../utils/rankBuiltWith';
import { ShowMoreButton } from './ShowMoreButton';
import { SoundRow } from './SoundRow';

const COLLAPSED_ROWS = 8;
/** Expanded view stops here so a part like 口 never mounts hundreds of rows. */
const EXPANDED_ROWS = 60;

/**
 * "Appears in 8 characters": every character built from the active one —
 * sound-alikes included, so the count is honest — as the same list rows as
 * the other tabs (character, pinyin over meaning, lesson or level). Course
 * characters first, then the lowest TOCFL level; tap one to open it.
 */
export function AppearsInCard({ members, activeBookId, onOpen }: {
  members: BuiltWithMember[];
  activeBookId?: number;
  onOpen: (character: string) => void;
}) {
  const levels = useLevels();
  const [expanded, setExpanded] = useState(false);
  const ranked = useMemo(
    () => rankBuiltWith(members.map((member) => ({ ...member, grade: null })), (char) => resolveLevel(char, levels)?.level, activeBookId).shape,
    [members, levels, activeBookId],
  );
  if (ranked.length === 0) return null;
  const visible = ranked.slice(0, expanded ? EXPANDED_ROWS : COLLAPSED_ROWS);

  return (
    <div className="min-w-0">
      <div className="flex flex-col">
        {visible.map((member) => <SoundRow key={member.character} member={member} onOpen={onOpen} />)}
      </div>
      {ranked.length > COLLAPSED_ROWS && (
        <ShowMoreButton label={expanded ? 'Show less' : `See all ${ranked.length}`} expanded={expanded} onClick={() => setExpanded((value) => !value)} />
      )}
    </div>
  );
}
