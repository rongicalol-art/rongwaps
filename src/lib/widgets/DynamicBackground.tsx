import React, { memo } from 'react';
import { motion } from 'motion/react';

interface DynamicBackgroundProps {
  color?: string;
  accentColor?: string;
  patternOpacity?: number;
}

export const DynamicBackground = memo(function DynamicBackground({ 
  color = '#1CB0F6'
}: DynamicBackgroundProps) {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#F7F7F7]">
      {/* Very subtle ambient top glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-[40vh] opacity-20 transition-colors duration-700"
        style={{ 
          background: `linear-gradient(to bottom, ${color}22, transparent)`
        }}
      />
    </div>
  );
});
