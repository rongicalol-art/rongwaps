import { useMemo, useState } from 'react';
import { AppIcon, SectionEyebrow } from '../../../../lib/widgets';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { useLevels } from '../../../../hooks/useLevels';
import { isPureVariantDefinition } from '../../../../utils/dictionaryDefinitions';
import { resolveLevel } from '../../../../utils/levels';
import { rankBuiltWith, type BuiltWithMember } from '../../utils/rankBuiltWith';
import { RAIL_CARD_CLASSES, SEE_ALL_CLASSES } from './railStyles';

/** At most this many characters are shown without a toggle. */
const ALWAYS_OPEN_MAX = 3;
const COLLAPSED_GLYPHS = 24;
/** Expanded view stops here so a part like 口 never mounts hundreds of glyphs. */
const EXPANDED_GLYPHS = 120;

/** One character of the strip; pure variants are hidden. */
function Glyph({ character, accentClassName, onOpen }: { character: string; accentClassName: string; onOpen: (character: string) => void }) {
  const { data, isLoading } = useCharBreakdownState(character);
  const gloss = data?.definition?.split(';')[0]?.trim() || '';
  if (!isLoading && gloss && isPureVariantDefinition(gloss)) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(character)}
      aria-label={`Open ${character}${gloss ? `, ${gloss}` : ''}`}
      className={`flex h-11 w-11 items-center justify-center rounded-compact font-chinese text-2xl leading-none ${accentClassName} transition-colors hover:bg-ui-hover focus-ring`}
    >
      {character}
    </button>
  );
}

/**
 * "Appears in 8 characters": every character built from the active one —
 * sound-alikes included, so the count is honest — as a quiet glyph-only strip
 * (it teaches shape, not sound). Course characters first, then the lowest
 * TOCFL level; tap one to open it. Closed by default; with three or fewer it
 * is just shown, since a toggle for one glyph is silly.
 */
export function AppearsInCard({ members, accentClassName, activeBookId, onOpen }: {
  members: BuiltWithMember[];
  activeBookId?: number;
  /** The active book's glyph tint, like every other reference row. */
  accentClassName: string;
  onOpen: (character: string) => void;
}) {
  const levels = useLevels();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ranked = useMemo(
    () => rankBuiltWith(members.map((member) => ({ ...member, grade: null })), (char) => resolveLevel(char, levels)?.level, activeBookId).shape,
    [members, levels, activeBookId],
  );
  if (ranked.length === 0) return null;
  const visible = ranked.slice(0, expanded ? EXPANDED_GLYPHS : COLLAPSED_GLYPHS);
  const alwaysOpen = ranked.length <= ALWAYS_OPEN_MAX;
  const shown = open || alwaysOpen;

  return (
    <div className={RAIL_CARD_CLASSES}>
      <SectionEyebrow
        title="Appears in"
        count={ranked.length}
        action={!alwaysOpen && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Hide characters' : 'Show characters'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover focus-ring"
          >
            <AppIcon name="expand" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      />
      {shown && (
        <div className="mt-1">
          <div className="flex flex-wrap gap-0.5">
            {visible.map((member) => <Glyph key={member.character} character={member.character} accentClassName={accentClassName} onOpen={onOpen} />)}
          </div>
          {ranked.length > COLLAPSED_GLYPHS && (
            <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className={`mt-1 ${SEE_ALL_CLASSES}`}>
              {expanded ? 'Show less' : `See all ${ranked.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
