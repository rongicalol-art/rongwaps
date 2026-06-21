import React from 'react';
import { motion } from 'motion/react';

interface ActivityModalWrapperProps {
  id: string;
  children: React.ReactNode;
}

export const ActivityModalWrapper: React.FC<ActivityModalWrapperProps> = ({ id, children }) => {
  return (
    <motion.div
      key={id}
      id={id}
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 z-[200] bg-[#F7F7F7] overflow-hidden shadow-sm flex flex-col overscroll-none pointer-events-auto"
    >
      {children}
      <div id="activity-overlays-root" className="absolute inset-0 z-[300] pointer-events-none" />
    </motion.div>
  );
};
