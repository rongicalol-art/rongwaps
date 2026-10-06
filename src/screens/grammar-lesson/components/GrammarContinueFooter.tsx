import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { InteractiveGrammarPage } from '../../../types/models';

interface GrammarContinueFooterProps {
  isVisible: boolean;
  /** False until the lazy study-page chunk has mounted at least once. */
  contentReady: boolean;
  previousPage: InteractiveGrammarPage | null;
  isLastPage: boolean;
  onBack: () => void;
  onContinue: () => void;
}

/** Bottom navigation bar: Back + Continue (or Proceed to Reading). */
export function GrammarContinueFooter({
  isVisible,
  contentReady,
  previousPage,
  isLastPage,
  onBack,
  onContinue,
}: GrammarContinueFooterProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && contentReady && (
        <motion.footer
          aria-label="Grammar navigation"
          initial={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute bottom-0 inset-x-0 z-30"
        >
          <div className="bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-6 sm:pt-8 pointer-events-none">
            <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 sm:px-6 pointer-events-auto">
              <div className="mx-auto flex w-full max-w-3xl items-stretch gap-3 sm:max-w-4xl">
                {previousPage && (
                  <ActionButton
                    variant="secondary"
                    size="lg"
                    onClick={onBack}
                    aria-label="Back"
                    title="Back"
                    className="shrink-0"
                  >
                    <AppIcon name="back" size={22} />
                  </ActionButton>
                )}
                <ActionButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={onContinue}
                  aria-label={isLastPage ? 'Proceed to Reading' : 'Continue'}
                  className="btn-touch-primary text-base font-black uppercase tracking-wider"
                >
                  {isLastPage ? 'Read' : 'Next'}
                </ActionButton>
              </div>
            </div>
          </div>
        </motion.footer>
      )}
    </AnimatePresence>
  );
}
