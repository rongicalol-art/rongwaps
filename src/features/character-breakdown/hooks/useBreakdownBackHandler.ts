import { useEffect, useRef } from 'react';

interface UseBreakdownBackHandlerOptions {
  isOpen: boolean;
  depth: number;
  onPop: () => void;
  onClose: () => void;
}

/**
 * Manages browser history hash entries (#breakdown, #breakdown-2, etc.) while
 * character or word breakdowns are open.
 *
 * Prevents Android hardware Back button / edge swipe gesture from closing the
 * PWA or navigating back to the homepage.
 */
export function useBreakdownBackHandler({
  isOpen,
  depth,
  onPop,
  onClose,
}: UseBreakdownBackHandlerOptions) {
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const depthRef = useRef(depth);
  depthRef.current = depth;

  const isHandlingPopRef = useRef(false);

  // Push history entry whenever breakdown opens or depth increases
  useEffect(() => {
    if (!isOpen || depth === 0 || typeof window === 'undefined') return undefined;

    const targetHash = depth > 1 ? `#breakdown-${depth}` : '#breakdown';
    if (window.location.hash !== targetHash) {
      window.history.pushState({ breakdownDepth: depth }, '', targetHash);
    }

    const handlePopState = () => {
      isHandlingPopRef.current = true;
      if (depthRef.current > 1) {
        onPopRef.current();
      } else {
        onCloseRef.current();
      }
      setTimeout(() => {
        isHandlingPopRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, depth]);

  // Clean up hash if closed programmatically without popstate
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && window.location.hash.startsWith('#breakdown')) {
      if (!isHandlingPopRef.current) {
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        );
      }
    }
  }, [isOpen]);

  // Handlers for in-app UI buttons (< and X) so history stays in sync
  const handleUiBack = () => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#breakdown')) {
      window.history.back();
    } else {
      onPop();
    }
  };

  const handleUiClose = () => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#breakdown')) {
      const steps = depthRef.current;
      if (steps > 1) {
        window.history.go(-steps);
      } else {
        window.history.back();
      }
    } else {
      onClose();
    }
  };

  return { handleUiBack, handleUiClose };
}
