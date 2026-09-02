import { useRuntimeDecompositionTree } from '../../../features/character-breakdown/hooks/useRuntimeDecompositionTree';
import { AppIcon, Skeleton } from '../../../lib/widgets';
import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';

interface CharacterDailyCardProps {
  word: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
}

/**
 * Full-width daily character card. Pinyin and meaning render instantly from
 * static data; the "Made of" parts load from the runtime decomposition
 * service and degrade gracefully (omitted) when unavailable.
 */
export function CharacterDailyCard({ word, onOpenWord }: CharacterDailyCardProps) {
  const openWord = () => onOpenWord(word.traditional);
  const { root } = useRuntimeDecompositionTree(word.traditional);

  const isLoading = root.status === 'idle' || root.status === 'loading';
  const parts = (root.result?.children ?? []).filter(
    (child) => child.kind === 'glyph' && child.glyph,
  );
  const showParts = (root.status === 'found' || root.status === 'leaf') && parts.length > 0;

  return (
    <button
      type="button"
      className="group flex h-full min-h-[220px] w-full cursor-pointer items-stretch overflow-hidden rounded-feature bg-ui-surface text-left transition-[background-color,transform] duration-200 hover:bg-ui-hover focus-ring active:translate-y-[length:var(--depth-md)]"
      onClick={openWord}
      aria-label={`Open character of the day: ${word.traditional}`}
    >
      <div className="relative flex w-[34%] shrink-0 flex-col justify-between border-b-[length:var(--depth-md)] border-brand-primary-edge bg-brand-primary px-4 py-4 sm:w-[30%] sm:px-6 sm:py-5 group-active:border-b-0">
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/20"
        />
        <span className="relative w-fit rounded-sm bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-brand-primary-deep">
          Today
        </span>
        <span className="relative font-chinese text-[58px] font-bold leading-none text-white sm:text-[88px]">
          {word.traditional}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between border-b-[length:var(--depth-md)] border-ui-border px-5 py-4 sm:px-7 sm:py-5 group-active:border-b-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-black uppercase tracking-wider text-brand-primary-deep">
            Character of the day
          </span>
          <AppIcon
            name="forward"
            size={18}
            className="shrink-0 text-ui-muted transition-transform group-hover:translate-x-1"
          />
        </div>

        <div className="min-w-0 py-1">
          <p className="truncate text-[16px] font-black leading-none text-brand-primary sm:text-[18px]">
            {word.pinyin}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[18px] font-black leading-tight text-ui-ink sm:text-[20px]">
            {word.meaning}
          </p>
        </div>

        {showParts ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={`Made of ${parts.slice(0, 4).map((part) => part.glyph).join(' ')}`}>
            <span className="text-[11px] font-extrabold text-ui-muted">Made of</span>
            {parts.slice(0, 4).map((part, index) => (
              <span key={part.key} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-[12px] font-black text-ui-muted">+</span>}
                <span className="flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-brand-primary-soft px-1.5 font-chinese text-[20px] font-bold leading-none text-brand-primary-deep">
                  {part.glyph}
                </span>
              </span>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-8 w-8 rounded-[10px]" />
            <Skeleton className="h-8 w-8 rounded-[10px]" />
          </div>
        ) : null}
      </div>
    </button>
  );
}
