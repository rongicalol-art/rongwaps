import React from 'react';
import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
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
        className={cn(
          'w-full bg-ui-surface px-5 py-4 flex flex-row items-center gap-4 rounded-feature border-b-[length:var(--depth-md)] border-ui-border active:border-b-0 active:translate-y-[length:var(--depth-md)] hover:bg-ui-hover transition-[background-color,border-color,transform] cursor-pointer group outline-none focus-ring text-left'
        )}
        onClick={onClick}
      >
        <div className="flex-1 flex flex-col items-start min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 w-full relative mb-1">
            <span className="text-[28px] sm:text-[32px] leading-none font-chinese font-bold text-ui-ink shrink-0 pt-1 group-hover:text-brand-primary transition-colors">
              {traditional}
            </span>
            <div className="flex flex-col justify-center min-w-0 flex-1">
               <div className="flex items-center gap-2">
                  <span className="text-[13px] sm:text-[14px] font-extrabold text-ui-muted tracking-widest line-clamp-1 truncate flex-1 uppercase">
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
          className={cn(
            'p-2.5 rounded-control transition-all z-20 shrink-0 border-b-[length:var(--depth-sm)] active:translate-y-px active:border-b-0 focus-ring',
            isStarred 
              ? 'border-feedback-warning-edge/30 text-feedback-warning-edge bg-feedback-warning/10 hover:bg-feedback-warning/20' 
              : 'border-transparent text-ui-muted hover:text-feedback-danger hover:bg-feedback-danger/10'
          )}
        >
          <AppIcon name={isStarred ? 'bookmarkFilled' : 'trash'} size={22} />
        </button>
      </div>
    </div>
  );
}
