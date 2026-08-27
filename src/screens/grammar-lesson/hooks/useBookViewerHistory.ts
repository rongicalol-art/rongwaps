import { useCallback, useEffect, useRef } from 'react';

const BOOK_VIEWER_STATE_KEY = '__rongwapsBookViewer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Gives the fullscreen viewer one temporary browser-history entry. */
export function useBookViewerHistory(onRequestClose: () => void) {
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const activeRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const previousStateRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const token = `book-viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tokenRef.current = token;
    previousStateRef.current = window.history.state;
    const baseState = isRecord(window.history.state) ? window.history.state : {};
    window.history.pushState({ ...baseState, [BOOK_VIEWER_STATE_KEY]: token }, '', window.location.href);
    activeRef.current = true;

    const handlePopState = () => {
      if (!activeRef.current || tokenRef.current !== token) return;
      activeRef.current = false;
      closeRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      const currentState = window.history.state;
      if (isRecord(currentState) && currentState[BOOK_VIEWER_STATE_KEY] === token) {
        window.history.replaceState(previousStateRef.current, '', window.location.href);
      }
      activeRef.current = false;
      tokenRef.current = null;
    };
  }, []);

  return useCallback(() => {
    if (typeof window === 'undefined' || !activeRef.current) {
      closeRef.current();
      return;
    }
    window.history.back();
  }, []);
}
