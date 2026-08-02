import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { WorkspaceDetailShell } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { createPortal } from 'react-dom';

import { AllExamplesSubOverlay } from './components/AllExamplesSubOverlay';
import { MnemonicSection } from './components/MnemonicSection';
import { SentencesSection } from './components/SentencesSection';
import { useMemoryHookOverlay } from './hooks/useMemoryHookOverlay';
import type { MemoryHookCard } from './hooks/useMemoryHookOverlay';
import { SAMPLE_BOOKS } from '../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface MemoryHookOverlayProps {
  activeMemoryHook: MemoryHookCard | null;
  setActiveMemoryHook: (hook: MemoryHookCard | null) => void;
  activeBook: CourseBook;
}

export function MemoryHookOverlay({
  activeMemoryHook,
  setActiveMemoryHook,
  activeBook,
}: MemoryHookOverlayProps) {
  const setIsOverlayOpen = useAppStore(state => state.setIsOverlayOpen);
  const {
    mnemonic,
    loading,
    showAllOverlay,
    setShowAllOverlay,
    smartSentences,
    isSentencesLoading,
    handleGenerateMnemonic,
  } = useMemoryHookOverlay(activeMemoryHook);

  useEffect(() => {
    if (activeMemoryHook) {
      setIsOverlayOpen(true);
    } else {
      setIsOverlayOpen(false);
    }
    return () => setIsOverlayOpen(false);
  }, [activeMemoryHook, setIsOverlayOpen]);

  const overlayContent = (
    <AnimatePresence>
      {activeMemoryHook && (
        <>
          <WorkspaceDetailShell
            ariaLabel={`Insights and examples for ${activeMemoryHook.front}`}
            title="Insights & Examples"
            onClose={() => setActiveMemoryHook(null)}
            zIndexClassName="z-[300]"
            maxWidthClassName="max-w-[900px]"
            contentInnerClassName="flex flex-col gap-8 pb-16"
          >
              <div className="space-y-8">
                {(activeMemoryHook?.measureWords || activeMemoryHook?.measure_words) && (
                  <div>
                    <h4 className="mb-4 pl-1 text-[15px] font-bold uppercase tracking-[0.05em] text-ui-muted">Measure Words</h4>
                    <div className="flex flex-wrap gap-2 pl-1">
                      {(activeMemoryHook.measureWords || activeMemoryHook.measure_words).map((mw: string, idx: number) => (
                        <span key={idx} className="rounded-[18px] border-b-4 border-ui-divider bg-ui-surface px-4 py-2 font-chinese text-2xl font-bold text-ui-ink">
                          {mw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* AI Memory Hook Section */}
                <div className="flex flex-col w-full">
                  <MnemonicSection
                    loading={loading}
                    mnemonic={mnemonic}
                    activeBook={activeBook}
                    handleGenerateMnemonic={handleGenerateMnemonic}
                  />
                </div>
                
                {/* Example Sentences Section */}
                <SentencesSection
                  smartSentences={smartSentences}
                  isSentencesLoading={isSentencesLoading}
                  activeBook={activeBook}
                  setShowAllOverlay={setShowAllOverlay}
                />

              </div>
          </WorkspaceDetailShell>

          {/* All Example Sentences Sub-Overlay */}
          <AllExamplesSubOverlay
            showAllOverlay={showAllOverlay}
            setShowAllOverlay={setShowAllOverlay}
            smartSentences={smartSentences}
            activeBook={activeBook}
          />
        </>
      )}
    </AnimatePresence>
  );

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalNode(document.getElementById('activity-overlays-root') || document.body);
  }, []);

  if (!portalNode) return overlayContent;
  return createPortal(overlayContent, portalNode);
}
