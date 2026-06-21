import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { PiXBold } from 'react-icons/pi';
import { cn } from '../../utils/cn';
import { createPortal } from 'react-dom';

export interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  topAccessory?: React.ReactNode;
}

export function BottomDrawer({ isOpen, onClose, children, className, title, topAccessory }: BottomDrawerProps) {
  const dragControls = useDragControls();
  // Resolve portal target once on mount — no need to re-run on every isOpen change
  const [portalNode] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('activity-overlays-root') || document.body;
    }
    return null;
  });

  const output = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 pointer-events-auto"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] sm:max-w-lg md:max-w-xl sm:mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh] pointer-events-auto",
              className
            )}
          >
            {/* Top Accessory */}
            {topAccessory && (
              <div className="absolute bottom-[calc(100%-18px)] left-0 right-0 w-full flex justify-start z-[10] pointer-events-none px-4 md:px-6">
                <div className="pointer-events-auto w-full">
                  {topAccessory}
                </div>
              </div>
            )}

            {/* Handle */}
            <div 
              className="w-full flex justify-center pt-4 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
            >
              <div className="w-12 h-1.5 bg-[#E5E5E5] rounded-full" />
            </div>

            {/* Header (Optional) */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 shrink-0">
                <h3 className="text-xl font-extrabold text-[#4B4B4B] tracking-tight">{title}</h3>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center bg-[#F7F7F7] text-[#AFB6BB] rounded-full hover:bg-[#E5E5E5] hover:text-[#4B4B4B] transition-colors"
                  aria-label="Close drawer"
                >
                  <PiXBold size={18} />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 pb-[env(safe-area-inset-bottom,12px)] mb-8 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!portalNode) return output;
  return createPortal(output, portalNode);
}
