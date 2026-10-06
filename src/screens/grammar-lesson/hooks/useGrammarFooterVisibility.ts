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

    // Lesson content grows after mount (lazy sections, images), and growth inside
    // the scroller doesn't resize the scroller itself, so watch its children too.
    // Re-check on the next frame so a burst of changes costs one measurement.
    let frame = 0;
    const scheduleCheck = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        checkScrollPosition();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleCheck);
    const observeChildren = () => {
      resizeObserver.observe(main);
      for (const child of Array.from(main.children)) resizeObserver.observe(child);
    };
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      scheduleCheck();
    });

    main.addEventListener('scroll', checkScrollPosition, { passive: true });
    observeChildren();
    mutationObserver.observe(main, { childList: true, subtree: true });
    checkScrollPosition();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      main.removeEventListener('scroll', checkScrollPosition);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [mainRef, resetKey, checkScrollPosition]);

  const resetFooter = useCallback(() => {
    requestAnimationFrame(() => checkScrollPosition());
  }, [checkScrollPosition]);

  const handleBottomHoverEnter = useCallback(() => {}, []);
  const handleBottomHoverLeave = useCallback(() => {}, []);

  return { isFooterVisible, handleBottomHoverEnter, handleBottomHoverLeave, resetFooter };
}
