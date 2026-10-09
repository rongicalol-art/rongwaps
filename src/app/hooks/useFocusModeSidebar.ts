import { useEffect, useRef } from 'react';

interface UseFocusModeSidebarOptions {
  isReaderOpen: boolean;
  activeReadingIndex: number | null;
  isGrammarOpen: boolean;
  activeGrammarPartId: string | null;
  dictionaryWord: string | null;
  activeActivity: string | null;
  isLessonWindowOpen: boolean;
  isOverlayActive: boolean;
  collapseNav: () => void;
  restoreBaseNavPreference: () => void;
}

/**
 * Opening or closing a window must not slide the workspace underneath it (that was ~30 frames
 * of layout shift). The content column and rail swap instantly while this flag is set
 * (layout-property animation = a shift on every frame); the user's own collapse button never sets it.
 */
function snapWorkspaceLayout() {
  const root = document.documentElement;
  root.dataset.navSnap = '';
  window.setTimeout(() => { delete root.dataset.navSnap; }, 400);
}

/**
 * Collapses the sidebar when entering or switching focus modes (study
 * windows, overlays, activities) and restores the user's preferred desktop
 * browsing layout when every focus mode closes.
 */
export function useFocusModeSidebar({
  isReaderOpen,
  activeReadingIndex,
  isGrammarOpen,
  activeGrammarPartId,
  dictionaryWord,
  activeActivity,
  isLessonWindowOpen,
  isOverlayActive,
  collapseNav,
  restoreBaseNavPreference,
}: UseFocusModeSidebarOptions) {
  const activeFocusModeKey = isReaderOpen
    ? `reader:${activeReadingIndex}`
    : isGrammarOpen
      ? `grammar:${activeGrammarPartId}`
      : dictionaryWord
        ? `dictionary:${dictionaryWord}`
        : activeActivity
          ? `activity:${activeActivity}`
          : isLessonWindowOpen
            ? 'lesson'
            : null;

  const prevFocusModeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prevKey = prevFocusModeKeyRef.current;
    prevFocusModeKeyRef.current = activeFocusModeKey;

    if (activeFocusModeKey !== prevKey) snapWorkspaceLayout();

    if (activeFocusModeKey !== null) {
      // 1. Entering a focus mode (from null)
      // 2. OR switching between focus modes (e.g. flashcards -> quiz, reader -> grammar)
      // Automatically collapse sidebar so study content has maximum space
      collapseNav();
    } else if (prevKey !== null && activeFocusModeKey === null) {
      // Exiting focus mode back to main browsing hub:
      // Restore user's preferred desktop browsing layout
      restoreBaseNavPreference();
    }
  }, [activeFocusModeKey, collapseNav, restoreBaseNavPreference]);

  // Defensive: when every overlay is closed, ensure no element stays inert.
  // This acts as a safety net in case the isolating effects in Reader/Grammar
  // fail to restore state (e.g. due to concurrent mount/unmount ordering).
  useEffect(() => {
    if (isOverlayActive) return;
    const targets = document.querySelectorAll<HTMLElement>('[data-workspace-content]');
    targets.forEach((el) => {
      el.removeAttribute('inert');
      if (el.getAttribute('aria-hidden') === 'true') el.removeAttribute('aria-hidden');
    });
  }, [isOverlayActive]);
}
