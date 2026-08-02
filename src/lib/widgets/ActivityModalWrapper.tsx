import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useModalFocus } from '../../hooks/useModalFocus';

interface ActivityModalWrapperProps {
  id: string;
  ariaLabel: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export const ActivityModalWrapper: React.FC<ActivityModalWrapperProps> = ({ id, ariaLabel, onClose, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const modalFocusProps = useModalFocus({
    containerRef,
    isActive: true,
    onEscape: onClose,
  });

  return (
    <motion.div
      ref={containerRef}
      key={id}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={modalFocusProps.onKeyDown}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[200] flex flex-col overflow-hidden bg-ui-practice-canvas overscroll-none pointer-events-auto"
    >
      {children}
      <div id="activity-overlays-root" className="absolute inset-0 z-[300] pointer-events-none" />
    </motion.div>
  );
};
