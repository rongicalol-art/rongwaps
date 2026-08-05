import { AppIcon } from '../../../lib/widgets';

export interface RecentItem {
  id: string;
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  type: 'starred' | 'custom';
}

interface LibraryRecentCardsCardProps {
  items: RecentItem[];
  onSelectWord?: (word: string) => void;
}

export function LibraryRecentCardsCard({ items, onSelectWord }: LibraryRecentCardsCardProps) {
  const hasItems = items.length > 0;

  return (
    <section className="rounded-[26px] bg-ui-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <AppIcon name="clock" size={19} className="text-[#CE82FF]" />
        <h2 className="text-[16px] font-black text-ui-ink-strong">Recent</h2>
      </div>

      {hasItems ? (
        <div className="divide-y divide-ui-divider/60">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectWord?.(item.hanzi)}
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-[12px] px-2 py-3 transition-colors hover:bg-white first:pt-2 last:pb-2"
            >
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span className="font-chinese text-[20px] font-black text-ui-ink-strong group-hover:text-brand-primary transition-colors">
                  {item.hanzi}
                </span>
                <span className="truncate text-[13px] font-bold text-ui-muted">
                  {item.pinyin || item.meaning}
                </span>
              </div>

              <span className="shrink-0">
                <span
                  className={`block size-2.5 rounded-full ${
                    item.type === 'starred' ? 'bg-[#FFB020]' : 'bg-[#CE82FF]'
                  }`}
                />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-[13px] font-bold text-ui-muted">No cards yet</p>
        </div>
      )}

    </section>
  );
}
