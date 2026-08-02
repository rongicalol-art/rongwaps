import React, { useRef, useEffect } from 'react';
import HanziWriter from 'hanzi-writer';
import { DESIGN_TOKENS } from '../../data/designTokens';
import { loadHanziCharacterData } from '../../services/contentAssetService';
import { resolveDesignTokenColor } from '../../utils/resolveDesignTokenColor';

interface StrokeOrderBoxProps {
  char: string;
  size?: number;
  accentHex?: string;
}

export function StrokeOrderBox({ char, size = 140, accentHex = '#1CB0F6' }: StrokeOrderBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<ReturnType<typeof HanziWriter.create> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const resolvedStrokeColor = resolveDesignTokenColor(accentHex, '#1CB0F6');
    const resolvedOutlineColor = resolveDesignTokenColor(DESIGN_TOKENS.color.border, '#C3C8CC');
    
    // Fallback/dummy writer if not hanzi, though we filter it in parent usually.
    const writer = HanziWriter.create(containerRef.current, char, {
      renderer: 'svg',
      width: size,
      height: size,
      padding: size * 0.08,
      showCharacter: true,
      showOutline: true,
      strokeColor: resolvedStrokeColor,
      outlineColor: resolvedOutlineColor,
      strokeAnimationSpeed: 2,
      delayBetweenStrokes: 100,
      delayBetweenLoops: 1500,
      charDataLoader: (requestedChar, onLoad, onError) => {
        loadHanziCharacterData(requestedChar).then(onLoad).catch(onError);
      },
    });
    writerRef.current = writer;
    
    writer.loopCharacterAnimation();

    return () => {
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
      }
    };
  }, [char, size, accentHex]);

  return (
     <div 
       className="relative rounded-[24px] overflow-hidden cursor-pointer active:scale-95 transition-transform"
       style={{ width: size, height: size }}
       onClick={() => writerRef.current?.loopCharacterAnimation?.()}
     >
        <div ref={containerRef} className="absolute inset-0 z-10" />
     </div>
  );
}
