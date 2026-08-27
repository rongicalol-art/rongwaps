import React, { useRef, useEffect, useState } from 'react';
import type HanziWriterType from 'hanzi-writer';
import { useReducedMotion } from 'motion/react';
import { DESIGN_TOKENS } from '../../../data/designTokens';
import { loadHanziCharacterData } from '../../../services/contentAssetService';
import { resolveDesignTokenColor } from '../../../utils/resolveDesignTokenColor';

type HanziWriterModule = typeof HanziWriterType;
type HanziWriterInstance = ReturnType<HanziWriterModule['create']>;

interface StrokeOrderBoxProps {
  char: string;
  size?: number;
  accentHex?: string;
  className?: string;
}

export function StrokeOrderBox({ char, size = 140, accentHex = DESIGN_TOKENS.color.brand.primary, className = '' }: StrokeOrderBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);
  const reduceMotion = useReducedMotion();
  const [strokeDataFailed, setStrokeDataFailed] = useState(false);

  useEffect(() => {
    setStrokeDataFailed(false);
    const container = containerRef.current;
    let canceled = false;

    const resolvedStrokeColor = resolveDesignTokenColor(accentHex, '#1CB0F6');
    const resolvedOutlineColor = resolveDesignTokenColor(DESIGN_TOKENS.color.border, '#C3C8CC');

    // Load hanzi-writer on first use so it is code-split out of the main bundle.
    import('hanzi-writer')
      .then(({ default: HanziWriter }) => {
        if (canceled || !container) return;
        container.innerHTML = '';
        const writer = HanziWriter.create(container, char, {
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
            loadHanziCharacterData(requestedChar)
              .then((data) => {
                if (!canceled) onLoad(data);
              })
              .catch((error) => {
                console.error(`Stroke data unavailable for ${requestedChar}`, error);
                if (!canceled) setStrokeDataFailed(true);
                onError(error);
              });
          },
        });
        writerRef.current = writer;
        if (!reduceMotion) writer.loopCharacterAnimation();
      })
      .catch((error) => {
        console.error('Failed to load hanzi-writer module', error);
        if (!canceled) setStrokeDataFailed(true);
      });

    return () => {
      canceled = true;
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
        writerRef.current = null;
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [char, size, accentHex, reduceMotion]);

  return (
     <button
       type="button"
       aria-label={`Replay stroke order for ${char}`}
       disabled={strokeDataFailed}
       className={`relative overflow-hidden rounded-feature outline-none transition-transform active:scale-95 focus-visible:ring-4 focus-visible:ring-brand-primary/25 disabled:cursor-default disabled:active:scale-100 ${className}`}
       style={{ width: size, height: size }}
       onClick={() => writerRef.current?.loopCharacterAnimation?.()}
     >
        <div
          ref={containerRef}
          className={`absolute inset-0 z-10 ${strokeDataFailed ? 'invisible' : ''}`}
        />
        {strokeDataFailed && (
          <span
            aria-hidden="true"
            className="absolute inset-0 z-20 flex items-center justify-center font-chinese font-black leading-none"
            style={{ fontSize: size * 0.62, color: resolveDesignTokenColor(accentHex, '#1CB0F6') }}
          >
            {char}
          </span>
        )}
     </button>
  );
}
