import type { DBCharacterBreakdown } from '../../../../types/database';
import { AppIcon, WorkspaceDetailShell } from '../../../../lib/widgets';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { V3RuntimeTree } from './V3RuntimeTree';

export function V3TreeScreen({
  character,
  data,
  onBack,
  onGlyphClick,
}: {
  character: string;
  data: DBCharacterBreakdown | null;
  onBack: () => void;
  onGlyphClick: (character: string) => void;
}) {
  const pinyin = data?.pinyin?.[0]?.trim();
  const meaning = data?.definition?.trim();

  return (
    <WorkspaceDetailShell
      ariaLabel={`Component tree for ${character}`}
      title="Component tree"
      onBack={onBack}
      zIndexClassName="z-[450]"
      maxWidthClassName="max-w-[1040px]"
      headerClassName="border-b border-ui-divider/70 bg-ui-practice-canvas/95 backdrop-blur-[2px]"
      contentInnerClassName="pb-20"
    >
      <div className="mx-auto flex w-full max-w-[920px] flex-col items-center">
        <header className="flex min-w-[168px] max-w-full items-center gap-4 rounded-feature border-2 border-ui-border bg-ui-surface px-5 py-4 shadow-[0_var(--depth-card)_0_var(--color-ui-divider)]">
          <span className="font-chinese text-[62px] leading-none text-ui-ink-strong">{character}</span>
          {(pinyin || meaning) && (
            <span className="min-w-0 text-left">
              {pinyin && <span className="block text-sm font-black text-brand-primary">{numberToToneMarks(pinyin)}</span>}
              {meaning && <span className="block max-w-[18rem] truncate text-xs font-bold text-ui-muted">{meaning}</span>}
            </span>
          )}
        </header>

        <div aria-hidden="true" className="h-8 w-px bg-ui-divider" />

        <section className="w-full rounded-feature border border-ui-divider bg-ui-surface p-4 shadow-[0_var(--depth-card)_0_var(--color-ui-divider)] sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"><AppIcon name="breakdown" size={18} /></span>
              <h2 className="text-lg font-black text-ui-ink-strong">Parts</h2>
            </div>
            <p className="text-[11px] font-bold text-ui-muted">Use + to go deeper</p>
          </div>
          <V3RuntimeTree character={character} onGlyphClick={onGlyphClick} mode="tree" showHeading={false} />
        </section>
      </div>
    </WorkspaceDetailShell>
  );
}
