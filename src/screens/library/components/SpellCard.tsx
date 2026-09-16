import { memo } from 'react';
import { motion } from 'motion/react';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';
import { AppIcon } from '../../../lib/widgets';

type LibraryCardItem = DBDictionaryEntry | UserFlashcard;

interface SpellCardProps {
  item: LibraryCardItem;
  activeTab: string;
  /** Stable, item-based handler — see the `memo` comparator below. */
  onRemove: (item: LibraryCardItem) => void;
  /** Stable, item-based handler — see the `memo` comparator below. */
  onOpen: (item: LibraryCardItem) => void;
  index: number;
}

function SpellCardBase({ item, activeTab, onRemove, onOpen, index }: SpellCardProps) {
  const isStarred = activeTab === 'starred';
  const simplified = item.simplified;
  const traditional = item.traditional || simplified;

  // Both are always rendered as strings: an entry may carry no definitions at
  // all, so the declared `string` type starts from an explicit empty default.
  let pinyinStr: string;
  let definition = '';

  if (isStarred) {
    const dbItem = item as DBDictionaryEntry;
    pinyinStr = dbItem.pinyin ? dbItem.pinyin.join(' ') : '';
    if (dbItem.definitions) {
      if (typeof dbItem.definitions === 'string') definition = dbItem.definitions;
      else if (Array.isArray(dbItem.definitions)) definition = (dbItem.definitions as string[]).slice(0, 2).join(' · ');
      else if (typeof dbItem.definitions === 'object') definition = Object.values(dbItem.definitions as Record<string, string>).slice(0, 2).join(' · ');
    }
  } else {
    const fbItem = item as UserFlashcard;
    pinyinStr = fbItem.pinyin || '';
    definition = fbItem.translation || '';
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.2 }}
      className="group relative h-full select-none rounded-feature"
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-feature bg-ui-surface border-b-[length:var(--depth-md)] border-ui-border transition-[transform,background-color,border-color] duration-200 hover:bg-ui-hover active:translate-y-[length:var(--depth-md)] active:border-b-0">
        <button
          type="button"
          onClick={() => onOpen(item)}
          aria-label={`Open ${traditional}`}
          className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-feature outline-none focus-ring"
        />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(item); }}
          aria-label={isStarred ? `Remove ${traditional} from saved words` : `Delete ${traditional}`}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 z-10 ${
            isStarred
              ? 'text-feedback-warning-edge hover:bg-feedback-warning/10'
              : 'text-ui-muted hover:bg-feedback-danger/10 hover:text-feedback-danger'
          }`}
        >
          <AppIcon name={isStarred ? 'bookmarkFilled' : 'trash'} size={isStarred ? 18 : 16} />
        </button>

        <div className="pointer-events-none relative z-0 flex flex-1 flex-col items-center justify-center px-4 py-6">
          <span
            className="mb-3 font-chinese font-bold leading-none text-ui-ink-strong transition-colors group-hover:text-brand-primary"
            style={{ fontSize: traditional.length > 2 ? '30px' : traditional.length > 1 ? '38px' : '48px' }}
          >
            {traditional}
          </span>

          {pinyinStr && (
            <span className="mb-1 text-center text-xs font-extrabold text-ui-muted">
              {pinyinStr}
            </span>
          )}

          {definition && (
            <span className="text-sm font-semibold text-ui-muted-strong leading-snug text-center">
              {definition}
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
));
