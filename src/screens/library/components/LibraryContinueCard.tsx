import { PiCardsThreeFill, PiPlayFill } from 'react-icons/pi';
import { ActionButton } from '../../../lib/widgets';

interface LibraryContinueCardProps {
  title: string;
  itemCount: number;
  onPractice?: () => void;
  onAddCard?: () => void;
}

export function LibraryContinueCard({
  title,
  itemCount,
  onPractice,
  onAddCard,
}: LibraryContinueCardProps) {
  const hasItems = itemCount > 0;

  return (
    <div className="rounded-[24px] border-0 border-b-4 border-b-ui-border bg-ui-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <PiCardsThreeFill size={20} className="text-purple-500" />
        <h2 className="text-[14px] font-black uppercase tracking-wider text-ui-ink-strong">
          Continue studying
        </h2>
      </div>

      <div className="mb-5 rounded-[18px] bg-ui-canvas/70 p-4">
        <p className="truncate text-[16px] font-black text-ui-ink-strong">
          {hasItems ? title : 'Your first collection'}
        </p>
        <p className="mt-1 text-[13px] font-bold text-ui-muted">
          {hasItems
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready to review`
            : 'Add a custom card to start a practice set.'}
        </p>
      </div>

      {hasItems && onPractice ? (
        <ActionButton size="md" fullWidth onClick={onPractice}>
          <PiPlayFill size={16} />
          Practice collection
        </ActionButton>
      ) : (
        <ActionButton variant="secondary" size="md" fullWidth onClick={onAddCard}>
          Add a card
        </ActionButton>
      )}
    </div>
  );
}
