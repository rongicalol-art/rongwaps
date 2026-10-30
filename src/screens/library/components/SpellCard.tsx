import { memo } from 'react';
import { motion } from 'motion/react';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';
import { AppIcon } from '../../../lib/widgets';
import { useMenuTrigger, type MenuPoint } from './LibraryContextMenu';

type LibraryCardItem = DBDictionaryEntry | UserFlashcard;

interface SpellCardProps {
  item: LibraryCardItem;
  activeTab: string;
  /** Stable, item-based handler — see the `memo` comparator below. */
  onRemove: (item: LibraryCardItem) => void;
  /** Stable, item-based handler — see the `memo` comparator below. */
  onOpen: (item: LibraryCardItem) => void;
  /** Stable, item-based handler. Opens the edit/delete menu of a custom card. */
  onMenu?: (item: LibraryCardItem, point: MenuPoint) => void;
  index: number;
  /** Select mode: the card toggles instead of opening, and shows a tick. */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (item: LibraryCardItem) => void;
}

function SpellCardBase({ item, activeTab, onRemove, onOpen, onMenu, index, selecting = false, selected = false, onToggleSelect }: SpellCardProps) {
  const isStarred = activeTab === 'starred';
  const simplified = item.simplified;
  // Runtime guard: malformed cloud/persisted cards may lack both fields, and
  // `traditional.length` below must never throw inside the library grid.
  const traditional = item.traditional || simplified || '';

  // Library tiles show the word and its pinyin only; the meaning lives in the card detail.
  const starredPinyin = (item as DBDictionaryEntry).pinyin;
  const pinyinStr = isStarred
    ? (Array.isArray(starredPinyin) ? starredPinyin.join(' ') : '')
    : (item as UserFlashcard).pinyin || '';

  const menuTrigger = useMenuTrigger((point) => onMenu?.(item, point), isStarred || selecting || !onMenu);

  return (
    <motion.div
      {...menuTrigger}
      style={{ WebkitTouchCallout: 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.2 }}
      className="group relative h-full select-none rounded-feature"
    >
      <article className={`relative flex h-full flex-col overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-md)] transition-[transform,background-color,border-color] duration-150 active:scale-[0.98] ${selected ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface hover:bg-ui-hover'}`}>
        <button
          type="button"
          onClick={() => (selecting ? onToggleSelect?.(item) : onOpen(item))}
          aria-pressed={selecting ? selected : undefined}
          aria-label={selecting ? `Select ${traditional}` : `Open ${traditional}`}
          className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-feature outline-none focus-ring"
        />

        {selecting ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-ui-divider bg-ui-surface'}`}
          >
            {selected && <AppIcon name="check" size={14} />}
          </span>
        ) : (isStarred || onMenu) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isStarred || !onMenu) {
                onRemove(item);
                return;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              onMenu(item, { x: rect.left, y: rect.bottom + 4 });
            }}
            aria-label={isStarred ? `Remove ${traditional} from saved words` : `Options for ${traditional}`}
            aria-haspopup={isStarred ? undefined : 'menu'}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 z-10 ${
              isStarred
                ? 'text-feedback-warning-text hover:bg-feedback-warning/10'
                : 'text-ui-muted hover:bg-ui-divider/60 hover:text-ui-ink'
            }`}
          >
            <AppIcon name={isStarred ? 'bookmarkFilled' : 'more'} size={isStarred ? 18 : 20} />
          </button>
        )}

        <div className="pointer-events-none relative z-0 flex flex-1 flex-col items-center justify-center px-4 py-6">
          <span
            className="mb-3 font-chinese font-bold leading-none text-ui-ink-strong transition-colors group-hover:text-brand-primary-text"
            style={{ fontSize: traditional.length > 2 ? '30px' : traditional.length > 1 ? '38px' : '48px' }}
          >
            {traditional}
          </span>

          {pinyinStr && (
            <span className="text-center text-sm font-extrabold text-ui-muted">
              {pinyinStr}
            </span>
          )}

        </div>
      </article>
    </motion.div>
  );
}

/**
 * `index` seeds the entrance stagger delay only — `motion` runs it once at
 * mount, so a shifted index (cards reflow while the folder search narrows the
 * list) must not re-render every surviving card. Compared by hand because the
 * default shallow compare would include it.
 */
export const SpellCard = memo(SpellCardBase, (prev, next) => (
  prev.item === next.item
  && prev.activeTab === next.activeTab
  && prev.onRemove === next.onRemove
  && prev.onOpen === next.onOpen
  && prev.onMenu === next.onMenu
  && prev.selecting === next.selecting
  && prev.selected === next.selected
  && prev.onToggleSelect === next.onToggleSelect
));
