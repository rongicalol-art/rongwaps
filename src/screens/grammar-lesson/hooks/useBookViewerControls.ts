import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const CONTROLS_HIDE_DELAY = 2200;
const CONTROLS_EDGE_SIZE = 72;

export function useBookViewerControls() {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<number | null>(null);
  const controlsHoverRef = useRef(false);
  const controlsFocusRef = useRef(false);

  const cancelControlsHide = useCallback(() => {
    if (controlsHideTimerRef.current === null) return;
    window.clearTimeout(controlsHideTimerRef.current);
    controlsHideTimerRef.current = null;
  }, []);

  const hideControls = useCallback(() => {
    controlsHideTimerRef.current = null;
    if (controlsHoverRef.current || controlsFocusRef.current) return;
    setControlsVisible(false);
  }, []);

  const scheduleControlsHide = useCallback(() => {
    cancelControlsHide();
    controlsHideTimerRef.current = window.setTimeout(hideControls, CONTROLS_HIDE_DELAY);
  }, [cancelControlsHide, hideControls]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const handleControlsPointerEnter = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') controlsHoverRef.current = true;
    revealControls();
  }, [revealControls]);

  const handleControlsPointerLeave = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    controlsHoverRef.current = false;
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  const handleControlsFocus = useCallback(() => {
    controlsFocusRef.current = true;
    revealControls();
  }, [revealControls]);

  const handleControlsBlur = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    controlsFocusRef.current = false;
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  useEffect(() => {
    scheduleControlsHide();
    return cancelControlsHide;
  }, [cancelControlsHide, scheduleControlsHide]);

  useEffect(() => {
    const revealFromEdge = (event: PointerEvent) => {
      const isNearTop = event.clientY <= CONTROLS_EDGE_SIZE;
      const isNearBottom = event.clientY >= window.innerHeight - CONTROLS_EDGE_SIZE;
      if (isNearTop || isNearBottom) revealControls();
    };

    window.addEventListener('pointermove', revealFromEdge, { passive: true });
    window.addEventListener('pointerdown', revealFromEdge, { passive: true });
    return () => {
      window.removeEventListener('pointermove', revealFromEdge);
      window.removeEventListener('pointerdown', revealFromEdge);
    };
  }, [revealControls]);

  const controlVisibilityClass = controlsVisible
    ? 'pointer-events-auto opacity-100'
    : 'pointer-events-none opacity-0';

  return {
    controlsVisible,
    controlVisibilityClass,
    revealControls,
    scheduleControlsHide,
    handleControlsPointerEnter,
    handleControlsPointerLeave,
    handleControlsFocus,
    handleControlsBlur,
  };
}
