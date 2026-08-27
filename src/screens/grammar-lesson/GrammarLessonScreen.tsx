import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import { useGrammarLessonStore } from '../../store/useGrammarLessonStore';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import type { InteractiveGrammarPart } from '../../types/models';
import {
  continueGrammarLesson,
} from '../../utils/grammarLessonFlow';
import { cn } from '../../utils/cn';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { GrammarLessonHeader } from './components/GrammarLessonHeader';
import { GrammarNextUpTeaser } from './components/GrammarNextUpTeaser';
import { GrammarStudyPage } from './components/GrammarStudyPage';
import { BookPageViewer } from './components/BookPageViewer';

interface GrammarLessonScreenProps {
  part: InteractiveGrammarPart;
  onClose: () => void;
}

export function GrammarLessonScreen({ part, onClose }: GrammarLessonScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const bookPageButtonRef = useRef<HTMLButtonElement>(null);
  const completedPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const firstIncompleteIndex = useMemo(
    () => part.grammarPages.findIndex((grammarPage) => !completedPageIds.includes(grammarPage.id)),
    [completedPageIds, part.grammarPages],
  );
  const [currentGrammarIndex, setCurrentGrammarIndex] = useState(
    firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex,
  );
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const reduceMotion = useReducedMotion();
  const page = part.grammarPages[currentGrammarIndex];
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);
  const updatePreferences = usePracticePreferencesStore((state) => state.updatePreferences);
  const markPageComplete = useGrammarLessonStore((state) => state.markPageComplete);
  const markPartStarted = useGrammarLessonStore((state) => state.markPartStarted);
  const markPartComplete = useGrammarLessonStore((state) => state.markPartComplete);
  const previousPage = currentGrammarIndex > 0 ? part.grammarPages[currentGrammarIndex - 1] : null;
  const nextPage = currentGrammarIndex < part.grammarPages.length - 1
    ? part.grammarPages[currentGrammarIndex + 1]
    : null;
  const closeBookViewer = useCallback(() => {
    setIsBookOpen(false);
    window.requestAnimationFrame(() => bookPageButtonRef.current?.focus());
  }, []);
  const totalSteps = part.grammarPages.length;
  const currentStepIndex = currentGrammarIndex;

  useEffect(() => {
    markPartStarted(part.id);
  }, [markPartStarted, part.id]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    if (document.activeElement?.tagName === 'BODY') mainRef.current?.focus();
  }, [currentGrammarIndex]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { scrollTop, clientHeight, scrollHeight } = main;
        setIsAtEnd(scrollHeight - scrollTop - clientHeight <= 56);
      });
    };
    update();
    main.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      main.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
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
    const previousStates = targets.map((target) => ({
      target,
      inert: target.hasAttribute('inert'),
      ariaHidden: target.getAttribute('aria-hidden'),
    }));

    targets.forEach((target) => {
      target.setAttribute('inert', '');
      target.setAttribute('aria-hidden', 'true');
    });
    dialog?.focus();

    return () => {
      audioService.stop();
      previousStates.forEach(({ target, inert, ariaHidden }) => {
        if (!inert) target.removeAttribute('inert');
        if (ariaHidden === null) target.removeAttribute('aria-hidden');
        else target.setAttribute('aria-hidden', ariaHidden);
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

  const continueAfterStudy = useCallback(() => {
    const next = continueGrammarLesson({
      grammarIndex: currentGrammarIndex,
      grammarCount: part.grammarPages.length,
      pageId: page.id,
      completedPageIds,
      allPageIds: part.grammarPages.map((grammarPage) => grammarPage.id),
    });
    markPageComplete(page.id);
    if (next.isPartComplete) {
      markPartComplete(part.id);
      closeLesson();
      return;
    }
    setCurrentGrammarIndex(next.grammarIndex);
  }, [closeLesson, completedPageIds, currentGrammarIndex, markPageComplete, markPartComplete, page, part]);

  const goBackToPreviousGrammar = useCallback(() => {
    if (!previousPage) return;
    setCurrentGrammarIndex((index) => Math.max(0, index - 1));
  }, [previousPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBookOpen) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'ArrowRight') {
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
  }, [isBookOpen, previousPage, continueAfterStudy, goBackToPreviousGrammar, currentGrammarIndex, part]);

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
      className="fixed inset-0 z-[500] flex flex-col overflow-hidden bg-ui-canvas outline-none transition-[padding-left] duration-300 ease-out"
      style={{ paddingLeft: 'var(--workspace-nav-width)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson ${part.lessonId}, Part ${part.partId}: ${part.title}`}
    >
      <GrammarLessonHeader
        characterPreference={characterPreference}
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onClose={closeLesson}
        onTogglePinyin={() => updatePreferences({ showPinyin: !showPinyin })}
        onToggleTranslation={() => updatePreferences({ showTranslation: !showTranslation })}
        onCharacterPreferenceChange={setCharacterPreference}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        progress={((currentStepIndex + 1) / totalSteps) * 100}
        showReadingAids
      />

      <main
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-none px-4 pb-32 pt-5 outline-none sm:px-8 sm:pb-32 sm:pt-8',
          'grammar-learn-workspace',
        )}
      >
        <div className="mx-auto w-full max-w-4xl">
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
      </main>

      <AnimatePresence>
        {isAtEnd && (
          <motion.footer
            aria-label="Grammar navigation"
            initial={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 right-0 z-30 transition-[left] duration-300 ease-out"
            style={{ left: 'var(--workspace-nav-width)' }}
          >
            <div className="bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 sm:pt-14">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {nextPage ? (
                  <GrammarNextUpTeaser nextPage={nextPage} />
                ) : (
                  <div aria-hidden="true" className="hidden min-w-0 flex-1 sm:block" />
                )}
                <div className="flex w-full items-center gap-3 sm:contents">
                  {previousPage && (
                    <ActionButton
                      variant="quiet"
                      size="md"
                      onClick={goBackToPreviousGrammar}
                      className="shrink-0 px-2 text-ui-muted-strong sm:order-first"
                    >
                      <AppIcon name="back" size={16} />
                      Back
                    </ActionButton>
                  )}
                  <ActionButton
                    variant="primary"
                    size="lg"
                    onClick={continueAfterStudy}
                    aria-label="Continue"
                    className="min-w-0 flex-1 sm:min-w-[9rem] sm:flex-none"
                  >
                    Continue
                  </ActionButton>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {isBookOpen && (
        <BookPageViewer
          bookId={page.bookId}
          lessonId={page.lessonId}
          grammarTitle={page.titleEnglish}
          pages={page.printedPages}
          onClose={closeBookViewer}
        />
      )}
    </motion.div>
  );
}
