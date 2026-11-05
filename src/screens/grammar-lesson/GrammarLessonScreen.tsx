import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import type { InteractiveGrammarPage, InteractiveGrammarPart } from '../../types/models';
import { cn } from '../../utils/cn';
import { getGrammarTeachingTokens } from '../../utils/grammar/grammarTeachingTokens';
import { isExercisePage } from '../../utils/grammar/grammarPracticeCheck';
import { useWorkspaceIsolation } from '../../hooks/useWorkspaceIsolation';
import { LoadingScreen, WorkspaceWindow } from '../../lib/widgets';
import { usePreloadedModule } from '../../hooks/useReadyAction';
import { practiceModule, studyPageModule } from './grammarLessonChunks';
import { GrammarLessonHeader } from './components/GrammarLessonHeader';
import type { GrammarExplanationView } from './components/GrammarStudyPage';
import { GrammarContinueFooter } from './components/GrammarContinueFooter';
import { GrammarBookPageViewer } from './components/GrammarBookPageViewer';
import { useGrammarLessonPage } from './hooks/useGrammarLessonPage';
import { useGrammarFooterVisibility } from './hooks/useGrammarFooterVisibility';
import { isHanziChar } from '../../utils/characters/hanzi';
import { useGrammarLessonKeyboardNavigation } from './hooks/useGrammarLessonKeyboardNavigation';

// Window shell (this module) stays eager; the study page and the exercise are code-split
// (grammarLessonChunks) and loaded before they are shown, so neither pops in.

interface GrammarLessonScreenProps {
  part: InteractiveGrammarPart;
  onClose: () => void;
  onProceedToReading?: (part: InteractiveGrammarPart) => void;
  initialPageId?: string;
  initialGrammarIndex?: number;
  /** False when this screen replaces its own loader on the same canvas. */
  animateIn?: boolean;
}

/** Mounts only once the study page code has arrived; the shell uses it to hide
 *  the end-of-page footer (and its scroll probe) while the page is still loading. */
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
  initialPageId,
  initialGrammarIndex,
  animateIn = true,
}: GrammarLessonScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const bookPageButtonRef = useRef<HTMLButtonElement>(null);

  const [isBookOpen, setIsBookOpen] = useState(false);
  const isSocialPanelOpen = useAppStore((state) => state.socialPanel !== null);

  // False until the lazy study-page chunk has mounted at least once, so the
  // Continue footer never floats over the loading state.
  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);
  const studyPage = usePreloadedModule(studyPageModule);

  const {
    page,
    previousPage,
    isLastPage,
    continueAfterStudy,
    isPreparingPractice,
    goBackToPreviousGrammar,
    isPracticing,
    practiceInitialIndex,
    finishPractice,
    canGoBack,
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

  const practice = usePreloadedModule(practiceModule, isPracticing);

  const printedPages = page.printedPages;
  const bookPageLabel = (page.bookPageAvailable ?? true) && printedPages.length > 0
    ? printedPages.length === 1
      ? `Book page ${printedPages[0]}`
      : `Book pages ${printedPages[0]}–${printedPages.at(-1)}`
    : null;
  const characterPreference = useAppStore((state) => state.characterPreference);
  const characterFont = useAppStore((state) => state.characterFont);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const dictionaryWord = useAppStore((state) => state.dictionaryWord);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  // The summary opens first; the choice holds across pages and falls back to Full where a page lacks that view.
  const [explanationChoice, setExplanationChoice] = useState<GrammarExplanationView>('summary');
  const explanationViews = getExplanationViews(page);
  const explanationView = explanationViews.includes(explanationChoice) ? explanationChoice : 'full';

  const closeLesson = useCallback(() => {
    audioService.stop();
    onClose();
  }, [onClose]);

  const closeBookViewer = useCallback(() => {
    setIsBookOpen(false);
    window.requestAnimationFrame(() => bookPageButtonRef.current?.focus());
  }, []);

  // The footer waits for the outgoing page to finish leaving: while it fades, the content is short and would show it.
  const pageKey = `${isPracticing ? 'practice' : 'study'}-${page.id}`;
  const pageKeyRef = useRef(pageKey);
  pageKeyRef.current = pageKey;
  const [settledKey, setSettledKey] = useState(pageKey);
  const { isFooterVisible, resetFooter } =
    useGrammarFooterVisibility(mainRef, `${currentGrammarIndex}-${isPracticing}`);

  // The window column the practice feedback bar docks to (outside the scroller).
  const [barHost, setBarHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    resetFooter();
    mainRef.current?.scrollTo({ top: 0 });
    if (document.activeElement?.tagName === 'BODY') mainRef.current?.focus();
  }, [currentGrammarIndex, isPracticing, resetFooter]);

  // Isolate the workspace behind the window and restore it (and audio) on close.
  useWorkspaceIsolation(dialogRef, {
    focusDialog: true,
    onDeactivate: () => audioService.stop(),
  });

  useGrammarLessonKeyboardNavigation({
    isBookOpen,
    isPracticing,
    canGoBack,
    continueAfterStudy,
    goBackToPreviousGrammar,
    currentGrammarIndex,
    grammarPageCount: part.grammarPages.length,
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
      animateIn={animateIn}
      tone="canvas"
      className="overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson ${page.lessonId}, Part ${page.partId}: ${page.titleEnglish}`}
    >
      <div className="flex flex-1 min-h-0 min-w-0">
        <div ref={setBarHost} className="relative flex-1 min-w-0 flex flex-col min-h-0">
          <main
            ref={mainRef}
            tabIndex={-1}
            className={cn(
              'relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none outline-none',
              'grammar-learn-workspace',
            )}
          >
            <GrammarLessonHeader
              title={`P${page.partId} · Grammar ${page.grammarNumber ?? (currentGrammarIndex + 1)}`}
              characterFont={characterFont}
              onCharacterFontChange={(font) => updatePreferences({ characterFont: font })}
              showPinyin={showPinyin}
              showTranslation={showTranslation}
              onClose={closeLesson}
              onTogglePinyin={() => setShowPinyin((prev) => !prev)}
              onToggleTranslation={() => setShowTranslation((prev) => !prev)}
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              progress={((currentStepIndex + 1) / totalSteps) * 100}
              showReadingAids
              bookPageLabel={bookPageLabel}
              onOpenBookPage={() => setIsBookOpen(true)}
              bookPageButtonRef={bookPageButtonRef}
              explanationView={explanationView}
              explanationViews={explanationViews}
              onExplanationViewChange={setExplanationChoice}
            />

            {!studyPage ? <LoadingScreen inline message="Loading grammar…" /> : (
              <GrammarContentMount onMounted={markContentReady}>
                <div className="mx-auto w-full max-w-5xl xl:max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pb-32 sm:pt-8">
                  <AnimatePresence mode="wait" initial={false} onExitComplete={() => setSettledKey(pageKeyRef.current)}>
                    <motion.div
                      key={pageKey}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                      {isPracticing && page.practice ? (
                        // Practice opens once this has loaded; the loader shows only when loading ran past the wait.
                        !practice ? <LoadingScreen inline message="Loading exercise…" /> : isExercisePage(page.practice) ? (
                          <practice.ExercisePage
                            key={`exercise-${page.id}`}
                            practice={page.practice}
                            script={characterPreference}
                            showPinyin={showPinyin}
                            contextTokens={getGrammarTeachingTokens(page)}
                            onOpenWord={setDictionaryWord}
                            onComplete={finishPractice}
                            onBack={goBackToPreviousGrammar}
                            shortcutsDisabled={isBookOpen || isSocialPanelOpen || Boolean(dictionaryWord)}
                          />
                        ) : (
                        <practice.GrammarPracticeView
                          key={`practice-${page.id}-${practiceInitialIndex}`}
                          practice={page.practice}
                          script={characterPreference}
                          showPinyin={showPinyin}
                          showTranslation={showTranslation}
                          contextTokens={getGrammarTeachingTokens(page)}
                          onOpenWord={setDictionaryWord}
                          onComplete={finishPractice}
                          onExit={goBackToPreviousGrammar}
                          barHost={barHost}
                          initialIndex={practiceInitialIndex}
                          shortcutsDisabled={isBookOpen || isSocialPanelOpen || Boolean(dictionaryWord)}
                        />
                        )
                      ) : (
                        <studyPage.GrammarStudyPage
                          page={page}
                          characterPreference={characterPreference}
                          showPinyin={showPinyin}
                          showTranslation={showTranslation}
                          onOpenWord={setDictionaryWord}
                          explanationView={explanationView}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </GrammarContentMount>
            )}
          </main>


          <GrammarContinueFooter
            isVisible={isFooterVisible && !isPracticing && settledKey === pageKey}
            contentReady={contentReady}
            previousPage={previousPage}
            isLastPage={isLastPage}
            continueLabel={page.practice ? 'Practice' : undefined}
            isPreparing={isPreparingPractice}
            onBack={goBackToPreviousGrammar}
            onContinue={continueAfterStudy}
          />
        </div>

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
    </WorkspaceWindow>
  );
}

function getExplanationViews(page: InteractiveGrammarPage): GrammarExplanationView[] {
  return [
    ...(page.summary?.length ? ['summary' as const] : []),
    'full' as const,
    ...(hasChineseExplanation(page) ? ['chinese' as const] : []),
  ];
}

/** The 中文 view only makes sense when the page has both an English explanation and a real Chinese one (mostly hanzi). */
function hasChineseExplanation(page: { explanation: string; explanationEnglish?: string }) {
  if (!page.explanationEnglish) return false;
  const hanzi = [...page.explanation].filter(isHanziChar).length;
  return hanzi > 0 && hanzi >= page.explanation.replace(/\s/g, '').length * 0.5;
}
