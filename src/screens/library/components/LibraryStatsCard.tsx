import { PiChartDonutFill } from 'react-icons/pi';
import { GraphPaperPanel } from '../../../lib/widgets';

interface LibraryStatsCardProps {
  savedCount: number;
  cardCount: number;
  folderCount: number;
}

export function LibraryStatsCard({ savedCount, cardCount, folderCount }: LibraryStatsCardProps) {
  const totalItems = savedCount + cardCount;

  return (
    <GraphPaperPanel gridSize="compact" className="p-5">
      <div className="mb-5 flex items-center gap-2.5">
        <PiChartDonutFill size={23} className="text-[#58CCB5]" />
        <h2 className="text-[14px] font-black uppercase tracking-wider text-ui-ink-strong">
          Library at a glance
        </h2>
      </div>

      <div className="flex items-center justify-between gap-5">
        <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full border-[11px] border-[#58CCB5] border-b-[#FF9600] border-r-[#1CB0F6] bg-white">
          <div className="text-center">
            <strong className="block text-[27px] font-black leading-none text-ui-ink-strong">{totalItems}</strong>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-ui-muted-strong">items</span>
          </div>
        </div>

        <dl className="min-w-0 flex-1 space-y-3">
          <div>
            <dt className="text-[12px] font-black text-ui-muted-strong">Saved words</dt>
            <dd className="text-[20px] font-black text-[#1CB0F6]">{savedCount}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-black text-ui-muted-strong">Custom cards</dt>
            <dd className="text-[20px] font-black text-[#FF9600]">{cardCount}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-black text-ui-muted-strong">Folders</dt>
            <dd className="text-[20px] font-black text-[#58CCB5]">{folderCount}</dd>
          </div>
        </dl>
      </div>
    </GraphPaperPanel>
  );
}
