import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { audioService } from '../../services/audioService';
import { useAppStore } from '../../store/useAppStore';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { useReadingLessonStore } from '../../store/useReadingLessonStore';
import type { InteractiveReadingPart } from '../../types/models';
import { ReadingBuildPage, buildIntroduction } from './components/ReadingBuildPage';
import { ReadingLessonHeader } from './components/ReadingLessonHeader';
import { ReadingModelPage } from './components/ReadingModelPage';
import { ReadingStructurePage } from './components/ReadingStructurePage';
import { ReadingTimelineExplorePage } from './components/ReadingTimelineExplorePage';
import { ReadingTimelineNoticePage } from './components/ReadingTimelineNoticePage';
import { ReadingTimelinePracticePage } from './components/ReadingTimelinePracticePage';

interface ReadingLessonScreenProps {
  part: InteractiveReadingPart;
  onClose: () => void;
}

const INTRODUCTION_STEP_LABELS = ['Read', 'Notice', 'Build'] as const;
const TIMELINE_STEP_LABELS = ['Explore', 'Notice', 'Practice'] as const;

export function ReadingLessonScreen({ part, onClose }: ReadingLessonScreenProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [timelineReady, setTimelineReady] = useState(false);
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState(part.countries?.[0]?.id ?? '');
  const [likeId, setLikeId] = useState(part.likes?.[0]?.id ?? '');
  const [foodId, setFoodId] = useState(part.foods?.[0]?.id ?? '');
  const [drinkId, setDrinkId] = useState(part.drinks?.[0]?.id ?? '');
  const characterPreference = useAppStore((state) => state.characterPreference);
  const setCharacterPreference = useAppStore((state) => state.setCharacterPreference);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);
  const updatePreferences = usePracticePreferencesStore((state) => state.updatePreferences);
  const completePart = useReadingLessonStore((state) => state.completePart);
  const startPart = useReadingLessonStore((state) => state.startPart);
  const isTimeline = part.experience === 'timeline';
  const stepLabels = isTimeline ? TIMELINE_STEP_LABELS : INTRODUCTION_STEP_LABELS;
  const savedReading = useMemo(() => {
    if (isTimeline) {
      return part.chunks
        .map((chunk) => characterPreference === 'simplified' ? chunk.simplified : chunk.traditional)
        .join('');
    }
    return buildIntroduction(
      part,
      characterPreference,
      name,
      countryId,
      likeId,
      foodId,
      drinkId,
    );
  }, [characterPreference, countryId, drinkId, foodId, isTimeline, likeId, name, part]);

  useEffect(() => {
    startPart(part.id);
  }, [part.id, startPart]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [step]);

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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const goForward = () => {
    if (step < stepLabels.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (isTimeline && !timelineReady) return;
    completePart(part.id, savedReading);
    onClose();
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
      aria-label={`Lesson ${part.lessonId}, Part ${part.partId}: ${part.titleEnglish}`}
    >
      <ReadingLessonHeader
        lessonId={part.lessonId}
        partId={part.partId}
        step={step}
        stepCount={stepLabels.length}
        stepLabel={stepLabels[step]}
        onClose={onClose}
      />

      <main ref={mainRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-8">
        {!isTimeline && step === 0 && (
          <ReadingModelPage
            part={part}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onTogglePinyin={() => updatePreferences({ showPinyin: !showPinyin })}
            onToggleTranslation={() => updatePreferences({ showTranslation: !showTranslation })}
            onCharacterPreferenceChange={setCharacterPreference}
          />
        )}
        {!isTimeline && step === 1 && (
          <ReadingStructurePage
            part={part}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
          />
        )}
        {!isTimeline && step === 2 && (
          <ReadingBuildPage
            part={part}
            characterPreference={characterPreference}
            name={name}
            countryId={countryId}
            likeId={likeId}
            foodId={foodId}
            drinkId={drinkId}
            onNameChange={setName}
            onCountryChange={setCountryId}
            onLikeChange={setLikeId}
            onFoodChange={setFoodId}
            onDrinkChange={setDrinkId}
          />
        )}
        {isTimeline && step === 0 && (
          <ReadingTimelineExplorePage
            part={part}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onTogglePinyin={() => updatePreferences({ showPinyin: !showPinyin })}
            onToggleTranslation={() => updatePreferences({ showTranslation: !showTranslation })}
            onCharacterPreferenceChange={setCharacterPreference}
            onOpenWord={setDictionaryWord}
          />
        )}
        {isTimeline && step === 1 && (
          <ReadingTimelineNoticePage
            part={part}
            characterPreference={characterPreference}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
            onOpenWord={setDictionaryWord}
          />
        )}
        {isTimeline && step === 2 && (
          <ReadingTimelinePracticePage
            part={part}
            characterPreference={characterPreference}
            onOpenWord={setDictionaryWord}
            onReadyChange={setTimelineReady}
          />
        )}
      </main>

      <footer className="z-30 shrink-0 border-t border-ui-divider bg-ui-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {step > 0 && (
            <ActionButton
              variant="quiet"
              onClick={() => setStep((current) => current - 1)}
            >
              <AppIcon name="back" size={17} />
              Back
            </ActionButton>
          )}
          <ActionButton fullWidth onClick={goForward} disabled={isTimeline && step === 2 && !timelineReady}>
            {isTimeline
              ? (step === 0 ? 'Notice the pattern' : step === 1 ? 'Practice the reading' : 'Complete reading')
              : (step === 0 ? 'See the structure' : step === 1 ? 'Build mine' : 'Save & finish')}
            <AppIcon name={step === 2 ? 'check' : 'forward'} size={18} />
          </ActionButton>
        </div>
      </footer>
    </motion.div>
  );
}
