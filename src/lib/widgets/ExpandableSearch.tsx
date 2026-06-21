import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiMagnifyingGlassBold, PiXBold } from 'react-icons/pi';

interface ExpandableSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isExpanded?: boolean;
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ExpandableSearch({ 
  value, 
  onChange, 
  placeholder = "Search...", 
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
        className={`w-full min-w-[44px] relative flex items-center h-[44px] rounded-[16px] overflow-hidden ${
          isExpanded 
            ? 'bg-white border-[3px] border-b-[5px] border-[#E5E5E5]' 
            : 'bg-white border-[3px] border-b-[5px] border-[#E5E5E5] hover:bg-[#F7F7F7] cursor-pointer transition-colors'
        }`}
        onClick={() => {
          if (!isExpanded) {
            handleSetExpanded(true);
          }
        }}
      >
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-center w-[40px] transition-colors ${
            isExpanded ? 'text-[#AFB6BB] pointer-events-none' : 'text-[#4B4B4B]'
          }`}
        >
          <PiMagnifyingGlassBold size={18} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isExpanded ? placeholder : ""}
          className="w-full h-full bg-transparent outline-none font-bold text-[#4B4B4B] pl-[38px] pr-10 pb-0.5 text-[16px] md:text-md"
          onBlur={() => {
            if (!value) handleSetExpanded(false);
          }}
        />

        <AnimatePresence>
          {isExpanded && value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-[#AFB6BB] hover:text-[#4B4B4B] cursor-pointer outline-none"
            >
              <PiXBold size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
