import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type HanziWriterType from 'hanzi-writer';
import { DESIGN_TOKENS } from '../../data/designTokens';
import { loadHanziCharacterData } from '../../services/contentAssetService';
import { resolveDesignTokenColor } from '../../utils/browser/resolveDesignTokenColor';

type HanziWriterModule = typeof HanziWriterType;
type HanziWriterInstance = ReturnType<HanziWriterModule['create']>;

export function HanziCanvas({ 
  char, 
  status, 
  onComplete,
  size = 280,
  showOutline = true,
  animateSignal = 0,
  onAnimationStart,
  onAnimationEnd,
  accentHex = DESIGN_TOKENS.color.brand.primary,
  appearance = 'tile',
}: { 
  char: string; 
  status: 'idle' | 'quizzing' | 'completed'; 
  onComplete: () => void;
  size?: number;
  showOutline?: boolean;
  animateSignal?: number;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  accentHex?: string;
  accentEdge?: string;
  bgAccent?: string;
  appearance?: 'tile' | 'inline';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [strokeState, setStrokeState] = useState<'loading' | 'ready' | 'error'>('loading');
  const reduceMotion = useReducedMotion();
  const [writer, setWriter] = useState<HanziWriterInstance | null>(null);
  const isAnimatingRef = useRef(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onAnimationStartRef = useRef(onAnimationStart);
  onAnimationStartRef.current = onAnimationStart;
  const onAnimationEndRef = useRef(onAnimationEnd);
  onAnimationEndRef.current = onAnimationEnd;
  const showOutlineRef = useRef(showOutline);
  showOutlineRef.current = showOutline;
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!containerRef.current) return;
    let canceled = false;
    setStrokeState('loading');
    const resolvedStrokeColor = resolveDesignTokenColor(accentHex, '#0284C7');
    const resolvedDangerColor = resolveDesignTokenColor(DESIGN_TOKENS.color.feedback.danger, '#FF4B4B');
    const resolvedOutlineColor = resolveDesignTokenColor(appearance === 'inline' ? DESIGN_TOKENS.color.divider : DESIGN_TOKENS.color.border, '#C3C8CC');

    let currentWriter: HanziWriterInstance | null = null;

    // Load hanzi-writer on first use so it is code-split out of the main bundle.
    import('hanzi-writer').then(({ default: HanziWriter }) => {
      if (canceled || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      const writerInstance = HanziWriter.create(containerRef.current, char, {
        renderer: 'svg',
        width: size,
        height: size,
        padding: size * 0.08,
        showCharacter: false,
        showHintAfterMisses: 1,
        highlightOnComplete: false,
        showOutline: true,
        strokeColor: resolvedStrokeColor,
        ...(appearance === 'inline' ? { drawingColor: resolvedStrokeColor } : {}),
        highlightColor: resolvedDangerColor,
        outlineColor: resolvedOutlineColor,
        drawingWidth: Math.max(10, size * 0.08),
        strokeAnimationSpeed: 1.8,
        delayBetweenStrokes: 180,
        strokeFadeDuration: 250,
        leniency: 1.5,
        charDataLoader: (requestedChar, onLoad, onError) => {
          loadHanziCharacterData(requestedChar).then(data => {
            if (canceled) return;
            onLoad(data);
            setStrokeState('ready');
          }).catch(error => {
            if (!canceled) setStrokeState('error');
            onError(error);
          });
        },
      });

      currentWriter = writerInstance;

      // Immediately initialize outline state
      if (showOutlineRef.current) {
        writerInstance.showOutline();
      } else {
        writerInstance.hideOutline();
      }

      // Immediately initialize quiz mode if status is quizzing
      if (statusRef.current === 'quizzing') {
        writerInstance.hideCharacter();
        writerInstance.quiz({
          showHintAfterMisses: 1,
          leniency: 1.5,
          onComplete: () => onCompleteRef.current(),
        });
      } else if (statusRef.current === 'completed') {
        writerInstance.showCharacter();
      }

      setWriter(writerInstance);
    }).catch(() => { if (!canceled) setStrokeState('error'); });

    return () => {
      canceled = true;
      setWriter(null);
      if (currentWriter) {
        currentWriter.cancelQuiz();
      }
    };
  }, [accentHex, char, size, appearance]);

  useEffect(() => {
    if (!writer) return;
    if (showOutline) {
      writer.showOutline();
    } else {
      writer.hideOutline();
    }
  }, [writer, showOutline]);

  useEffect(() => {
    if (!writer) return;
    if (isAnimatingRef.current) return;
    
    if (status === 'quizzing') {
      writer.hideCharacter();
      writer.quiz({
        showHintAfterMisses: 1,
        leniency: 1.5,
        onComplete: () => onCompleteRef.current(),
      });
    } else if (status === 'completed') {
      writer.cancelQuiz();
      writer.showCharacter();
    } else {
      // idle
      writer.cancelQuiz();
      writer.hideCharacter();
    }
  }, [writer, status]);

  // Handle on-demand stroke order animation
  useEffect(() => {
    if (!writer || !animateSignal) return;
    if (appearance === 'inline' && reduceMotion) {
      writer.cancelQuiz();
      writer.showCharacter();
      return;
    }

    let canceled = false;
    isAnimatingRef.current = true;
    onAnimationStartRef.current?.();

    writer.cancelQuiz();
    writer.showOutline();

    let finished = false;
    const finishAnimation = () => {
      if (finished) return;
      finished = true;
      isAnimatingRef.current = false;
      onAnimationEndRef.current?.();

      if (!canceled && statusRef.current === 'quizzing') {
        if (!showOutlineRef.current) {
          writer.hideOutline();
        } else {
          writer.showOutline();
        }
        writer.hideCharacter();
        writer.quiz({
          onComplete: () => onCompleteRef.current(),
        });
      }
    };

    const animPromise = writer.animateCharacter({
      onComplete: finishAnimation,
    });

    animPromise?.catch?.(() => {
      finishAnimation();
    });

    return () => {
      canceled = true;
      isAnimatingRef.current = false;
      onAnimationEndRef.current?.();
      if (writer) {
        writer.cancelQuiz();
      }
    };
  }, [writer, animateSignal, appearance, reduceMotion]);

  return (
    <div
      data-canvas-container="true"
      aria-busy={strokeState === 'loading'}
      className="relative mx-auto select-none pointer-events-auto"
      style={{ width: size, height: size }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className={appearance === 'inline' ? 'pointer-events-none absolute inset-0' : 'absolute inset-0 overflow-hidden rounded-feature bg-ui-surface border-0 border-b-[length:var(--depth-lg)] border-b-ui-border shadow-ambient-sm'}
      >
        {/* Background Grid Lines (Tiánzìgé format) */}
        <div className={`absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-center ${appearance === 'inline' ? 'opacity-65' : 'opacity-30'}`}>
          <div className={appearance === 'inline' ? 'w-full border-t border-dashed border-ui-divider' : 'w-full h-[2px] border-t-2 border-dashed border-ui-muted'} />
          <div className={appearance === 'inline' ? 'absolute h-full border-l border-dashed border-ui-divider' : 'absolute h-full w-[2px] border-l-2 border-dashed border-ui-muted'} />
        </div>
      </div>
      {appearance === 'inline' && strokeState !== 'ready' && <span role={strokeState === 'error' ? 'alert' : 'status'} className="absolute inset-0 z-20 flex items-center justify-center px-4 text-center text-sm font-bold text-ui-muted-strong">
        {strokeState === 'error' ? 'Stroke data unavailable. Try again.' : 'Loading strokes…'}
      </span>}
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
  animateSignal?: number;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  accentHex?: string;
}

function NonHanziCharacter({
  char,
  status,
  onComplete,
  size,
}: Pick<SingleCharProps, 'char' | 'status' | 'onComplete' | 'size'> & { size: number }) {
  useEffect(() => {
    if (status !== 'quizzing') return;
    const timer = window.setTimeout(onComplete, 300);
    return () => window.clearTimeout(timer);
  }, [onComplete, status]);

  return (
    <div
      data-canvas-container="true"
      className="relative mx-auto select-none pointer-events-auto"
      style={{ width: size, height: size }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 flex items-center justify-center rounded-feature border-0 border-b-[length:var(--depth-lg)] border-b-ui-border bg-ui-surface font-chinese text-ui-ink-strong shadow-ambient-sm"
      >
        <span style={{ fontSize: size * 0.5 }}>{char}</span>
      </div>
    </div>
  );
}

export function SingleChar({
  char,
  status,
  onComplete,
  size = 280,
  showOutline = true,
  animateSignal = 0,
  onAnimationStart,
  onAnimationEnd,
  accentHex,
}: SingleCharProps) {
  const isHanzi = /[\u4e00-\u9fa5\u3400-\u4dbf\u2e80-\u2fdf]/.test(char);
  const handleComplete = useCallback(onComplete, [onComplete]);

  if (!isHanzi) {
    return (
      <NonHanziCharacter
        char={char}
        status={status}
        onComplete={handleComplete}
        size={size}
      />
    );
  }

  return (
    <HanziCanvas
      char={char}
      status={status}
      onComplete={handleComplete}
      size={size}
      showOutline={showOutline}
      animateSignal={animateSignal}
      onAnimationStart={onAnimationStart}
      onAnimationEnd={onAnimationEnd}
      accentHex={accentHex}
    />
  );
}
