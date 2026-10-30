import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

const LONG_PRESS_SLOP_PX = 10;

interface UseLongPressOptions<T extends HTMLElement> {
  onTap: (event: MouseEvent<T>) => void;
  onLongPress: () => void;
  delay?: number;
  disabled?: boolean;
}

export function useLongPress<T extends HTMLElement>({
  onTap,
  onLongPress,
  delay = 450,
  disabled = false,
}: UseLongPressOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = null;
  }, []);

  useEffect(() => () => {
    clearTimer();
    clearSafetyTimer();
  }, [clearSafetyTimer, clearTimer]);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    if (disabled || event.button !== 0) return;

    clearTimer();
    clearSafetyTimer();
    longPressedRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };

    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      timerRef.current = null;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
      onLongPress();
      safetyTimerRef.current = setTimeout(() => {
        longPressedRef.current = false;
        safetyTimerRef.current = null;
      }, 800);
    }, delay);
  }, [clearSafetyTimer, clearTimer, delay, disabled, onLongPress]);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (!startPosRef.current || timerRef.current === null) return;
    const dist = Math.hypot(
      event.clientX - startPosRef.current.x,
      event.clientY - startPosRef.current.y,
    );
    if (dist > LONG_PRESS_SLOP_PX) {
      clearTimer();
    }
  }, [clearTimer]);

  const onPointerUp = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const onPointerLeave = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const onClick = useCallback((event: MouseEvent<T>) => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      clearSafetyTimer();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!disabled) onTap(event);
  }, [clearSafetyTimer, disabled, onTap]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onContextMenu: (event: MouseEvent<T>) => event.preventDefault(),
    onClick,
  };
}
