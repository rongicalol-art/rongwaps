import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScreenHeader } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { createPortal } from 'react-dom';
import { useCompactHeaderOnScroll } from '../../hooks/useCompactHeaderOnScroll';

import { AllExamplesSubOverlay } from './components/AllExamplesSubOverlay';
import { MnemonicSection } from './components/MnemonicSection';
import { SentencesSection } from './components/SentencesSection';
import { useMemoryHookOverlay } from './hooks/useMemoryHookOverlay';

interface MemoryHookOverlayProps {
  activeMemoryHook: any;
  setActiveMemoryHook: (hook: any | null) => void;
  activeBook: any;
}

export function MemoryHookOverlay({
  activeMemoryHook,
  setActiveMemoryHook,
  activeBook,
}: MemoryHookOverlayProps) {
  const setIsOverlayOpen = useAppStore(state => state.setIsOverlayOpen);
  const { isHeaderCompact, handleHeaderScroll } = useCompactHeaderOnScroll();

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
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 z-[300] w-full h-full bg-[#F7F7F7] flex flex-col pointer-events-auto font-sans shadow-2xl"
        >
          <ScreenHeader 
            onClose={() => setActiveMemoryHook(null)}
            title="Insights & Examples"
            compact={isHeaderCompact}
            className="bg-white border-b-[3px] border-[#E5E5E5] w-full max-w-full px-4 sm:px-6 shadow-sm"
          />

          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
            onScroll={handleHeaderScroll}
            style={{ backgroundColor: activeBook.neutralBg || "#F7F7F7" }}
          >
            <div className="max-w-[768px] mx-auto w-full px-4 py-8 sm:py-10 flex flex-col gap-8 pb-12 relative min-h-full">
              <div className="space-y-8">
                {(activeMemoryHook?.measureWords || activeMemoryHook?.measure_words) && (
                  <div>
                    <h4 className="text-[15px] font-bold text-[#AFB6BB] uppercase tracking-[0.05em] mb-4 pl-1">Measure Words</h4>
                    <div className="flex flex-wrap gap-2 pl-1">
                      {(activeMemoryHook.measureWords || activeMemoryHook.measure_words).map((mw: string, idx: number) => (
                        <span key={idx} className="bg-white text-[#4B4B4B] border-[3px] border-b-[6px] border-[#E5E5E5] px-4 py-2 rounded-[20px] font-bold text-2xl font-chinese shadow-sm">
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
            </div>
          </div>

          {/* All Example Sentences Sub-Overlay */}
          <AllExamplesSubOverlay
            showAllOverlay={showAllOverlay}
            setShowAllOverlay={setShowAllOverlay}
            smartSentences={smartSentences}
            activeBook={activeBook}
          />
        </motion.div>
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
