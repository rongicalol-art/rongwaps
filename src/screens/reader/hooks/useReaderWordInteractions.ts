import { useState, useRef, useCallback, useEffect } from 'react';
import type { PhraseChunk } from '../../../utils/rubyPinyin';
import { useAppStore } from '../../../store/useAppStore';
import type { AnchorRect } from '../utils/readerTooltipPosition';

export interface HoveredWordState {
  chunkKey: string;
  text: string;
  pinyin?: string;
  anchor: {
    x: number;
    top: number;
    bottom: number;
  };
  anchorRect: AnchorRect;
}

interface UseReaderWordInteractionsOptions {
  onPlayLine?: (lineIndex: number) => void;
  onPlayRange?: (startSec: number, endSec: number) => void;
  /** Gate the passive desktop definition window (hover). */
  showHoverDefinitions?: boolean;
}

/**
 * Word interaction model for the reader:
 * - Tap (pointer up, no drag) -> plays the surrounding sentence range.
 * - Long-press (350ms) -> jumps straight to the breakdown.
 * - Hover (desktop, gated by the "hover definitions" preference) -> the
 *   definition window.
 * Tap is an audio gesture; lookup lives on hover (desktop) and long-press.
 */
export function useReaderWordInteractions({
  onPlayLine,
  onPlayRange,
  showHoverDefinitions = true,
}: UseReaderWordInteractionsOptions) {
  const [holdingChunkKey, setHoldingChunkKey] = useState<string | null>(null);
  const [hoveredWord, setHoveredWord] = useState<HoveredWordState | null>(null);
  /** Which word the pointer is over right now — highlight first, no delay. */
  const [hoveredChunkKey, setHoveredChunkKey] = useState<string | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowKeyRef = useRef<string | null>(null);
  const isHoldTriggeredRef = useRef(false);
  const isScrolledRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeChunkRef = useRef<{ chunk: PhraseChunk; chunkKey: string } | null>(null);

  const cancelHoldTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearHoverTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const clearHoveredWord = useCallback(() => {
    clearHoverTimers();
    setHoveredWord(null);
    setHoveredChunkKey(null);
  }, [clearHoverTimers]);

  // Mirror of the open window's key so hover handlers can decide whether to
  // delay (no window yet) or swap instantly (window already open elsewhere).
  useEffect(() => {
    windowKeyRef.current = hoveredWord?.chunkKey ?? null;
  }, [hoveredWord]);

  useEffect(() => {
    const handleScroll = () => {
      clearHoveredWord();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      cancelHoldTimer();
      clearHoverTimers();
    };
  }, [cancelHoldTimer, clearHoverTimers, clearHoveredWord]);

  /** Opens the definition window anchored to `element` (hover / keyboard). */
  const openDefinitionWindow = useCallback(
    (chunk: PhraseChunk, chunkKey: string, element: HTMLElement) => {
      if (!chunk || chunk.isPunctuation) return;
      clearHoverTimers();
      const rect = element.getBoundingClientRect();
      const pinyin = chunk.rubyItems
        .map((item) => item.pinyin)
        .filter(Boolean)
        .join(' ');
      setHoveredWord({
        chunkKey,
        text: chunk.text,
        pinyin: pinyin || undefined,
        anchor: {
          x: rect.left + rect.width / 2,
          top: rect.top,
          bottom: rect.bottom,
        },
        anchorRect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
      });
    },
    [clearHoverTimers],
  );

  const handlePointerEnter = useCallback(
    (
      e: React.PointerEvent<HTMLSpanElement>,
      chunk: PhraseChunk,
      lineIndex: number | string,
      chunkIdx: number,
    ) => {
      if (e.pointerType === 'touch' || !showHoverDefinitions || chunk.isPunctuation) {
        return;
      }

      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      const chunkKey = `${lineIndex}-${chunkIdx}`;
      // 1. Character highlight is instant — no delay, so hover feels immediate.
      setHoveredChunkKey(chunkKey);

      // Capture the DOM node now: React nulls `currentTarget` once the event
      // handler returns, so it cannot be read inside the delayed callback.
      const element = e.currentTarget;

      // 2. Window: delay only on the FIRST open. Once a window is already up,
      // moving across words swaps it instantly.
      if (windowKeyRef.current !== null) {
        if (windowKeyRef.current !== chunkKey) {
          openDefinitionWindow(chunk, chunkKey, element);
        }
        return;
      }
      hoverTimerRef.current = setTimeout(() => {
        openDefinitionWindow(chunk, chunkKey, element);
      }, 100);
    },
    [openDefinitionWindow, showHoverDefinitions],
  );

  const handlePointerLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredChunkKey(null);
    leaveTimerRef.current = setTimeout(() => {
      setHoveredWord(null);
    }, 100);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setHoveredWord(null);
      setHoveredChunkKey(null);
    }, 100);
  }, []);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLSpanElement>,
      chunk: PhraseChunk,
      lineIndex: number | string,
      chunkIdx: number,
    ) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      clearHoveredWord();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      activeChunkRef.current = { chunk, chunkKey: `${lineIndex}-${chunkIdx}` };
      isHoldTriggeredRef.current = false;
      isScrolledRef.current = false;

      cancelHoldTimer();
      setHoldingChunkKey(`${lineIndex}-${chunkIdx}`);

      longPressTimerRef.current = setTimeout(() => {
        isHoldTriggeredRef.current = true;
        setHoldingChunkKey(null);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }

        const held = activeChunkRef.current;
        if (held) {
          useAppStore.getState().setDictionaryWord(held.chunk.text);
        }
      }, 350);
    },
    [cancelHoldTimer, clearHoveredWord],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!activeChunkRef.current) return;

      const dist = Math.hypot(
        e.clientX - startPosRef.current.x,
        e.clientY - startPosRef.current.y,
      );

      if (dist > 10) {
        cancelHoldTimer();
        clearHoveredWord();
        setHoldingChunkKey(null);
        isScrolledRef.current = true;
      }
    },
    [cancelHoldTimer, clearHoveredWord],
  );

  const handlePointerUp = useCallback(
    (
      e: React.PointerEvent<HTMLSpanElement>,
      _chunk: PhraseChunk,
      lineIndex: number,
      range?: { start?: number; end?: number },
    ) => {
      e.stopPropagation();
      cancelHoldTimer();
      setHoldingChunkKey(null);

      const wasScroll = isScrolledRef.current;
      const wasHold = isHoldTriggeredRef.current;
      isScrolledRef.current = false;
      isHoldTriggeredRef.current = false;
      activeChunkRef.current = null;

      if (wasScroll || wasHold) return;

      if (
        typeof range?.start === 'number' &&
        typeof range?.end === 'number' &&
        onPlayRange
      ) {
        onPlayRange(range.start, range.end);
      } else if (onPlayLine) {
        onPlayLine(lineIndex);
      }
    },
    [cancelHoldTimer, onPlayLine, onPlayRange],
  );

  const handlePointerCancel = useCallback(() => {
    cancelHoldTimer();
    clearHoveredWord();
    setHoldingChunkKey(null);
    isHoldTriggeredRef.current = false;
    isScrolledRef.current = false;
    activeChunkRef.current = null;
  }, [cancelHoldTimer, clearHoveredWord]);

  return {
    holdingChunkKey,
    hoveredWord,
    hoveredChunkKey,
    handlePointerEnter,
    handlePointerLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    clearHoveredWord,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
