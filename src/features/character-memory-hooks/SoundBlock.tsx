import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import type { SoundHookEntry } from '../../services/contentPacks';

export interface SoundBlockProps {
  entry: SoundHookEntry;
  /** Optional: opens a family member in the dictionary. */
  onGlyphClick?: (glyph: string) => void;
  className?: string;
}

/**
 * "Sound" card for detail views: the character's pinyin, its phonetic piece
 * with reading and tone shift, and the Book 1 sound family. Purely phonetic —
 * no mnemonic content lives here.
 */
export function SoundBlock({ entry, onGlyphClick, className }: SoundBlockProps) {
  return (
    <aside
      aria-label="Sound"
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-feature border-2 border-brand-primary-soft-edge border-b-[length:var(--depth-md)] bg-brand-primary-soft p-4 text-left shadow-ambient-sm sm:p-5',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <AppIcon name="audio" size={13} className="text-brand-primary-edge" />
        <span className="text-[11px] font-black uppercase tracking-wider text-brand-primary-edge">
          Sound
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xl font-black leading-none text-ui-ink-strong sm:text-2xl">
          {entry.pinyin}
        </span>
        {entry.phonetic && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary-soft-edge bg-ui-surface px-2.5 py-1">
            <span className="font-chinese text-base font-bold leading-none text-ui-ink-strong">
              {entry.phonetic.glyph}
            </span>
            <span className="text-xs font-bold leading-none text-ui-muted-strong">
              {entry.phonetic.shift}
            </span>
          </span>
        )}
      </div>

      {!entry.phonetic && (
        <p className="mt-2 text-xs font-bold leading-relaxed text-ui-muted-strong">
          No phonetic piece for this character — shape and meaning carry it.
        </p>
      )}

      {entry.family.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-brand-primary-edge">
            Sound family
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entry.family.map((member) => {
              const shared = 'inline-flex items-center gap-1.5 rounded-full border border-brand-primary-soft-edge bg-ui-surface px-2 py-0.5';
              const content = (
                <>
                  <span className="font-chinese text-sm font-bold leading-none text-ui-ink-strong">
                    {member.character}
                  </span>
                  <span className="text-[11px] font-bold leading-none text-ui-muted-strong">
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
                  className={cn(shared, 'focus-ring-inline transition-colors hover:bg-ui-hover')}
                >
                  {content}
                </button>
              ) : (
                <span key={member.character} className={shared}>
                  {content}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
