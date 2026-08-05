import React, { useRef, useEffect } from 'react';
import type HanziWriterType from 'hanzi-writer';
import { DESIGN_TOKENS } from '../../data/designTokens';
import { loadHanziCharacterData } from '../../services/contentAssetService';
import { resolveDesignTokenColor } from '../../utils/resolveDesignTokenColor';

type HanziWriterModule = typeof HanziWriterType;
type HanziWriterInstance = ReturnType<HanziWriterModule['create']>;

interface StrokeOrderBoxProps {
  char: string;
  size?: number;
  accentHex?: string;
}

export function StrokeOrderBox({ char, size = 140, accentHex = '#1CB0F6' }: StrokeOrderBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let canceled = false;

    const resolvedStrokeColor = resolveDesignTokenColor(accentHex, '#1CB0F6');
    const resolvedOutlineColor = resolveDesignTokenColor(DESIGN_TOKENS.color.border, '#C3C8CC');

    // Load hanzi-writer on first use so it is code-split out of the main bundle.
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (canceled || !containerRef.current) return;
      containerRef.current.innerHTML = '';
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
    });

    return () => {
      canceled = true;
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
        writerRef.current = null;
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
