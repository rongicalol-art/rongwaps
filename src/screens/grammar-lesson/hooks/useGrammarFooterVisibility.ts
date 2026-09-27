import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Reveal behavior for the bottom continue footer in grammar lessons:
 * Appears only when scrolled to the very bottom ("downest"), or if the
 * page content fits completely on screen without scrolling.
 */
export function useGrammarFooterVisibility(
  mainRef: RefObject<HTMLElement | null>,
  resetKey: unknown,
) {
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  const checkScrollPosition = useCallback(() => {
    const main = mainRef.current;
    if (!main) return;

    // If the content is not scrollable (fits on screen), show the footer immediately.
    const isScrollable = main.scrollHeight > main.clientHeight + 24;
    if (!isScrollable) {
      setIsFooterVisible(true);
      return;
    }

    // "Downest": within 48px of the very bottom of the scroll container
    const distanceFromBottom = main.scrollHeight - main.scrollTop - main.clientHeight;
    if (distanceFromBottom <= 48) {
      setIsFooterVisible(true);
    } else if (distanceFromBottom > 96) {
      setIsFooterVisible(false);
    }
  }, [mainRef]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    main.addEventListener('scroll', checkScrollPosition, { passive: true });
    const observer = new ResizeObserver(() => checkScrollPosition());
    observer.observe(main);

    checkScrollPosition();

    return () => {
      main.removeEventListener('scroll', checkScrollPosition);
      observer.disconnect();
    };
  }, [mainRef, resetKey, checkScrollPosition]);

  const resetFooter = useCallback(() => {
    requestAnimationFrame(() => checkScrollPosition());
  }, [checkScrollPosition]);

  const handleBottomHoverEnter = useCallback(() => {}, []);
  const handleBottomHoverLeave = useCallback(() => {}, []);

  return { isFooterVisible, handleBottomHoverEnter, handleBottomHoverLeave, resetFooter };
}
