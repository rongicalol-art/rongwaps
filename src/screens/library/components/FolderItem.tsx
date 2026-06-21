import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface FolderItemProps {
  id: string;
  title: string;
  className?: string;
  icon: React.ReactNode;
  accentBg: string;
  accentBorder: string;
  accentColor: string;
  isActive: boolean;
  onSelect: () => void;
  onDeleteRequest?: () => void;
  key?: React.Key;
}

export function FolderItem({
  id,
  title,
  icon,
  accentBg,
  accentBorder,
  accentColor,
  isActive,
  onSelect,
  onDeleteRequest,
}: FolderItemProps) {
  const isDeletable = !['starred', 'custom'].includes(id) && !!onDeleteRequest;
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

  return (
    <motion.div
      initial={false}
      animate={{ scale: isActive ? 1.08 : 0.95, opacity: isActive ? 1 : 0.6 }}
      whileHover={{ scale: isActive ? 1.08 : 1.02, opacity: 1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onMouseDown={startPress}
      onMouseUp={endPress}
      className="cursor-pointer flex flex-col items-center gap-3 shrink-0 origin-center select-none"
    >
      <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-[24px] md:rounded-[28px] border-[3px] border-b-[6px] bg-white ${accentBorder} flex items-center justify-center shadow-sm overflow-hidden transition-all duration-200`}>
         <div className={`absolute inset-0 ${accentBg} opacity-100 z-0`}></div>
         <div className={`z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-[0.85]'}`}>
           {icon}
         </div>
      </div>
      <div className="text-center w-full px-1 max-w-[7rem] sm:max-w-[8rem]">
        <span className={`block font-extrabold text-[15px] sm:text-[17px] truncate mt-1 ${isActive ? 'text-[#4B4B4B]' : 'text-[#AFB6BB]'}`}>
          {title}
        </span>
      </div>
    </motion.div>
  );
}
