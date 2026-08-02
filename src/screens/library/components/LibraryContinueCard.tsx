import { PiCardsThreeFill, PiPlayFill } from 'react-icons/pi';
import { Card3D, Soft3DButton } from '../../../lib/widgets';

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
    <Card3D depth="md" className="p-5 shadow-none">
      <div className="mb-4 flex items-center gap-2.5">
        <PiCardsThreeFill size={23} className="text-[#CE82FF]" />
        <h2 className="text-[14px] font-black uppercase tracking-wider text-ui-ink-strong">
          Continue studying
        </h2>
      </div>

      <div className="mb-5 rounded-[18px] bg-ui-canvas p-4">
        <p className="truncate text-[17px] font-black text-ui-ink-strong">
          {hasItems ? title : 'Your first collection'}
        </p>
        <p className="mt-1 text-[13px] font-bold text-ui-muted-strong">
          {hasItems
            ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready to review`
            : 'Add a custom card to start a practice set.'}
        </p>
      </div>

      {hasItems && onPractice ? (
        <Soft3DButton onClick={onPractice} depth="sm" className="rounded-[18px] py-3 text-[13px]">
          <PiPlayFill size={16} />
          Practice collection
        </Soft3DButton>
      ) : (
        <Soft3DButton onClick={onAddCard} depth="sm" className="rounded-[18px] py-3 text-[13px]">
          Add a card
        </Soft3DButton>
      )}
    </Card3D>
  );
}
