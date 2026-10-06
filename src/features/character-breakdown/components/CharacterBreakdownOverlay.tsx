import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useAppStore } from "../../../store/useAppStore";
import { SingleBreakdownView } from "./breakdown/SingleBreakdownView";
import { createPortal } from "react-dom";
import { SAMPLE_BOOKS } from '../../../data/books';
import { WorkspaceWindow } from '../../../lib/widgets';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface CharacterBreakdownOverlayProps {
  activeBreakdown: string | null;
  initialCharIndex?: number;
  onClose: () => void;
  activeBook: CourseBook;
}

export function CharacterBreakdownOverlay({
  activeBreakdown,
  initialCharIndex = 0,
  onClose,
  activeBook,
}: CharacterBreakdownOverlayProps) {
  const setActivityOverlayOpen = useAppStore((state) => state.setActivityOverlayOpen);
  const [breakdownStack, setBreakdownStack] = useState<{ word: string; index: number }[]>([]);

  useEffect(() => {
    if (activeBreakdown) {
      setBreakdownStack([{ word: activeBreakdown, index: initialCharIndex || 0 }]);
    } else {
      setBreakdownStack([]);
    }
    // Report only this overlay's own source: this component mounts inside every
    // activity screen (usually with no breakdown open), so a shared boolean
    // write here would clear the shell's or the settings panel's overlay.
    setActivityOverlayOpen('character-breakdown', Boolean(activeBreakdown));
    return () => setActivityOverlayOpen('character-breakdown', false);
  }, [activeBreakdown, initialCharIndex, setActivityOverlayOpen]);

  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  // Characters stack here; a multi-character word opens the dictionary's word
  // breakdown window on top (this package can't import that view).
  const pushBreakdown = (word: string) => {
    if (Array.from(word).length > 1) {
      setDictionaryWord(word);
      return;
    }
    setBreakdownStack((prev) => [...prev, { word, index: 0 }]);
  };

  const popBreakdown = () => {
    setBreakdownStack((prev) => prev.slice(0, -1));
  };

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.getElementById("activity-overlays-root") || document.body);
  }, []);

  const rootBreakdown = breakdownStack[0];
  // Inside an activity the overlay fills the activity's own host; anywhere
  // else it opens as a workspace window so it never misaligns with the sidebar.
  const hostedInActivity = portalNode?.id === 'activity-overlays-root';

  const views = rootBreakdown && (
    <>
      {/* Depth 0 View (Root) */}
      <SingleBreakdownView
        key={`depth-0-${rootBreakdown.word}`}
        word={rootBreakdown.word}
        initialCharIndex={rootBreakdown.index}
        onClose={onClose}
        activeBook={activeBook}
        pushBreakdown={pushBreakdown}
        depth={0}
      />

      {/* Stacked Views (Depth > 0) */}
      <AnimatePresence>
        {breakdownStack.slice(1).map((item, idx) => (
          <SingleBreakdownView
            key={`depth-${idx + 1}-${item.word}`}
            word={item.word}
            initialCharIndex={item.index}
            onBack={popBreakdown}
            activeBook={activeBook}
            pushBreakdown={pushBreakdown}
            depth={idx + 1}
          />
        ))}
      </AnimatePresence>
    </>
  );

  const overlayContent = (
    <AnimatePresence>
      {activeBreakdown && rootBreakdown && (
        hostedInActivity ? (
          <div key="hosted" id="character-breakdown-overlay-container" className="absolute inset-0 z-overlay w-full h-full pointer-events-none">
            {views}
          </div>
        ) : (
          <WorkspaceWindow key="windowed" id="character-breakdown-overlay-container" layer="window-detail" tone="practice">
            {views}
          </WorkspaceWindow>
        )
      )}
    </AnimatePresence>
  );

  if (!portalNode) return overlayContent;
  return createPortal(overlayContent, portalNode);
}
