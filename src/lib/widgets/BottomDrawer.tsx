import React, { useId, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { createPortal } from 'react-dom';
import { useModalFocus } from '../../hooks/useModalFocus';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';

export interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  topAccessory?: React.ReactNode;
  ariaLabel?: string;
  workspaceBound?: boolean;
  /** Override the portal container (defaults to #activity-overlays-root or body). */
  portalTarget?: HTMLElement | null;
}

export function BottomDrawer({
  isOpen,
  onClose,
  children,
  className,
  title,
  topAccessory,
  ariaLabel,
  workspaceBound = true,
  portalTarget,
}: BottomDrawerProps) {
  const dragControls = useDragControls();
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const modalFocusProps = useModalFocus({
    containerRef: drawerRef,
    isActive: isOpen,
    onEscape: onClose,
  });
  // Resolve portal target once on mount — no need to re-run on every isOpen change
  const [portalNode] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return portalTarget ?? (document.getElementById('activity-overlays-root') || document.body);
    }
    return null;
  });

  const output = (
    <AnimatePresence>
      {isOpen && (
        <div className={cn('fixed inset-0 z-[500] pointer-events-none', workspaceBound && 'workspace-window')}>
          {/* Backdrop */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 pointer-events-auto"
          />

          {/* Drawer content */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ? undefined : (ariaLabel ?? 'Drawer')}
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            onKeyDown={modalFocusProps.onKeyDown}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
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
              "absolute bottom-0 left-0 right-0 bg-ui-surface rounded-t-modal sm:max-w-lg md:max-w-xl sm:mx-auto shadow-ambient-lg flex flex-col max-h-[85vh] pointer-events-auto",
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
              <div className="w-12 h-1.5 bg-ui-divider rounded-full" />
            </div>

            {/* Header (Optional) */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 shrink-0">
                <h2 id={titleId} className="text-xl font-extrabold text-ui-ink tracking-normal">{title}</h2>
                <IconActionButton
                  onClick={onClose}
                  label="Close drawer"
                  icon={<AppIcon name="close" size={20} />}
                  className="h-11 w-11 rounded-full"
                />
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
