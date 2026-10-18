import { SectionEyebrow } from '../../../lib/widgets';

export interface RecentItem {
  id: string;
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  type: 'starred' | 'custom';
}

interface LibraryRecentChipsProps {
  items: RecentItem[];
  onSelectWord?: (word: string) => void;
}

/** Recently added words as small pressable chips; an empty rail keeps the home layout from shifting when they arrive. */
export function LibraryRecentChips({ items, onSelectWord }: LibraryRecentChipsProps) {
  if (items.length === 0) {
    return (
      <section aria-label="Recently added" className="min-w-0">
        <SectionEyebrow title="Recently added" />
        <p className="text-[13px] font-extrabold text-ui-muted">Words you save will show up here.</p>
      </section>
    );
  }
  return (
    <section aria-label="Recently added" className="min-w-0">
      <SectionEyebrow title="Recently added" />
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectWord?.(item.hanzi)}
            aria-label={`Open ${item.hanzi}`}
            className="flex items-baseline gap-2 rounded-control border-2 border-b-4 border-ui-divider bg-ui-surface px-3 py-1.5 transition-transform active:translate-y-0.5 active:border-b-2 focus-ring"
          >
            <span className="font-chinese text-2xl leading-none text-ui-ink-strong">{item.hanzi}</span>
            <span className="max-w-[9rem] truncate text-[13px] font-extrabold text-ui-muted">
              {(item.meaning || item.pinyin || '').split(';')[0]}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
