import { motion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { SpellCard } from './SpellCard';
import type { MenuPoint } from './LibraryContextMenu';
import type { DBDictionaryEntry } from '../../../types/database';
import type { UserFlashcard } from '../../../types/models';
import { cn } from '../../../utils/cn';

/** Folder colour classes (from `resolveFolderColor`) used to tint the add tile. */
interface FolderTone {
  lightBg?: string;
  accentColor?: string;
  /** Folder hex, for the soft tinted border. */
  colorFront?: string;
}

interface LibraryCardGridProps {
  items: (DBDictionaryEntry | UserFlashcard)[];
  isStarred: boolean;
  libraryActiveFolder: string;
  onAddCard?: () => void;
  tone?: FolderTone;
  onRemoveCard: (card: DBDictionaryEntry | UserFlashcard) => void;
  onOpenCard: (card: DBDictionaryEntry | UserFlashcard) => void;
  onCardMenu?: (card: DBDictionaryEntry | UserFlashcard, point: MenuPoint) => void;
  isSelecting?: boolean;
  selectedKeys?: ReadonlySet<string>;
  getItemKey?: (card: DBDictionaryEntry | UserFlashcard) => string;
  onToggleSelect?: (card: DBDictionaryEntry | UserFlashcard) => void;
}

export function LibraryCardGrid({
  items,
  isStarred,
  libraryActiveFolder,
  onAddCard,
  tone,
  onRemoveCard,
  onOpenCard,
  onCardMenu,
  isSelecting = false,
  selectedKeys,
  getItemKey,
  onToggleSelect,
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
        {!isStarred && onAddCard && !isSelecting && (
          <button
            type="button"
            onClick={onAddCard}
            aria-label="Add a card to this folder"
            style={tone?.colorFront ? { borderColor: `color-mix(in srgb, ${tone.colorFront} 38%, var(--color-ui-canvas))` } : undefined}
            className={cn(
              // Same shell and slots as SpellCard: a blank card with a plus where the word sits.
              'relative flex h-full min-h-[140px] cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-md)] px-4 py-6 text-center outline-none transition-[transform,filter] duration-150 hover:brightness-[0.98] active:scale-[0.98] focus-ring',
              tone?.colorFront ? '' : 'border-ui-border',
              tone?.lightBg ?? 'bg-brand-primary-soft',
              tone?.accentColor ?? 'text-brand-primary'
            )}
          >
            <span className="mb-3 flex h-12 items-center justify-center">
              <AppIcon name="add" size={44} />
            </span>
            <span className="text-sm font-extrabold">New card</span>
          </button>
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
              onMenu={onCardMenu}
              selecting={isSelecting}
              selected={Boolean(selectedKeys && getItemKey && selectedKeys.has(getItemKey(item)))}
              onToggleSelect={onToggleSelect}
            />
          );
        })}

        {/* Empty folder: faint slots show where cards will go. Counts fill one row per breakpoint. */}
        {items.length === 0 && !isStarred && onAddCard && (
          <>
            <div aria-hidden className="min-h-[140px] rounded-feature border-2 border-dashed border-ui-divider opacity-70" />
            <div aria-hidden className="min-h-[140px] rounded-feature border-2 border-dashed border-ui-divider opacity-45" />
            <div aria-hidden className="min-h-[140px] rounded-feature border-2 border-dashed border-ui-divider opacity-25 sm:hidden lg:block" />
          </>
        )}
      </div>
    </motion.div>
  );
}
