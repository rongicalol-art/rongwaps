import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/cn';

interface FolderItemProps {
  id: string;
  title: string;
  className?: string;
  icon?: React.ReactNode;
  accentBg?: string;
  accentBorder?: string;
  isNewButton?: boolean;
  onSelect: () => void;
  onDeleteRequest?: () => void;
}

function FolderSvg({
  colorFront,
  colorBack,
  hasPlus,
  isStarred,
}: {
  colorFront: string;
  colorBack: string;
  hasPlus?: boolean;
  isStarred?: boolean;
}) {
  return (
    <svg viewBox="0 0 100 84" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  accentBg,
  accentBorder,
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
    }, 700); // 700ms long press threshold
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

  const frontColor = isNewButton ? '#E8EDF2' : (accentBg?.match(/\[(.*?)\]/)?.[1] || '#1CB0F6');
  const backColor = isNewButton ? '#D0D8E0' : (accentBorder?.match(/\[(.*?)\]/)?.[1] || '#1899D6');

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      className={cn(
        'group flex shrink-0 cursor-pointer select-none flex-col items-center gap-3 pt-4 pb-2 outline-none',
        className,
      )}
    >
      <div className="relative aspect-[25/21] w-full max-w-[142px] transition-all duration-150 group-active:translate-y-1 group-active:scale-95 sm:max-w-[158px]">
        <FolderSvg
          colorFront={frontColor}
          colorBack={backColor}
          hasPlus={isNewButton}
          isStarred={id === 'starred'}
        />
      </div>
      <span className="mt-2 block w-full max-w-[150px] line-clamp-2 px-1 text-center text-[14px] font-black tracking-wide text-ui-ink-strong sm:max-w-[158px]">
        {title}
      </span>
    </button>
  );
}
