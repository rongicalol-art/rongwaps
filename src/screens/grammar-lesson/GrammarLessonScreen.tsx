import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import { findNeighbourGrammarPartId } from '../../data/interactiveGrammarManifest';
import type { InteractiveGrammarPart } from '../../types/models';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWorkspaceIsolation } from '../../hooks/useWorkspaceIsolation';
import { StudySidePanel, WorkspaceWindow } from '../../lib/widgets';
import { GrammarLessonHeader } from './components/GrammarLessonHeader';
import { GrammarConfusionDrawer } from './components/GrammarConfusionDrawer';
import { GrammarConfusionPanel } from './components/GrammarConfusionPanel';
import { GrammarContinueFooter } from './components/GrammarContinueFooter';
import { GrammarBookPageViewer } from './components/GrammarBookPageViewer';
import { useGrammarLessonPage } from './hooks/useGrammarLessonPage';
import { useGrammarFooterVisibility } from './hooks/useGrammarFooterVisibility';
import { useGrammarLessonKeyboardNavigation } from './hooks/useGrammarLessonKeyboardNavigation';

// Window shell (this module) stays eager so the lesson opens instantly with
// its canvas + header; the heavy study page streams in under a spinner.
// Never static-import it here or it joins the main bundle.
const GrammarStudyPage = lazy(() =>
  import('./components/GrammarStudyPage').then((m) => ({ default: m.GrammarStudyPage })),
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

  const {
    page,
    previousPage,
    isLastPage,
    continueAfterStudy,
    goBackToPreviousGrammar,
    currentGrammarIndex,
    currentStepIndex,
    totalSteps,
  } = useGrammarLessonPage({
    part,
    initialPageId,
    initialGrammarIndex,
    contentReady,
    onClose,
    onProceedToReading,
  });

  const hasConfusion = Boolean(page.confusion && page.confusion.items.length > 0);
  const printedPages = page.printedPages;
  const bookPageLabel = (page.bookPageAvailable ?? true) && printedPages.length > 0
    ? printedPages.length === 1
      ? `Book page ${printedPages[0]}`
      : `Book pages ${printedPages[0]}–${printedPages.at(-1)}`
    : null;
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const characterFont = useAppStore((state) => state.characterFont);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const markPartStarted = useAppStore((state) => state.markPartStarted);

  const closeLesson = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

  const closeBookViewer = useCallback(() => {
    setIsBookOpen(false);
    window.requestAnimationFrame(() => bookPageButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    markPartStarted(part.id);
  }, [markPartStarted, part.id]);

  const { isFooterVisible, resetFooter } =
    useGrammarFooterVisibility(mainRef, currentGrammarIndex);

  useEffect(() => {
    resetFooter();
    setIsConfusionOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
    if (document.activeElement?.tagName === 'BODY') mainRef.current?.focus();
  }, [currentGrammarIndex, resetFooter]);

  // Isolate the workspace behind the window and restore it (and audio) on close.
  useWorkspaceIsolation(dialogRef, {
    focusDialog: true,
    onDeactivate: () => audioService.stop(),
  });

  const navigateToPart = useCallback(
    (direction: 'next' | 'previous') => {
      if (!onNavigatePart) return;
      const neighbourId = findNeighbourGrammarPartId(part.id, direction);
      if (neighbourId) onNavigatePart(neighbourId);
    },
    [onNavigatePart, part.id],
  );

  useGrammarLessonKeyboardNavigation({
    isBookOpen,
    isConfusionOpen,
    previousPage,
    continueAfterStudy,
    goBackToPreviousGrammar,
    navigateToPart,
    currentGrammarIndex,
    part,
    onClose,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isBookOpen) dialog.setAttribute('inert', '');
    else dialog.removeAttribute('inert');
  }, [isBookOpen]);

  return (
    <WorkspaceWindow
      ref={dialogRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      tone="canvas"
      className="overflow-hidden"
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
              title={`P${part.partId} · Grammar ${page.grammarNumber ?? (currentGrammarIndex + 1)}`}
              characterPreference={characterPreference}
              characterFont={characterFont}
              showPinyin={showPinyin}
              showTranslation={showTranslation}
              onClose={closeLesson}
              onTogglePinyin={() => setShowPinyin((prev) => !prev)}
              onToggleTranslation={() => setShowTranslation((prev) => !prev)}
              onCharacterPreferenceChange={setCharacterPreference}
              onCharacterFontChange={(font) => updatePreferences({ characterFont: font })}
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              progress={((currentStepIndex + 1) / totalSteps) * 100}
              showReadingAids
              hasConfusion={hasConfusion}
              isConfusionOpen={isDesktop ? isSidePanelOpen : isConfusionOpen}
              onOpenConfusion={handleToggleConfusion}
              bookPageLabel={bookPageLabel}
              onOpenBookPage={() => setIsBookOpen(true)}
              bookPageButtonRef={bookPageButtonRef}
            />

            <Suspense fallback={null}>
              <GrammarContentMount onMounted={markContentReady}>
                <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pb-32 sm:pt-8">
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
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </GrammarContentMount>
            </Suspense>
          </main>


          <GrammarContinueFooter
            isVisible={isFooterVisible}
            contentReady={contentReady}
            previousPage={previousPage}
            isLastPage={isLastPage}
            onBack={goBackToPreviousGrammar}
            onContinue={continueAfterStudy}
          />
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
        <GrammarBookPageViewer
          bookId={page.bookId}
          lessonId={page.lessonId}
          grammarTitle={page.titleEnglish}
          pages={page.printedPages}
          onClose={closeBookViewer}
        />
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
    </WorkspaceWindow>
  );
}
