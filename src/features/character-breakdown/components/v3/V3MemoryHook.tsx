import { AppIcon } from '../../../../lib/widgets';
import { CharacterGlyph } from '../breakdown/CharacterGlyph';

/**
 * "Memory Hook" block for the V3 breakdown summary.
 * Sits directly below the Breakdown tree inside the decomposition column.
 * Rendered as a warm "aha" card: warning-tinted surface, filled lightbulb
 * badge, hero glyph medallion, and a faint corner sparkle. Content is
 * placeholder until the AI mnemonic flow is wired up; the example sentences
 * live in their own block.
 */
export function V3MemoryHook({ character }: { character: string }) {
  return (
    <aside
      aria-label="Memory hook"
      className="relative overflow-hidden rounded-feature border border-feedback-warning-edge bg-ui-surface p-4 shadow-[0_4px_0_var(--color-feedback-warning-edge)] sm:p-6"
    >
      <AppIcon
        name="sparkles"
        size={72}
        className="pointer-events-none absolute -bottom-6 -right-6 text-feedback-warning/20"
      />
      <h2 className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-feedback-warning text-ui-ink-strong shadow-[0_2px_0_var(--color-feedback-warning-edge)]">
          <AppIcon name="lightbulb" size={15} />
        </span>
        <span className="truncate text-[13px] font-black uppercase tracking-widest text-ui-ink-strong">
          Memory hook
        </span>
      </h2>
      <div className="relative mt-3 flex items-start gap-3.5 sm:gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-compact bg-ui-surface">
          <CharacterGlyph character={character} className="font-chinese text-3xl text-ui-ink-strong" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-relaxed text-ui-ink sm:text-[13px]">
            Memory hook for <CharacterGlyph character={character} className="font-chinese text-sm" /> will live here — one
            tiny scene that makes the character stick.
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold leading-relaxed text-ui-muted">
            <AppIcon name="sparkles" size={13} className="mt-[2px] shrink-0 text-feedback-warning" />
            <span>
              Sample: a <CharacterGlyph character="女" className="font-chinese text-sm" /> (woman) beside a{' '}
              <CharacterGlyph character="子" className="font-chinese text-sm" /> (child) makes{' '}
              <CharacterGlyph character="好" className="font-chinese text-sm" /> &ldquo;good&rdquo;.
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}
