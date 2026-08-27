import React from 'react';
import { PiBookmarkSimpleFill, PiTrashBold } from 'react-icons/pi';
import { DBDictionaryEntry } from '../../types/database';
import { UserFlashcard } from '../../types/models';

interface CollectionListItemProps {
  item: DBDictionaryEntry | UserFlashcard;
  activeTab: string;
  accentColor: string;
  onAction: (e: React.MouseEvent) => void;
  onClick: () => void;
  isLast?: boolean;
}

export const CollectionListItem: React.FC<CollectionListItemProps> = ({ 
  item,
  activeTab,
  onAction,
  onClick
}) => {
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
      else if (Array.isArray(dbItem.definitions)) definition = dbItem.definitions.join(' • ');
      else if (typeof dbItem.definitions === 'object') definition = Object.values(dbItem.definitions).join(' • ');
    }
  } else {
    const fbItem = item as UserFlashcard;
    pinyinStr = fbItem.pinyin || '';
    definition = fbItem.translation || '';
  }

  return (
    <div className="px-1 pb-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${traditional}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`w-full bg-white px-5 py-4 flex flex-row items-center gap-4 rounded-[24px] border-2 border-b-[6px] border-[#E5E5E5] active:border-b-2 active:translate-y-[3px] hover:border-brand-primary hover:bg-[#F7F7F7] transition-all cursor-pointer group outline-none text-left`}
        onClick={onClick}
      >
        <div className="flex-1 flex flex-col items-start min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 w-full relative mb-1">
            <span className="text-[28px] sm:text-[32px] leading-none font-chinese font-bold text-ui-ink shrink-0 pt-1 group-hover:text-brand-primary transition-colors">
              {traditional}
            </span>
            <div className="flex flex-col justify-center min-w-0 flex-1">
               <div className="flex items-center gap-2">
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-[#AFB6BB] tracking-widest line-clamp-1 truncate flex-1 uppercase">
                    {pinyinStr || ''}
                  </span>
               </div>
            </div>
          </div>
          <div className="text-[15px] font-bold text-ui-ink line-clamp-2 w-full mt-1 break-words leading-snug">
            {definition}
          </div>
        </div>

        <button
          aria-label={isStarred ? 'Remove from saved words' : 'Delete card'}
          onClick={(e) => {
            e.stopPropagation();
            onAction(e);
          }}
          className={`p-3 rounded-[16px] transition-all z-20 shrink-0 border-[2px] border-transparent ${isStarred ? 'text-[#FFD900] hover:bg-[#FFD900]/10 hover:border-[#FFD900]/30' : 'text-[#AFB6BB] bg-[#F7F7F7] hover:bg-[#FFE5E5] hover:text-feedback-danger hover:border-feedback-danger/30'} active:scale-95`}
        >
          {isStarred ? <PiBookmarkSimpleFill size={28} className="text-brand-secondary" /> : <PiTrashBold size={24} />}
        </button>
      </div>
    </div>
  );
}
