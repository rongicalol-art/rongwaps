import React from 'react';
import { motion } from 'motion/react';
import { PiBookmarkSimpleFill, PiTrashBold } from 'react-icons/pi';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';
import { Card3D } from '../../../lib/widgets';

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
      onClick={onClick}
      className="cursor-pointer select-none group break-inside-avoid mb-3"
    >
      <Card3D
        edgeColor="border-ui-border"
        depth="md"
        className="relative overflow-hidden hover:border-[#1CB0F6] active:border-b-[2px] active:translate-y-[4px] transition-all duration-150 bg-white shadow-none"
      >
        {/* Floating Action Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onAction(e); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 z-10 ${
            isStarred
              ? 'text-[#FFB020] hover:bg-[#FFB020]/10'
              : 'text-ui-muted hover:bg-[#FF4B4B]/10 hover:text-[#FF4B4B]'
          }`}
        >
          {isStarred ? <PiBookmarkSimpleFill size={18} /> : <PiTrashBold size={16} />}
        </button>

        {/* Content — naturally sized by its own content */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4">
          {/* Character */}
          <span
            className="font-chinese font-bold text-ui-ink-strong leading-none mb-3 group-hover:text-[#1CB0F6] transition-colors"
            style={{ fontSize: traditional.length > 2 ? '30px' : traditional.length > 1 ? '38px' : '48px' }}
          >
            {traditional}
          </span>

          {/* Pinyin */}
          {pinyinStr && (
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-ui-muted text-center mb-1">
              {pinyinStr}
            </span>
          )}

          {/* Definition — no clamp, full text */}
          {definition && (
            <span className="text-[13px] font-semibold text-ui-muted-strong leading-snug text-center">
              {definition}
            </span>
          )}
        </div>
      </Card3D>
    </motion.div>
  );
};
