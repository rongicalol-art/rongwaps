import { useEffect, type RefObject } from 'react';

export interface UseDismissOptions {
  ref: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  isActive?: boolean;
  escape?: boolean;
  pointerDown?: boolean;
}

/**
 * Handles outside pointer-down clicks and the Escape key to dismiss non-modal popovers,
 * dropdowns, and floating menus.
 */
export function useDismiss({
  ref,
  onDismiss,
  isActive = true,
  escape = true,
  pointerDown = true,
}: UseDismissOptions) {
  useEffect(() => {
    if (!isActive) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pointerDown) return;
      const target = event.target as Node | null;
      if (target && ref.current && !ref.current.contains(target)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!escape) return;
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [ref, onDismiss, isActive, escape, pointerDown]);
}
