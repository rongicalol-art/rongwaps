import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import { useGrammarLessonStore } from '../../store/useGrammarLessonStore';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import type { InteractiveGrammarPart } from '../../types/models';
import {
  continueGrammarLesson,
  selectGrammar,
  selectGrammarMode,
  type GrammarLessonView,
} from '../../utils/grammarLessonFlow';
import { cn } from '../../utils/cn';
import { GrammarCompletionPage } from './components/GrammarCompletionPage';
import { GrammarExercisePage } from './components/GrammarExercisePage';
import { GrammarLessonHeader } from './components/GrammarLessonHeader';
import { GrammarModeDock } from './components/GrammarModeDock';
import { GrammarStudyPage } from './components/GrammarStudyPage';

interface GrammarLessonScreenProps {
  part: InteractiveGrammarPart;
  onClose: () => void;
}

export function GrammarLessonScreen({ part, onClose }: GrammarLessonScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const completedPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const firstIncompleteIndex = part.grammarPages.findIndex((grammarPage) => !completedPageIds.includes(grammarPage.id));
  const [currentGrammarIndex, setCurrentGrammarIndex] = useState(
    firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex,
  );
  const [activeView, setActiveView] = useState<GrammarLessonView>('study');
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
  const allGrammarComplete = part.grammarPages.every((grammarPage) => completedPageIds.includes(grammarPage.id));
  const hasNextGrammar = currentGrammarIndex < part.grammarPages.length - 1;
  const hasPreviousGrammar = currentGrammarIndex > 0;
  const completePage = useCallback(() => markPageComplete(page.id), [markPageComplete, page.id]);

  useEffect(() => {
    markPartStarted(part.id);
  }, [markPartStarted, part.id]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeView, currentGrammarIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const root = document.getElementById('root');
    const siblings = root
      ? Array.from(root.children).filter((element) => element !== dialog) as HTMLElement[]
      : [];
    const previousStates = siblings.map((element) => ({
      element,
      inert: element.hasAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    siblings.forEach((element) => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });
    dialog?.focus();

    return () => {
      audioService.stop();
      previousStates.forEach(({ element, inert, ariaHidden }) => {
        if (!inert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const closeLesson = () => {
    audioService.stop();
    onClose();
  };

  const continueAfterExercise = () => {
    const next = continueGrammarLesson({
      grammarIndex: currentGrammarIndex,
      grammarCount: part.grammarPages.length,
      allGrammarComplete,
      firstIncompleteIndex: part.grammarPages.findIndex(
        (grammarPage) => !completedPageIds.includes(grammarPage.id),
      ),
    });
    setCurrentGrammarIndex(next.grammarIndex);
    setActiveView(next.view);
    if (next.view === 'complete') {
      markPartComplete(part.id);
    }
  };

  const showGrammar = (index: number) => {
    const next = selectGrammar(index);
    setCurrentGrammarIndex(next.grammarIndex);
    setActiveView(next.view);
  };

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      className="workspace-window fixed inset-0 z-[500] flex flex-col overflow-hidden bg-ui-canvas outline-none"
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
        grammarIndex={currentGrammarIndex}
        grammarCount={part.grammarPages.length}
        lessonId={part.lessonId}
        partId={part.partId}
        grammarNumber={page.grammarNumber}
        grammarTotal={part.grammarPages.at(-1)?.grammarNumber ?? part.grammarPages.length}
        canGoPrevious={hasPreviousGrammar && activeView !== 'complete'}
        canGoNext={hasNextGrammar && activeView !== 'complete'}
        showReadingAids={activeView === 'study'}
        onPrevious={() => showGrammar(currentGrammarIndex - 1)}
        onNext={() => showGrammar(currentGrammarIndex + 1)}
      />

      <main
        ref={mainRef}
        className={cn(
          'relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-8',
          activeView === 'study' && 'grammar-learn-workspace',
          activeView === 'exercise' && 'grammar-practice-workspace',
        )}
      >
        {activeView === 'study' && (
          <GrammarStudyPage
            key={page.id}
            page={page}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onOpenWord={setDictionaryWord}
          />
        )}
        {activeView === 'exercise' && (
          <GrammarExercisePage
            key={page.id}
            page={page}
            characterPreference={characterPreference}
            onOpenWord={setDictionaryWord}
            onComplete={completePage}
            onContinue={continueAfterExercise}
            continueLabel={hasNextGrammar
              ? `Continue to Grammar ${part.grammarPages[currentGrammarIndex + 1].grammarNumber}`
              : allGrammarComplete
                ? 'Complete part'
                : 'Review unfinished grammar'}
            completionMessage={hasNextGrammar
              ? 'This grammar is ready. Continue when you want to study the next point.'
              : allGrammarComplete
                ? 'All grammar practice in this part is complete.'
                : 'Finish the remaining grammar practice before completing this part.'}
          />
        )}
        {activeView === 'complete' && (
          <GrammarCompletionPage
            part={part}
            onReview={() => {
              setCurrentGrammarIndex(0);
              setActiveView('study');
            }}
            onFinish={closeLesson}
          />
        )}
      </main>

      {(activeView === 'study' || activeView === 'exercise') && (
        <GrammarModeDock
          mode={activeView}
          onSelectStudy={() => setActiveView(selectGrammarMode(currentGrammarIndex, 'study').view)}
          onSelectExercise={() => setActiveView(selectGrammarMode(currentGrammarIndex, 'exercise').view)}
        />
      )}
    </motion.div>
  );
}
