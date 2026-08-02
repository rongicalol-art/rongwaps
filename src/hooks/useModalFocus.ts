import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';

interface UseModalFocusOptions {
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  isActive: boolean;
  onEscape?: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
}

export function useModalFocus({ containerRef, initialFocusRef, isActive, onEscape }: UseModalFocusOptions) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      escapeRef.current?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      event.stopPropagation();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      event.stopPropagation();
      first.focus();
    }
  }, [containerRef]);

  useEffect(() => {
    if (!isActive) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) (initialFocusRef?.current ?? focusableElements(container)[0] ?? container).focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      previouslyFocused?.focus();
    };
  }, [containerRef, initialFocusRef, isActive]);

  return { onKeyDown: handleKeyDown };
}
