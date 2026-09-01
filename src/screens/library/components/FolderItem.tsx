import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/cn';

interface FolderItemProps {
  id: string;
  title: string;
  count?: number;
  className?: string;
  icon?: React.ReactNode;
  accentBg?: string;
  accentBorder?: string;
  colorFront?: string;
  colorBack?: string;
  isNewButton?: boolean;
  onSelect: () => void;
  onDeleteRequest?: () => void;
}

export function FolderSvg({
  colorFront,
  colorBack,
  hasPlus,
  isStarred,
  className,
}: {
  colorFront: string;
  colorBack: string;
  hasPlus?: boolean;
  isStarred?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 84" className={cn("h-full w-full", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 0 h 14 c 2 0 4 1 5 3 l 3 7 c 1.5 3.5 3.5 6 6 6 h 52 c 6.6 0 12 5.4 12 12 v 44 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 v -64 c 0 -4.4 3.6 -8 8 -8 z"
        fill={colorBack}
      />
      <path
        d="M0 32 c 0 -6.6 5.4 -12 12 -12 h 76 c 6.6 0 12 5.4 12 12 v 40 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 z"
        fill={colorBack}
      />
      <path
        d="M0 28 c 0 -6.6 5.4 -12 12 -12 h 76 c 6.6 0 12 5.4 12 12 v 40 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 z"
        fill={colorFront}
      />
      {isStarred && (
        <path
          d="M50 34l4.1 8.3 9.2 1.3-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z"
          fill="#FFFFFF"
          opacity="0.32"
        />
      )}
      {hasPlus && (
        <path d="M50 38v20m-10-10h20" stroke="#7BA3B5" strokeWidth="6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function FolderItem({
  id,
  title,
  count,
  accentBg,
  accentBorder,
  colorFront,
  colorBack,
  isNewButton = false,
  onSelect,
  onDeleteRequest,
  className,
}: FolderItemProps) {
  const isDeletable = !['starred', 'custom'].includes(id) && !isNewButton && !!onDeleteRequest;
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const wasLongPress = useRef(false);

  const startPress = () => {
    if (!isDeletable) return;
    wasLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      if (onDeleteRequest) {
        onDeleteRequest();
      }
    }, 700);
  };

  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (wasLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      wasLongPress.current = false;
      return;
    }
    onSelect();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDeletable) {
      e.preventDefault();
      e.stopPropagation();
      if (onDeleteRequest) {
        onDeleteRequest();
      }
    }
  };

  const frontColor = isNewButton
    ? '#E8EDF2'
    : (colorFront || accentBg?.match(/\[(.*?)\]/)?.[1] || '#1CB0F6');
  const backColor = isNewButton
    ? '#D0D8E0'
    : (colorBack || accentBorder?.match(/\[(.*?)\]/)?.[1] || '#1899D6');

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      className={cn(
        'group flex shrink-0 cursor-pointer select-none flex-col items-center gap-2 rounded-control px-2 py-3 outline-none transition-colors hover:bg-ui-surface focus-ring',
        className,
      )}
    >
      <div className="relative aspect-[25/21] w-full max-w-[132px] transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0 group-active:scale-95 sm:max-w-[146px]">
        <FolderSvg
          colorFront={frontColor}
          colorBack={backColor}
          hasPlus={isNewButton}
          isStarred={id === 'starred'}
        />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="block w-full max-w-[150px] line-clamp-2 px-1 text-center text-[14px] font-black text-ui-ink-strong sm:max-w-[158px]">
          {title}
        </span>
        {!isNewButton && count !== undefined && (
          <span className="text-[12px] font-bold text-ui-muted">
            {count} {count === 1 ? 'card' : 'cards'}
          </span>
        )}
      </div>
    </button>
  );
}

