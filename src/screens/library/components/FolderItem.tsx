import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/cn';
import { AppIcon, FolderSvg } from '../../../lib/widgets';

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

  const frontColor = colorFront || accentBg?.match(/\[(.*?)\]/)?.[1] || 'var(--color-brand-primary)';
  const backColor = colorBack || accentBorder?.match(/\[(.*?)\]/)?.[1] || 'var(--color-brand-primary-edge)';

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
      <div className="relative aspect-[25/21] w-full max-w-40 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-y-1 motion-safe:group-active:translate-y-0 motion-safe:group-active:scale-95 lg:max-w-44">
        {isNewButton ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-control border-2 border-dashed border-ui-border text-ui-muted transition-colors group-hover:bg-ui-hover">
            <AppIcon name="add" size={32} />
          </span>
        ) : (
          <FolderSvg colorFront={frontColor} colorBack={backColor} />
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="block w-full max-w-44 line-clamp-2 px-1 text-center text-xs font-black leading-tight text-ui-ink-strong sm:text-base">
          {title}
        </span>
        {!isNewButton && count !== undefined && (
          <span className="text-xs font-extrabold text-ui-muted">
            {count} {count === 1 ? 'card' : 'cards'}
          </span>
        )}
      </div>
    </button>
  );
}
