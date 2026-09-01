import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from './AppIcon';

interface ExpandableSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  isExpanded?: boolean;
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ExpandableSearch({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  label = "search",
  isExpanded = false,
  className = "",
  onExpandedChange
}: ExpandableSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSetExpanded = (expanded: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(expanded);
    }
  };

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  return (
    <motion.div 
      initial={false}
      animate={{ 
        width: isExpanded ? '100%' : 44,
      }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className={`flex justify-end relative select-none z-10 w-full ${
        isExpanded ? 'max-w-[400px]' : 'w-[44px]'
      } ${className}`}
    >
      <div
        className={`w-full min-w-[44px] relative flex items-center h-[44px] rounded-control overflow-hidden ${
          isExpanded 
            ? 'bg-ui-surface focus-within:bg-ui-surface focus-within:ring-4 focus-within:ring-brand-primary/20'
            : 'bg-transparent transition-colors'
        }`}
      >
        {isExpanded ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-ui-muted"
            >
              <AppIcon name="search" size={18} />
            </span>

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-full w-full bg-transparent pb-0.5 pl-[38px] pr-11 text-[16px] font-bold text-ui-ink outline-none placeholder:text-ui-muted md:text-base"
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                if (value) onChange('');
                else handleSetExpanded(false);
              }}
              onBlur={() => {
                if (!value) handleSetExpanded(false);
              }}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => handleSetExpanded(true)}
            aria-label={`Open ${label}`}
            aria-expanded="false"
            className="flex h-full w-full items-center justify-center rounded-compact text-ui-muted-strong outline-none transition-[transform,color] hover:text-ui-ink active:scale-90 focus-ring"
          >
            <AppIcon name="search" size={18} />
          </button>
        )}

        <AnimatePresence>
          {isExpanded && value && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                inputRef.current?.focus();
              }}
              aria-label={`Clear ${label}`}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ui-muted outline-none hover:text-ui-ink focus-ring"
            >
              <AppIcon name="close" size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
