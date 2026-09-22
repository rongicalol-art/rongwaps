import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import { useGrammarLessonStore } from '../../store/useGrammarLessonStore';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { findNeighbourGrammarPart } from '../../data/interactiveGrammarPages';
import type { InteractiveGrammarPart } from '../../types/models';
import {
  continueGrammarLesson,
} from '../../utils/grammarLessonFlow';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ActionButton, AppIcon, StudySidePanel } from '../../lib/widgets';
import { GrammarLessonHeader } from './components/GrammarLessonHeader';
import { GrammarConfusionDrawer } from './components/GrammarConfusionDrawer';
import { GrammarConfusionPanel } from './components/GrammarConfusionPanel';

// Window shell (this module) stays eager so the lesson opens instantly with
// its canvas + header; the heavy study page and book viewer stream in under a
// spinner. Never static-import them here or they join the main bundle.
const GrammarStudyPage = lazy(() =>
  import('./components/GrammarStudyPage').then((m) => ({ default: m.GrammarStudyPage })),
);
const BookPageViewer = lazy(() =>
  import('./components/BookPageViewer').then((m) => ({ default: m.BookPageViewer })),
);

interface GrammarLessonScreenProps {
  part: InteractiveGrammarPart;
  onClose: () => void;
  onProceedToReading?: (part: InteractiveGrammarPart) => void;
  /** Opens the neighbouring grammar part (Shift + ←/→) without leaving the window. */
  onNavigatePart?: (partId: string) => void;
  initialPageId?: string;
  initialGrammarIndex?: number;
}

/** Mounts only once the lazy study page chunk has resolved; the shell uses it
 *  to hide the end-of-page footer (and its scroll probe) while the page
 *  content is still loading. */
function GrammarContentMount({
  onMounted,
  children,
}: {
  onMounted: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    onMounted();
  }, [onMounted]);
  return <>{children}</>;
}

export function GrammarLessonScreen({
  part,
  onClose,
  onProceedToReading,
  onNavigatePart,
  initialPageId,
  initialGrammarIndex,
}: GrammarLessonScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const bookPageButtonRef = useRef<HTMLButtonElement>(null);
  const completedPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const firstIncompleteIndex = useMemo(
    () => part.grammarPages.findIndex((grammarPage) => !completedPageIds.includes(grammarPage.id)),
    [completedPageIds, part.grammarPages],
  );
  const [currentGrammarIndex, setCurrentGrammarIndex] = useState(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) return targetIndex;
    }
    if (initialGrammarIndex !== undefined && initialGrammarIndex >= 0 && initialGrammarIndex < part.grammarPages.length) {
      return initialGrammarIndex;
    }
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('grammarIndex');
      if (param !== null) {
        const parsed = parseInt(param, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed < part.grammarPages.length) {
          return parsed;
        }
      }
    }
    return firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex;
  });

  useEffect(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) {
        setCurrentGrammarIndex(targetIndex);
      }
    }
  }, [initialPageId, part.grammarPages]);

  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isConfusionOpen, setIsConfusionOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const handleToggleConfusion = useCallback(() => {
    if (isDesktop) {
      setIsSidePanelOpen((prev) => !prev);
    } else {
      setIsConfusionOpen((prev) => !prev);
    }
  }, [isDesktop]);

  // False until the lazy study-page chunk has mounted at least once, so the
  // Continue footer never floats over the loading state.
  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);
  const reduceMotion = useReducedMotion();
  const page = part.grammarPages[currentGrammarIndex];
  const hasConfusion = Boolean(page.confusion && page.confusion.items.length > 0);
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);
  const characterFont = usePracticePreferencesStore((state) => state.characterFont);
  const updatePreferences = usePracticePreferencesStore((state) => state.updatePreferences);
  const markPageComplete = useGrammarLessonStore((state) => state.markPageComplete);
  const markPartStarted = useGrammarLessonStore((state) => state.markPartStarted);
  const markPartComplete = useGrammarLessonStore((state) => state.markPartComplete);
  const previousPage = currentGrammarIndex > 0 ? part.grammarPages[currentGrammarIndex - 1] : null;
  const closeBookViewer = useCallback(() => {
    setIsBookOpen(false);
    window.requestAnimationFrame(() => bookPageButtonRef.current?.focus());
  }, []);
  const totalSteps = part.grammarPages.length;
  const currentStepIndex = currentGrammarIndex;

  useEffect(() => {
    markPartStarted(part.id);
  }, [markPartStarted, part.id]);

  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const lastScrollY = useRef(0);
  const isHoveringBottomRef = useRef(false);
  const wasHoverRevealedRef = useRef(false);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBottomHoverEnter = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    isHoveringBottomRef.current = true;
    setIsFooterVisible((currentVisible) => {
      if (!currentVisible) {
        wasHoverRevealedRef.current = true;
      }
      return true;
    });
  }, []);

  const handleBottomHoverLeave = useCallback(() => {
    isHoveringBottomRef.current = false;
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      if (wasHoverRevealedRef.current) {
        wasHoverRevealedRef.current = false;
        setIsFooterVisible(false);
      }
    }, 80);
  }, []);

  // Scroll listener for dynamic hide/reveal of bottom continue footer (matching Reader mode)
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      if (isHoveringBottomRef.current) return;

      const currentScrollY = main.scrollTop;
      const delta = currentScrollY - lastScrollY.current;

      if (Math.abs(delta) > 8) {
        if (delta > 0 && currentScrollY > 40) {
          wasHoverRevealedRef.current = false;
          setIsFooterVisible((prev) => (prev ? false : prev));
        } else if (delta < 0) {
          wasHoverRevealedRef.current = false;
          setIsFooterVisible((prev) => (!prev ? true : prev));
        }
      }

      lastScrollY.current = currentScrollY;
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [currentGrammarIndex]);

  useEffect(() => {
    lastScrollY.current = 0;
    isHoveringBottomRef.current = false;
    wasHoverRevealedRef.current = false;
    setIsFooterVisible(true);
    setIsConfusionOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
    if (document.activeElement?.tagName === 'BODY') mainRef.current?.focus();
  }, [currentGrammarIndex]);

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
    dialog?.focus();

    return () => {
      audioService.stop();
      targets.forEach((target) => {
        target.removeAttribute('inert');
        target.removeAttribute('aria-hidden');
      });
    };
  }, []);

  const closeLesson = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const isLastPage = currentGrammarIndex === part.grammarPages.length - 1;

  const continueAfterStudy = useCallback(() => {
    if (!contentReady) return; // ignore keyboard advance until page content mounted
    const next = continueGrammarLesson({
      grammarIndex: currentGrammarIndex,
      grammarCount: part.grammarPages.length,
      pageId: page.id,
      completedPageIds,
      allPageIds: part.grammarPages.map((grammarPage) => grammarPage.id),
    });
    markPageComplete(page.id);
    if (isLastPage || next.isPartComplete) {
      markPartComplete(part.id);
      closeLesson();
      onProceedToReading?.(part);
      return;
    }
    setCurrentGrammarIndex(next.grammarIndex);
  }, [closeLesson, completedPageIds, contentReady, currentGrammarIndex, isLastPage, markPageComplete, markPartComplete, onProceedToReading, page, part]);

  const goBackToPreviousGrammar = useCallback(() => {
    if (!previousPage) return;
    setCurrentGrammarIndex((index) => Math.max(0, index - 1));
  }, [previousPage]);

  const navigateToPart = useCallback(
    (direction: 'next' | 'previous') => {
      if (!onNavigatePart) return;
      const neighbour = findNeighbourGrammarPart(part.id, direction);
      if (neighbour) onNavigatePart(neighbour.id);
    },
    [onNavigatePart, part.id],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBookOpen || isConfusionOpen) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'ArrowRight' && event.shiftKey) {
        event.preventDefault();
        navigateToPart('next');
      } else if (event.key === 'ArrowLeft' && event.shiftKey) {
        event.preventDefault();
        navigateToPart('previous');
      } else if (event.key === ']' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        navigateToPart('next');
      } else if (event.key === '[' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        navigateToPart('previous');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.repeat && currentGrammarIndex >= part.grammarPages.length - 1) return;
        continueAfterStudy();
      } else if (event.key === 'ArrowLeft' && previousPage) {
        event.preventDefault();
        goBackToPreviousGrammar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBookOpen, isConfusionOpen, previousPage, continueAfterStudy, goBackToPreviousGrammar, navigateToPart, currentGrammarIndex, part]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isBookOpen) dialog.setAttribute('inert', '');
    else dialog.removeAttribute('inert');
  }, [isBookOpen]);

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-window flex flex-col overflow-hidden bg-ui-canvas outline-none transition-[padding-left] duration-300 ease-out"
      style={{ paddingLeft: 'var(--workspace-nav-width)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson ${part.lessonId}, Part ${part.partId}: ${part.title}`}
    >
      <div className="flex flex-1 min-h-0 min-w-0">
        <div className="relative flex-1 min-w-0 flex flex-col min-h-0">
          <main
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              'relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none outline-none',
              'grammar-learn-workspace',
            )}
          >
          <GrammarLessonHeader
            characterPreference={characterPreference}
            characterFont={characterFont}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onClose={closeLesson}
            onTogglePinyin={() => updatePreferences({ showPinyin: !showPinyin })}
            onToggleTranslation={() => updatePreferences({ showTranslation: !showTranslation })}
            onCharacterPreferenceChange={setCharacterPreference}
            onCharacterFontChange={(font) => updatePreferences({ characterFont: font })}
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              progress={((currentStepIndex + 1) / totalSteps) * 100}
              showReadingAids
              hasConfusion={hasConfusion}
              isConfusionOpen={isDesktop ? isSidePanelOpen : isConfusionOpen}
              onOpenConfusion={handleToggleConfusion}
            />

            <Suspense fallback={null}>
              <GrammarContentMount onMounted={markContentReady}>
                <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-2 sm:px-8 sm:pb-32 sm:pt-4">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`study-${page.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                      <GrammarStudyPage
                        page={page}
                        characterPreference={characterPreference}
                        showPinyin={showPinyin}
                        showTranslation={showTranslation}
                        onOpenWord={setDictionaryWord}
                        onOpenBookPage={() => setIsBookOpen(true)}
                        bookPageButtonRef={bookPageButtonRef}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </GrammarContentMount>
            </Suspense>
          </main>

          {/* Hover trigger zone at bottom of viewport to reveal footer on mouseover (matching Reader mode) */}
          <div
            aria-hidden="true"
            className="pointer-events-auto absolute bottom-0 inset-x-0 z-20 h-24"
            onMouseEnter={handleBottomHoverEnter}
            onMouseLeave={handleBottomHoverLeave}
          />

          <AnimatePresence>
            {isFooterVisible && contentReady && (
              <motion.footer
                aria-label="Grammar navigation"
                initial={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute bottom-0 inset-x-0 z-30"
              >
                <div className="bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent px-4 pb-sheet-safe pt-8 sm:px-8 sm:pt-12 pointer-events-none">
                  <div className="flex w-full items-center gap-3 pointer-events-auto">
                    {previousPage && (
                      <div className="shrink-0">
                        <ActionButton
                          variant="quiet"
                          size="md"
                          onClick={goBackToPreviousGrammar}
                          className="px-2 text-ui-muted-strong"
                        >
                          <AppIcon name="back" size={16} />
                          Back
                        </ActionButton>
                      </div>
                    )}
                    <div className="ml-auto flex-1 sm:flex-none w-full max-w-sm sm:w-auto sm:min-w-[16rem] flex justify-end">
                      <ActionButton
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={continueAfterStudy}
                        aria-label={isLastPage ? 'Proceed to Reading' : 'Continue'}
                        className="btn-touch-primary text-base font-black"
                      >
                        {isLastPage ? 'Proceed to Reading' : 'Continue'}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.footer>
            )}
          </AnimatePresence>
        </div>

        {hasConfusion && page.confusion && isSidePanelOpen && (
          <StudySidePanel
            ariaLabel={page.confusion.title}
            title={page.confusion.title}
            onClose={() => setIsSidePanelOpen(false)}
            closeLabel="Hide confusion notes"
          >
            <GrammarConfusionPanel
              confusion={page.confusion}
              characterPreference={characterPreference}
              showPinyin={showPinyin}
              showTranslation={showTranslation}
              onOpenWord={setDictionaryWord}
            />
          </StudySidePanel>
        )}
      </div>

      {isBookOpen && (
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading book"
              className="fixed inset-0 z-shell flex flex-col items-center justify-center gap-5 bg-ui-ink-strong"
            >
              <span className="h-11 w-11 animate-spin rounded-full border-4 border-ui-surface/25 border-t-ui-surface" />
              <span className="text-xs font-black uppercase tracking-widest text-ui-surface/70">
                Loading book…
              </span>
            </div>
          }
        >
          <BookPageViewer
            bookId={page.bookId}
            lessonId={page.lessonId}
            grammarTitle={page.titleEnglish}
            pages={page.printedPages}
            onClose={closeBookViewer}
          />
        </Suspense>
      )}
      {hasConfusion && page.confusion && (
        <GrammarConfusionDrawer
          isOpen={isConfusionOpen}
          onClose={() => setIsConfusionOpen(false)}
          confusion={page.confusion}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          onOpenWord={setDictionaryWord}
        />
      )}
    </motion.div>
  );
}
