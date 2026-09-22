import { motion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { SpellCard } from './SpellCard';
import type { DBDictionaryEntry } from '../../../types/database';
import type { UserFlashcard } from '../../../types/models';

interface LibraryCardGridProps {
  items: (DBDictionaryEntry | UserFlashcard)[];
  isStarred: boolean;
  libraryActiveFolder: string;
  onAddCard?: () => void;
  onRemoveCard: (card: DBDictionaryEntry | UserFlashcard) => void;
  onOpenCard: (card: DBDictionaryEntry | UserFlashcard) => void;
}

export function LibraryCardGrid({
  items,
  isStarred,
  libraryActiveFolder,
  onAddCard,
  onRemoveCard,
  onOpenCard,
}: LibraryCardGridProps) {
  return (
    <motion.div
      key="card-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {!isStarred && onAddCard && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onAddCard}
            aria-label="Add a card to this folder"
            className="flex h-full min-h-[140px] cursor-pointer select-none flex-col items-center justify-center rounded-feature border-2 border-dashed border-ui-divider bg-ui-surface/60 text-center text-ui-muted outline-none transition-[border-color,background-color,color] duration-150 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary focus-ring"
          >
            <AppIcon name="add" size={26} className="mb-2" />
            <span className="block text-[14px] font-black">Add card</span>
          </motion.button>
        )}

        {items.map((item, idx) => {
          const key = isStarred
            ? `star-${(item as DBDictionaryEntry).traditional}`
            : `custom-${(item as UserFlashcard).id}`;
          return (
            <SpellCard
              key={key}
              item={item}
              activeTab={libraryActiveFolder}
              index={idx}
              onRemove={onRemoveCard}
              onOpen={onOpenCard}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
