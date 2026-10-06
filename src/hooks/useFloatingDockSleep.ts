import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';

export interface UseFloatingDockSleepOptions {
  /** Optional external ref to bind to the dock element. */
  ref?: RefObject<HTMLDivElement | null>;
  /** If false, sleep mode is disabled and the dock remains fully visible. Defaults to true. */
  enabled?: boolean;
  /** Keep the dock awake while a sub-menu, popover, or interaction is open. */
  isLockedAwake?: boolean;
  /** Initial delay before sleeping on mount so dock is visible when first opened. Defaults to 1800ms. */
  initialAwakeMs?: number;
  /** Inactivity delay before sleeping when cursor rests over the dock without moving. Defaults to 2000ms. */
  idleTimeoutMs?: number;
  /** Grace delay after mouse leaves before sleeping. Defaults to 300ms. */
  leaveDelayMs?: number;
  /** Delay after clicking an action before sleeping. Defaults to 400ms. */
  clickDelayMs?: number;
  /** Optional callback fired when the mouse leaves and the dock prepares to sleep. */
  onMouseLeave?: () => void;
}

export interface UseFloatingDockSleepReturn {
  dockRef: RefObject<HTMLDivElement | null>;
  isAsleep: boolean;
  wake: () => void;
  sleep: (delay?: number) => void;
  dockProps: {
    onMouseEnter: () => void;
    onMouseMove: () => void;
    onMouseLeave: () => void;
    onClick: (event: MouseEvent) => void;
    onTouchStart: () => void;
    onPointerDown: () => void;
  };
}

/**
 * Manages Ghost / Sleep mode for floating bottom docks.
 *
 * Single-state architecture (`isAwake`):
 * - Mouse entry, cursor movement, or touch/pointer down calls `wake()`.
 * - Leaving, outside taps/clicks, keyboard shortcuts, or post-click debounce call `sleep(delay)`.
 * - Stationary inactivity transitions to sleep automatically after `idleTimeoutMs` (2s).
 * - Supported across desktop (hover/pointer) and mobile (touch/tap).
 */
export function useFloatingDockSleep({
  ref: externalRef,
  enabled = true,
  isLockedAwake = false,
  initialAwakeMs = 1800,
  idleTimeoutMs = 2000,
  leaveDelayMs = 300,
  clickDelayMs = 400,
  onMouseLeave: customOnMouseLeave,
}: UseFloatingDockSleepOptions = {}): UseFloatingDockSleepReturn {
  const internalRef = useRef<HTMLDivElement>(null);
  const dockRef = externalRef ?? internalRef;

  const [isAwake, setIsAwake] = useState(true);
  const timerRef = useRef<number | null>(null);

  // Store options in refs so sleep/wake have stable identity and don't re-trigger timers on re-render
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const isLockedAwakeRef = useRef(isLockedAwake);
  isLockedAwakeRef.current = isLockedAwake;
  const onMouseLeaveRef = useRef(customOnMouseLeave);
  onMouseLeaveRef.current = customOnMouseLeave;
  const idleTimeoutMsRef = useRef(idleTimeoutMs);
  idleTimeoutMsRef.current = idleTimeoutMs;
  const leaveDelayMsRef = useRef(leaveDelayMs);
  leaveDelayMsRef.current = leaveDelayMs;
  const clickDelayMsRef = useRef(clickDelayMs);
  clickDelayMsRef.current = clickDelayMs;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const sleep = useCallback(
    (delay = 0) => {
      clearTimer();
      if (!enabledRef.current || isLockedAwakeRef.current) return;

      const commitSleep = () => {
        // A menu may have opened while this delayed sleep was pending (the toggle click schedules it first).
        if (isLockedAwakeRef.current) {
          timerRef.current = null;
          return;
        }
        setIsAwake(false);
        onMouseLeaveRef.current?.();
        if (dockRef.current?.contains(document.activeElement)) {
          (document.activeElement as HTMLElement)?.blur();
        }
        timerRef.current = null;
      };

      if (delay > 0) {
        timerRef.current = window.setTimeout(commitSleep, delay);
      } else {
        commitSleep();
      }
    },
    [clearTimer, dockRef],
  );

  const wake = useCallback(() => {
    if (!enabledRef.current) return;
    clearTimer();
    setIsAwake(true);
    if (!isLockedAwakeRef.current) {
      timerRef.current = window.setTimeout(() => sleep(0), idleTimeoutMsRef.current);
    }
  }, [clearTimer, sleep]);

  // Initial mount: keep dock visible for initialAwakeMs so user sees controls, then idle
  useEffect(() => {
    if (!enabled || isLockedAwake) return;
    const initialTimer = window.setTimeout(() => {
      setIsAwake(false);
    }, initialAwakeMs);

    return () => window.clearTimeout(initialTimer);
  }, [enabled, isLockedAwake, initialAwakeMs]);

  // Click handler: after selecting an option, sleep automatically after clickDelayMs
  const handleClick = (event: MouseEvent) => {
    if (!enabledRef.current) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[aria-haspopup="menu"]') && isLockedAwakeRef.current) return;
    sleep(clickDelayMsRef.current);
  };

  // Keyboard shortcut listener (Space, Enter, typing outside the dock)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      if (isLockedAwakeRef.current || dockRef.current?.contains(document.activeElement)) return;
      sleep(clickDelayMsRef.current);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, sleep, dockRef]);

  // Outside click listener (canvas, cards, continue buttons)
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && dockRef.current && !dockRef.current.contains(target)) {
        sleep(clickDelayMsRef.current);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [enabled, sleep, dockRef]);

  useEffect(() => clearTimer, [clearTimer]);

  const isAsleep = enabled && !isLockedAwake && !isAwake;

  return {
    dockRef,
    isAsleep,
    wake,
    sleep,
    dockProps: {
      onMouseEnter: wake,
      onMouseMove: wake,
      onMouseLeave: () => sleep(leaveDelayMsRef.current),
      onClick: handleClick,
      onTouchStart: wake,
      onPointerDown: wake,
    },
  };
}
