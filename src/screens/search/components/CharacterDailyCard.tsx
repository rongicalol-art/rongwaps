import { useRuntimeDecompositionTree } from '../../../features/character-breakdown';
import { Skeleton } from '../../../lib/widgets';
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
      className="group flex w-full cursor-pointer items-stretch overflow-hidden rounded-feature bg-ui-surface text-left transition-transform duration-100 focus-ring active:scale-[0.99]"
      onClick={openWord}
      aria-label={`Open character of the day: ${word.traditional}`}
    >
      <div className="relative flex w-28 shrink-0 items-center justify-center border-b-[length:var(--depth-lg)] border-brand-primary-edge bg-brand-primary">
        <span className="relative font-chinese text-[64px] leading-none text-brand-on-primary">
          {word.traditional}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 border-b-[length:var(--depth-lg)] border-ui-divider px-4 py-4">
        <span className="truncate text-[11px] font-black uppercase tracking-widest text-brand-primary-deep">
          Character of the day
        </span>

        <div className="min-w-0">
          <p className="truncate text-xl font-black leading-tight text-brand-primary-text">
            {word.pinyin}
          </p>
          <p className="line-clamp-2 text-xl font-black leading-tight text-ui-ink-strong">
            {word.meaning}
          </p>
          
        </div>

        {showParts ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={`Made of ${parts.slice(0, 4).map((part) => part.glyph).join(' ')}`}>
            <span className="text-xs font-extrabold text-ui-muted">Made of</span>
            {parts.slice(0, 4).map((part, index) => (
              <span key={`${part.key}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-xs font-black text-ui-muted">+</span>}
                <span className="flex h-8 min-w-8 items-center justify-center rounded-sm bg-brand-primary-soft px-1.5 font-chinese text-xl font-bold leading-none text-brand-primary-deep">
                  {part.glyph}
                </span>
              </span>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-8 w-8 rounded-sm" />
            <Skeleton className="h-8 w-8 rounded-sm" />
          </div>
        ) : null}
      </div>
    </button>
  );
}
