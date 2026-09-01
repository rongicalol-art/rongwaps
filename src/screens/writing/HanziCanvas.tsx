import React, { useRef, useEffect, useCallback } from 'react';
import type HanziWriterType from 'hanzi-writer';
import { DESIGN_TOKENS } from '../../data/designTokens';
import { loadHanziCharacterData } from '../../services/contentAssetService';
import { resolveDesignTokenColor } from '../../utils/resolveDesignTokenColor';

type HanziWriterModule = typeof HanziWriterType;
type HanziWriterInstance = ReturnType<HanziWriterModule['create']>;

export function HanziCanvas({ 
  char, 
  status, 
  onComplete,
  size = 280,
  showOutline = true,
  accentHex = DESIGN_TOKENS.color.brand.primary,
  accentBorder = 'border-brand-primary',
  bgAccent
}: { 
  char: string; 
  status: 'idle' | 'quizzing' | 'completed'; 
  onComplete: () => void;
  size?: number;
  showOutline?: boolean;
  accentHex?: string;
  accentBorder?: string;
  bgAccent?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let canceled = false;
    const resolvedStrokeColor = resolveDesignTokenColor(accentHex, '#1CB0F6');
    const resolvedDangerColor = resolveDesignTokenColor(DESIGN_TOKENS.color.feedback.danger, '#FF4B4B');
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
        showCharacter: false,
        showHintAfterMisses: 1,
        showOutline: true,
        strokeColor: resolvedStrokeColor,
        highlightColor: resolvedDangerColor,
        outlineColor: resolvedOutlineColor,
        drawingWidth: Math.max(10, size * 0.08),
        charDataLoader: (requestedChar, onLoad, onError) => {
          loadHanziCharacterData(requestedChar).then(onLoad).catch(onError);
        },
      });
      writerRef.current = writer;
    });

    return () => {
      canceled = true;
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
        writerRef.current = null;
      }
    };
  }, [accentHex, char, size]);

  useEffect(() => {
    if (!writerRef.current) return;
    if (showOutline) {
      writerRef.current.showOutline();
    } else {
      writerRef.current.hideOutline();
    }
  }, [showOutline]);

  useEffect(() => {
    if (!writerRef.current) return;
    
    if (status === 'quizzing') {
      writerRef.current.hideCharacter();
      writerRef.current.quiz({
        onComplete: onComplete,
      });
    } else if (status === 'completed') {
      writerRef.current.cancelQuiz();
      writerRef.current.showCharacter();
    } else {
      // idle
      writerRef.current.cancelQuiz();
      writerRef.current.hideCharacter();
    }
  }, [status, onComplete]);

  return (
    <div className="relative mx-auto rounded-modal transform-none" style={{ width: size, height: size }}>
      <div 
        className={`absolute inset-0 overflow-hidden rounded-modal border-2 bg-ui-canvas transition-all duration-300 ${status === 'completed' ? `${accentBorder} ${bgAccent}` : (status === 'quizzing' ? `${accentBorder} bg-ui-surface` : 'border-ui-border opacity-70')}`}
      >
        {/* Background Grid Lines (Tiánzìgé format) */}
        <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-full h-[2px] border-t-2 border-dashed border-ui-muted" />
          <div className="absolute h-full w-[2px] border-l-2 border-dashed border-ui-muted" />
        </div>
      </div>
      <div 
        ref={containerRef} 
        role="group"
        aria-label={`Draw the Chinese character ${char} using its stroke order`}
        className="absolute inset-0 z-10"
        style={{ touchAction: 'none' }} // Prevents browser scroll while drawing
      />
    </div>
  );
}

interface SingleCharProps {
  char: string;
  status: 'idle' | 'quizzing' | 'completed';
  onComplete: () => void;
  size?: number;
  showOutline?: boolean;
  accentHex?: string;
  accentBorder?: string;
  textAccent?: string;
  bgAccent?: string;
}

function NonHanziCharacter({ char, status, onComplete, size, accentBorder, textAccent, bgAccent }: Required<Pick<SingleCharProps, 'char' | 'status' | 'onComplete' | 'size'>> & Pick<SingleCharProps, 'accentBorder' | 'textAccent' | 'bgAccent'>) {
  useEffect(() => {
    if (status !== 'quizzing') return;
    const timer = window.setTimeout(onComplete, 300);
    return () => window.clearTimeout(timer);
  }, [onComplete, status]);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-0 flex items-center justify-center rounded-[32px] border-2 bg-ui-canvas font-chinese transition-all duration-300 md:rounded-[40px] ${status === 'completed' ? `${textAccent} ${accentBorder} ${bgAccent}` : 'text-ui-border border-ui-border'}`}
      >
        <span style={{ fontSize: size * 0.5 }}>{char}</span>
      </div>
    </div>
  );
}

export function SingleChar({ char, status, onComplete, size = 280, showOutline = true, accentHex, accentBorder, textAccent, bgAccent }: SingleCharProps) {
  const isHanzi = /[\u4e00-\u9fa5\u3400-\u4dbf\u2e80-\u2fdf]/.test(char);
  const handleComplete = useCallback(onComplete, [onComplete]);

  if (!isHanzi) {
    return (
      <NonHanziCharacter
        char={char}
        status={status}
        onComplete={handleComplete}
        size={size}
        accentBorder={accentBorder}
        textAccent={textAccent}
        bgAccent={bgAccent}
      />
    );
  }

  return <HanziCanvas char={char} status={status} onComplete={handleComplete} size={size} showOutline={showOutline} accentHex={accentHex} accentBorder={accentBorder} bgAccent={bgAccent} />;
}
