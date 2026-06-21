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
  accentColor, // Note: not currently used in this file but part of API
  onAction,
  onClick,
  isLast
}) => {
  const isStarred = activeTab === 'starred';
  const simplified = (item as any).simplified;
  const traditional = (item as any).traditional || simplified;
  
  let pinyinStr = '';
  let definition = '';
  
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
    <div 
      className={`w-full bg-white px-4 py-3 flex flex-row items-center gap-4 active:bg-[#F2F2F2] hover:bg-[#F9F9F9] transition-all cursor-pointer group outline-none text-left ${!isLast ? 'border-b-[2px] border-[#F0F0F0]' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1 flex flex-col items-start min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 w-full relative mb-1">
          <span className="text-[28px] sm:text-[32px] leading-none font-chinese font-normal text-[#4B4B4B] shrink-0 pt-1">
            {traditional}
          </span>
          <div className="flex flex-col justify-center min-w-0 flex-1">
             <div className="flex items-center gap-2">
                <span className="text-[13px] sm:text-[14px] font-bold text-[#AFB6BB] tracking-widest line-clamp-1 truncate flex-1">
                  {pinyinStr || ''}
                </span>
             </div>
          </div>
        </div>
        <div className="text-[14px] font-bold text-[#4B4B4B] line-clamp-2 w-full mt-0.5 break-words">
          {definition}
        </div>
      </div>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onAction(e);
        }}
        className={`p-2 sm:p-3 rounded-xl transition-all z-20 shrink-0 ${isStarred ? 'text-[#FFD900] hover:bg-[#FFD900]/10' : 'text-[#AFB6BB] hover:bg-[#FFE5E5] hover:text-[#FF4B4B]'} active:scale-90`}
      >
        {isStarred ? <PiBookmarkSimpleFill size={26} className="text-[#FF9600]" /> : <PiTrashBold size={24} />}
      </button>
    </div>
  );
}
