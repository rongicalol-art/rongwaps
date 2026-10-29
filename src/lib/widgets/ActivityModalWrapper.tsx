import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useModalFocus } from '../../hooks/useModalFocus';
import { getWindowMotion } from './windowMotion';

interface ActivityModalWrapperProps {
  id: string;
  ariaLabel: string;
  onClose?: () => void;
  /** False skips the enter fade, e.g. when a loader on the same canvas was already showing. */
  animateIn?: boolean;
  children: React.ReactNode;
}

export const ActivityModalWrapper: React.FC<ActivityModalWrapperProps> = ({ id, ariaLabel, onClose, animateIn = true, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const motionSpec = getWindowMotion('rise', useReducedMotion());
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
      initial={animateIn ? motionSpec.initial : false}
      animate={motionSpec.animate}
      exit={motionSpec.exit}
      transition={motionSpec.transition}
      className="absolute inset-0 z-activity flex origin-bottom flex-col overflow-hidden bg-ui-practice-canvas overscroll-none pointer-events-auto outline-none"
    >
      {children}
      <div id="activity-overlays-root" className="absolute inset-0 z-overlay pointer-events-none" />
    </motion.div>
  );
};
