import { AppIcon, GraphPaperPanel } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface DictionaryStudySnapshotProps {
  savedWordCount: number;
  learnedWordCount: number;
  reviewedWordCount: number;
  availableBookCount: number;
}

interface MiniBarProps {
  value: number;
  maxValue: number;
  className: string;
}

function MiniBar({ value, maxValue, className }: MiniBarProps) {
  const height = maxValue > 0 ? Math.max(20, Math.round((value / maxValue) * 58)) : 20;

  return (
    <div
      className={cn(
        'w-8 rounded-t-[9px] border-b-2 transition-[height]',
        className,
      )}
      style={{ height }}
    />
  );
}

export function DictionaryStudySnapshot({
  savedWordCount,
  learnedWordCount,
  reviewedWordCount,
  availableBookCount,
}: DictionaryStudySnapshotProps) {
  const maxBarValue = Math.max(savedWordCount, learnedWordCount, reviewedWordCount, 1);

  return (
    <GraphPaperPanel gridSize="compact" className="h-full border-ui-border p-4 sm:p-5">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 text-ui-ink-strong">
          <AppIcon name="analytics" className="text-[#8ACFD9]" size={21} />
          <h3 className="text-[14px] font-black uppercase tracking-wider">
            Learning progress
          </h3>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-5 pb-1 pt-5">
          <div className="min-w-0">
            <div className="flex min-h-[72px] items-end gap-10 border-b-2 border-ui-border px-2">
              <div className="flex items-end gap-2">
                <MiniBar
                  value={learnedWordCount}
                  maxValue={maxBarValue}
                  className="border-[#1899D6] bg-[#1CB0F6]"
                />
                <MiniBar
                  value={savedWordCount}
                  maxValue={maxBarValue}
                  className="border-[#E58700] bg-[#FF9600]"
                />
              </div>
              <div className="flex items-end gap-2">
                <MiniBar
                  value={reviewedWordCount}
                  maxValue={maxBarValue}
                  className="border-[#1899D6] bg-[#1CB0F6]"
                />
                <MiniBar
                  value={Math.max(0, savedWordCount - learnedWordCount)}
                  maxValue={maxBarValue}
                  className="border-[#E58700] bg-[#FF9600]"
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 text-center text-[11px] font-black leading-tight text-ui-ink">
              <div>
                <span className="block">{learnedWordCount}</span>
                <span className="text-ui-muted-strong">Words learned</span>
              </div>
              <div>
                <span className="block">{reviewedWordCount}</span>
                <span className="text-ui-muted-strong">Cards reviewed</span>
              </div>
            </div>
          </div>

          <div className="flex w-[88px] shrink-0 flex-col items-center">
            <div className="relative grid h-[66px] w-[66px] place-items-center rounded-full bg-[conic-gradient(#1CB0F6_0deg_250deg,var(--color-ui-border)_250deg_360deg)]">
              <div className="grid h-[48px] w-[48px] place-items-center rounded-full bg-white text-[18px] font-black text-ui-ink">
                {availableBookCount}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] font-black leading-tight text-ui-ink">
              Books
              <span className="block text-ui-muted-strong">ready</span>
            </p>
          </div>
        </div>
      </div>
    </GraphPaperPanel>
  );
}
