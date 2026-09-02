import React from 'react';
import { motion } from 'motion/react';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';
import { AppIcon } from '../../../lib/widgets';

interface SpellCardProps {
  item: DBDictionaryEntry | UserFlashcard;
  activeTab: string;
  onAction: (e: React.MouseEvent) => void;
  onClick: () => void;
  index: number;
}

export const SpellCard: React.FC<SpellCardProps> = ({ item, activeTab, onAction, onClick, index }) => {
  const isStarred = activeTab === 'starred';
  const simplified = item.simplified;
  const traditional = item.traditional || simplified;

  let pinyinStr: string;
  let definition: string;

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
      role="button"
      tabIndex={0}
      aria-label={`Open ${traditional}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={onClick}
      className="group h-full cursor-pointer select-none outline-none focus-ring rounded-feature"
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-feature bg-ui-surface border-b-[length:var(--depth-md)] border-ui-border transition-[transform,background-color,border-color] duration-200 hover:bg-ui-hover active:translate-y-[length:var(--depth-md)] active:border-b-0">
        <button
          onClick={(e) => { e.stopPropagation(); onAction(e); }}
          aria-label={isStarred ? `Remove ${traditional} from saved words` : `Delete ${traditional}`}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 z-10 ${
            isStarred
              ? 'text-feedback-warning-edge hover:bg-feedback-warning/10'
              : 'text-ui-muted hover:bg-feedback-danger/10 hover:text-feedback-danger'
          }`}
        >
          <AppIcon name={isStarred ? 'bookmarkFilled' : 'trash'} size={isStarred ? 18 : 16} />
        </button>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
          <span
            className="mb-3 font-chinese font-bold leading-none text-ui-ink-strong transition-colors group-hover:text-brand-primary"
            style={{ fontSize: traditional.length > 2 ? '30px' : traditional.length > 1 ? '38px' : '48px' }}
          >
            {traditional}
          </span>

          {pinyinStr && (
            <span className="mb-1 text-center text-[11px] font-extrabold text-ui-muted">
              {pinyinStr}
            </span>
          )}

          {definition && (
            <span className="text-[13px] font-semibold text-ui-muted-strong leading-snug text-center">
              {definition}
            </span>
          )}
        </div>
      </article>
    </motion.div>
  );
};
