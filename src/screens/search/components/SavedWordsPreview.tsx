import { AppIcon, IconActionButton } from '../../../lib/widgets';
import type { DictionarySavedPreview } from '../../../types/models';

interface SavedWordsPreviewProps {
  items: DictionarySavedPreview[];
  isLoading: boolean;
  onOpenWord: (word: string) => void;
  onViewAll: () => void;
}

export function SavedWordsPreview({
  items,
  isLoading,
  onOpenWord,
  onViewAll,
}: SavedWordsPreviewProps) {
  return (
    <section className="h-full rounded-[28px] bg-ui-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-ui-ink-strong">
          <AppIcon name="bookmark" className="text-[#FFB020]" size={20} />
          <h2 className="text-[16px] font-black">Saved</h2>
        </div>
        {items.length > 0 && (
          <IconActionButton
            type="button"
            variant="quiet"
            size="md"
            onClick={onViewAll}
            label="View all saved words"
            icon={<AppIcon name="forward" size={18} />}
          />
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.word}
              type="button"
              onClick={() => onOpenWord(item.word)}
              className="min-w-0 rounded-[18px] bg-ui-canvas px-2 py-3 text-center text-ui-ink-strong outline-none transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white focus-visible:ring-4 focus-visible:ring-brand-primary/20 active:translate-y-0"
            >
              <span className="block font-chinese text-[28px] font-bold leading-none">{item.traditional}</span>
              <span className="mt-1 w-full truncate text-[11px] font-black text-ui-ink">
                {item.pinyin || '—'}
              </span>
              <span className="mt-0.5 block w-full truncate text-[11px] font-bold text-ui-muted-strong">
                {item.meaning || 'Saved word'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex min-h-[126px] flex-1 items-center justify-center rounded-[20px] bg-ui-canvas px-4 text-center">
          <p className="text-[13px] font-bold text-ui-muted">
            {isLoading ? 'Loading…' : 'Saved words appear here.'}
          </p>
        </div>
      )}
    </section>
  );
}
