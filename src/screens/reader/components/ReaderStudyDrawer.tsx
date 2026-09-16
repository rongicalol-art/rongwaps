import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReadingRecord } from '../../../types/models';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { ReaderStudyPanel } from './ReaderStudyPanel';

interface ReaderStudyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord?: (word: string) => void;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
}

export function ReaderStudyDrawer({
  isOpen,
  onClose,
  reading,
  characterPreference,
  onOpenWord,
  onOpenGrammarPart,
}: ReaderStudyDrawerProps) {
  const reduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  // Focus trap, initial focus and focus restore for the declared aria-modal
  // contract; also closes on Escape (replacing the old capture listener).
  const modalFocus = useModalFocus({
    containerRef: drawerRef,
    isActive: isOpen,
    onEscape: onClose,
  });

  const output = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-drawer pointer-events-none lg:hidden">
          {/* Full-viewport Unified Backdrop: blurs the entire app background including floating sidebar */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ui-ink-strong/35 backdrop-blur-sm pointer-events-auto cursor-pointer"
          />

          {/* Slide-over Drawer: full-width on mobile, centered sheet on tablet/desktop */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Study Guide"
            tabIndex={-1}
            onKeyDown={modalFocus.onKeyDown}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }
            }
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col max-h-[85vh] h-[85vh] bg-ui-practice-canvas rounded-t-3xl shadow-ambient-lg overflow-hidden sm:max-w-2xl md:max-w-3xl sm:mx-auto pointer-events-auto"
          >
            {/* Sticky Header: Pill Handle + Title & Close with Canonical Gradient Fade */}
            <div className="sticky top-0 z-20 flex w-full shrink-0 flex-col bg-gradient-to-b from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent pb-2 pt-3 backdrop-blur-[2px]">
              {/* Pill Handle */}
              <div className="flex w-full justify-center pb-2 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-ui-divider" />
              </div>

              {/* Title & Close Action Row */}
              <div className="flex items-center justify-between px-4 sm:px-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-ui-ink-strong">
                  Study Guide
                </h2>
                <IconActionButton
                  size="md"
                  icon={<AppIcon name="close" size={20} />}
                  label="Close study guide"
                  onClick={onClose}
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col min-h-0 custom-scrollbar">
              <ReaderStudyPanel
                reading={reading}
                characterPreference={characterPreference}
                onClose={onClose}
                onOpenWord={onOpenWord}
                onOpenGrammarPart={onOpenGrammarPart}
                showCloseButton
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return output;
  return createPortal(output, document.body);
}
