import { useState, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useAppStore } from "../../store/useAppStore";
import { SingleBreakdownView } from "./breakdown/SingleBreakdownView";
import { createPortal } from "react-dom";

interface CharacterBreakdownOverlayProps {
  activeBreakdown: string | null;
  initialCharIndex?: number;
  onClose: () => void;
  activeBook: any;
}

export function CharacterBreakdownOverlay({
  activeBreakdown,
  initialCharIndex = 0,
  onClose,
  activeBook,
}: CharacterBreakdownOverlayProps) {
  const setIsOverlayOpen = useAppStore((state) => state.setIsOverlayOpen);
  const [breakdownStack, setBreakdownStack] = useState<{ word: string; index: number }[]>([]);

  useEffect(() => {
    if (activeBreakdown) {
      setBreakdownStack([{ word: activeBreakdown, index: initialCharIndex || 0 }]);
      setIsOverlayOpen(true);
    } else {
      setBreakdownStack([]);
      setIsOverlayOpen(false);
    }
    return () => setIsOverlayOpen(false);
  }, [activeBreakdown, initialCharIndex, setIsOverlayOpen]);

  const pushBreakdown = (word: string) => {
    setBreakdownStack((prev) => [...prev, { word, index: 0 }]);
  };

  const popBreakdown = () => {
    setBreakdownStack((prev) => prev.slice(0, -1));
  };

  const rootBreakdown = breakdownStack[0];

  const overlayContent = (
    <AnimatePresence>
      {activeBreakdown && rootBreakdown && (
        <div id="character-breakdown-overlay-container" className="absolute inset-0 z-[300] w-full h-full pointer-events-none">
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
        </div>
      )}
    </AnimatePresence>
  );

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.getElementById("activity-overlays-root") || document.body);
  }, []);

  if (!portalNode) return overlayContent;
  return createPortal(overlayContent, portalNode);
}
