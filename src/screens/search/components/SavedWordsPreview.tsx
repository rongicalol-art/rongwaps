import { AppIcon, Card3D, Soft3DButton } from '../../../lib/widgets';
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
    <Card3D depth="md" edgeColor="border-ui-border" className="h-full p-4 shadow-none sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-ui-ink-strong">
          <AppIcon name="bookmark" className="text-[#FFB020]" size={20} />
          <span className="text-[13px] font-black uppercase tracking-wider">
            Recently saved words
          </span>
        </div>
        {items.length > 0 && (
          <Soft3DButton
            type="button"
            variant="custom"
            depth="sm"
            onClick={onViewAll}
            className="w-auto rounded-[13px] border-[#D6EEF8] bg-[#F4FBFE] px-3 py-1.5 text-[11px] normal-case tracking-normal text-[#1686B3] shadow-none"
          >
            View all
          </Soft3DButton>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((item) => (
            <Soft3DButton
              key={item.word}
              type="button"
              variant="custom"
              depth="sm"
              onClick={() => onOpenWord(item.word)}
              className="min-w-0 flex-col gap-0 rounded-[14px] border-ui-border bg-ui-canvas px-2 py-2 normal-case tracking-normal text-ui-ink-strong shadow-none hover:bg-white"
            >
              <span className="font-chinese text-[27px] font-bold leading-none">{item.traditional}</span>
              <span className="mt-1 w-full truncate text-[11px] font-black text-ui-ink">
                {item.pinyin || '—'}
              </span>
              <span className="mt-0.5 w-full truncate text-[11px] font-bold text-ui-muted-strong">
                {item.meaning || 'Saved word'}
              </span>
            </Soft3DButton>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex min-h-[96px] flex-1 items-center justify-center rounded-[18px] border-2 border-ui-divider bg-ui-canvas px-4 text-center">
          <p className="text-[13px] font-bold text-ui-muted">
            {isLoading ? 'Loading saved words...' : 'Save a dictionary word and it will appear here.'}
          </p>
        </div>
      )}
    </Card3D>
  );
}
