import { useEffect, useRef, type RefObject } from 'react';

interface UseWorkspaceIsolationOptions {
  /** Focus the dialog element on mount (study windows that trap focus). */
  focusDialog?: boolean;
  /** Called on unmount before the background is restored (e.g. stop audio). */
  onDeactivate?: () => void;
}

/**
 * Isolates a full-viewport study window from the workspace behind it: every
 * sibling of the dialog is marked inert and hidden from the accessibility
 * tree while the window is open, and restored on unmount.
 */
export function useWorkspaceIsolation(
  dialogRef: RefObject<HTMLElement | null>,
  { focusDialog = false, onDeactivate }: UseWorkspaceIsolationOptions = {},
) {
  const onDeactivateRef = useRef(onDeactivate);
  onDeactivateRef.current = onDeactivate;

  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.getElementById('root');
    const siblings = root
      ? Array.from(root.children).filter((element) => element !== dialog) as HTMLElement[]
      : [];
    const targets = siblings.map((element) => (
      (element.querySelector('[data-workspace-content]') as HTMLElement | null) ?? element
    ));

    targets.forEach((target) => {
      target.setAttribute('inert', '');
      target.setAttribute('aria-hidden', 'true');
    });
    if (focusDialog) dialog?.focus();

    return () => {
      onDeactivateRef.current?.();
      targets.forEach((target) => {
        target.removeAttribute('inert');
        target.removeAttribute('aria-hidden');
      });
    };
  }, [dialogRef, focusDialog]);
}
