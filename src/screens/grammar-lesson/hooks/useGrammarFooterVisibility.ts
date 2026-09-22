import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Hide/reveal behavior for the bottom continue footer (matching Reader mode):
 * scrolling down hides it, scrolling up reveals it, and hovering the bottom
 * trigger zone reveals it until the pointer leaves. Resets per page.
 */
export function useGrammarFooterVisibility(
  mainRef: RefObject<HTMLElement | null>,
  resetKey: unknown,
) {
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const lastScrollY = useRef(0);
  const isHoveringBottomRef = useRef(false);
  const wasHoverRevealedRef = useRef(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBottomHoverEnter = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    isHoveringBottomRef.current = true;
    setIsFooterVisible((currentVisible) => {
      if (!currentVisible) {
        wasHoverRevealedRef.current = true;
      }
      return true;
    });
  }, []);

  const handleBottomHoverLeave = useCallback(() => {
    isHoveringBottomRef.current = false;
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      if (wasHoverRevealedRef.current) {
        wasHoverRevealedRef.current = false;
        setIsFooterVisible(false);
      }
    }, 80);
  }, []);

  // Scroll listener for dynamic hide/reveal of bottom continue footer (matching Reader mode)
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      if (isHoveringBottomRef.current) return;

      const currentScrollY = main.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) > 8) {
        if (delta > 0 && currentScrollY > 40) {
          wasHoverRevealedRef.current = false;
          setIsFooterVisible((prev) => (prev ? false : prev));
        } else if (delta < 0) {
          wasHoverRevealedRef.current = false;
          setIsFooterVisible((prev) => (!prev ? true : prev));
        }
      }

      lastScrollY.current = currentScrollY;
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [mainRef, resetKey]);

  const resetFooter = useCallback(() => {
    lastScrollY.current = 0;
    isHoveringBottomRef.current = false;
    wasHoverRevealedRef.current = false;
    setIsFooterVisible(true);
  }, []);

  useEffect(() => () => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
  }, []);

  return { isFooterVisible, handleBottomHoverEnter, handleBottomHoverLeave, resetFooter };
}
