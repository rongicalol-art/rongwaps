import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

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
  const longPressedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    if (disabled || event.button !== 0) return;

    clearTimer();
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onLongPress();
    }, delay);
  }, [clearTimer, delay, disabled, onLongPress]);

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
    longPressedRef.current = false;
  }, [clearTimer]);

  const onClick = useCallback((event: MouseEvent<T>) => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (!disabled) onTap(event);
  }, [disabled, onTap]);

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave: onPointerCancel,
    onContextMenu: (event: MouseEvent<T>) => event.preventDefault(),
    onClick,
  };
}
