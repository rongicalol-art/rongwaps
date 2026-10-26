import React from 'react';
import { cn } from '../../../utils/cn';
import { AppIcon, FolderSvg } from '../../../lib/widgets';
import { useMenuTrigger, type MenuPoint } from './LibraryContextMenu';

interface FolderItemProps {
  id: string;
  title: string;
  count?: number;
  shareSaveCount?: number;
  memberCount?: number;
  className?: string;
  icon?: React.ReactNode;
  accentBg?: string;
  accentBorder?: string;
  colorFront?: string;
  colorBack?: string;
  isNewButton?: boolean;
  onSelect: () => void;
  /** Right-click / long-press on an editable folder. */
  onMenuRequest?: (point: MenuPoint) => void;
}

export function FolderItem({
  id,
  title,
  count,
  shareSaveCount,
  memberCount,
  accentBg,
  accentBorder,
  colorFront,
  colorBack,
  isNewButton = false,
  onSelect,
  onMenuRequest,
  className,
}: FolderItemProps) {
  const isEditable = id !== 'starred' && !isNewButton && !!onMenuRequest;
  const menuTrigger = useMenuTrigger((point) => onMenuRequest?.(point), !isEditable);

  const frontColor = isNewButton
    ? '#E8EDF2'
    : (colorFront || accentBg?.match(/\[(.*?)\]/)?.[1] || '#1CB0F6');
  const backColor = isNewButton
    ? '#D0D8E0'
    : (colorBack || accentBorder?.match(/\[(.*?)\]/)?.[1] || '#1899D6');

  return (
    <button
      onClick={onSelect}
      {...menuTrigger}
      className={cn(
        'group flex shrink-0 cursor-pointer select-none flex-col items-center gap-2 rounded-control px-2 py-3 outline-none transition-colors hover:bg-ui-surface focus-ring',
        className,
      )}
    >
      <div className="relative aspect-[25/21] w-full max-w-[150px] transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 group-active:scale-95 lg:max-w-[168px]">
        <FolderSvg
          colorFront={frontColor}
          colorBack={backColor}
          hasPlus={isNewButton}
          isStarred={id === 'starred'}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="block w-full max-w-[170px] line-clamp-2 px-1 text-center text-base font-black leading-tight text-ui-ink-strong">
          {title}
        </span>
        {!isNewButton && count !== undefined && (
          <span className="flex items-center gap-1 whitespace-nowrap text-[13px] font-extrabold text-ui-muted">
            {count} {count === 1 ? 'card' : 'cards'}
            {memberCount !== undefined && memberCount > 1 && <span className="flex items-center gap-0.5" aria-label={`${memberCount} members`}>· <AppIcon name="family" size={13} />{memberCount}</span>}
            {shareSaveCount !== undefined && (
              <span className="flex items-center gap-0.5" aria-label={`Shared, saved by ${shareSaveCount}`}>
                · <AppIcon name="share" size={13} />{shareSaveCount}
              </span>
            )}
          </span>
        )}
      </div>
    </button>
  );
}

