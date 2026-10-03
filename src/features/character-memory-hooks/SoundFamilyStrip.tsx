import { cn } from '../../utils/cn';
import type { SoundHookEntry } from '../../services/contentPacks';

export interface SoundFamilyStripProps {
  family: SoundHookEntry['family'];
  /** Book accent edge color for the tile borders. */
  edgeHex?: string;
  /** Optional: opens a family member in the dictionary. */
  onGlyphClick?: (glyph: string) => void;
  /** Optional text label before tiles. Defaults to false. */
  showLabel?: boolean;
  className?: string;
}

/**
 * The character's sound family as compact tactile tiles, paired visually
 * (book-accent border) with the highlighted sound component in the breakdown tree.
 * Renders nothing when empty.
 */
export function SoundFamilyStrip({ family, edgeHex, onGlyphClick, showLabel = false, className }: SoundFamilyStripProps) {
  if (family.length === 0) return null;

  const tileStyle = edgeHex ? { borderColor: edgeHex } : undefined;

  return (
    <div
      role="group"
      aria-label="Sound family"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {showLabel && (
        <span className="text-[10px] font-black uppercase tracking-wider text-ui-muted-strong">
          Sound family
        </span>
      )}
      {family.map((member) => {
        const shared =
          'flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-compact border-2 border-ui-border border-b-[length:var(--depth-sm)] bg-ui-surface px-1.5';
        const content = (
          <>
            <span className="font-chinese text-base font-bold leading-none text-ui-ink-strong">
              {member.character}
            </span>
            <span className="text-[9px] font-extrabold leading-none text-ui-muted-strong">
              {member.pinyin}
            </span>
          </>
        );
        return onGlyphClick ? (
          <button
            key={member.character}
            type="button"
            onClick={() => onGlyphClick(member.character)}
            aria-label={`Open ${member.character} in the dictionary`}
            style={tileStyle}
            className={`${shared} transition-[background-color,transform] hover:bg-ui-surface-hover active:scale-[0.97] focus-ring`}
          >
            {content}
          </button>
        ) : (
          <span key={member.character} style={tileStyle} className={shared}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
