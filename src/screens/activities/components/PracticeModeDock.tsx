import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import type { QuizMode } from '../../../types/models';
import { cn } from '../../../utils/cn';
import type { FlashcardViewMode } from '../../flashcard';

export const PRACTICE_ACTIVITIES = [
  { id: 'flashcards', label: 'Flashcards', icon: 'cards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'listening', label: 'Listening', icon: 'audio' },
  { id: 'writing', label: 'Writing', icon: 'writing' },
] as const;

export type PracticeActivityId = (typeof PRACTICE_ACTIVITIES)[number]['id'];

interface PracticeModeDockProps {
  feedback: { text: string; type: 'learned' | 'review' } | null;
  onChange: (activity: PracticeActivityId) => void;
  onOpenGrammar?: () => void;
  onSelectQuizMode: (mode: QuizMode) => void;
  onSelectFlashcardMode?: (mode: FlashcardViewMode) => void;
  flashcardMode?: FlashcardViewMode;
  quizMode?: QuizMode | null;
  value: PracticeActivityId;
}

const QUIZ_MODES = [
  { value: 'choices', label: 'Choose', icon: 'choices' },
  { value: 'typing', label: 'Type', icon: 'typeText' },
] as const;

const FLASHCARD_MODES = [
  { value: 'cards', label: 'Cards', icon: 'cards' },
  { value: 'list', label: 'List', icon: 'choices' },
] as const;

/** Small popover anchored above one dock segment (quiz/flashcards sub-modes). */
function DockSubMenu<T extends string>({
  open,
  onClose,
  anchorOffset,
  options,
  selectedValue,
  onSelect,
  label,
}: {
  open: boolean;
  onClose: () => void;
  anchorOffset: string;
  options: ReadonlyArray<{ value: T; label: string; icon: Parameters<typeof AppIcon>[0]['name'] }>;
  selectedValue?: T | null;
  onSelect: (value: T) => void;
  label: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className={cn('absolute bottom-full w-[160px] -translate-x-1/2 pb-2', anchorOffset)}
        >
          <div
            role="menu"
            aria-label={label}
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface p-1.5 shadow-ambient-md"
          >
            {options.map((mode) => (
              <ActionButton
                key={mode.value}
                role="menuitem"
                variant="quiet"
                size="sm"
                fullWidth
                className={cn(
                  'justify-start gap-2.5 px-3 py-2 text-left text-ui-ink-strong',
                  selectedValue === mode.value && 'bg-brand-primary/10 text-brand-primary hover:text-brand-primary',
                )}
                onClick={() => {
                  onSelect(mode.value);
                  onClose();
                }}
              >
                <AppIcon name={mode.icon} size={19} />
                {mode.label}
              </ActionButton>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PracticeModeDock({
  feedback,
  onChange,
  onOpenGrammar,
  onSelectQuizMode,
  onSelectFlashcardMode,
  flashcardMode = 'cards',
  quizMode,
  value,
}: PracticeModeDockProps) {
  const [isQuizMenuOpen, setIsQuizMenuOpen] = useState(false);
  const [isFlashcardsMenuOpen, setIsFlashcardsMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isQuizMenuOpen && !isFlashcardsMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setIsQuizMenuOpen(false);
        setIsFlashcardsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuizMenuOpen(false);
        setIsFlashcardsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizMenuOpen, isFlashcardsMenuOpen]);

  // Only one sub-menu open at a time
  useEffect(() => {
    if (isQuizMenuOpen) setIsFlashcardsMenuOpen(false);
  }, [isQuizMenuOpen]);
  useEffect(() => {
    if (isFlashcardsMenuOpen) setIsQuizMenuOpen(false);
  }, [isFlashcardsMenuOpen]);

  const selectQuizMode = (mode: QuizMode) => {
    onSelectQuizMode(mode);
  };

  const selectFlashcardMode = (mode: FlashcardViewMode) => {
    onSelectFlashcardMode?.(mode);
  };

  return (
    <>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
        transition={reduceMotion ? { duration: 0 } : {
          type: 'spring',
          stiffness: 360,
          damping: 32,
          mass: 0.72,
        }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[250] mb-4 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 md:mb-6"
      >
        <div
          ref={dockRef}
          className="pointer-events-auto relative flex w-full max-w-[381px] items-center justify-center gap-3"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsQuizMenuOpen(false);
              setIsFlashcardsMenuOpen(false);
            }
          }}
        >
          <AnimatePresence initial={false}>
            {onOpenGrammar && !feedback && (
              <motion.div
                key="grammar-entry"
                initial={{ opacity: 0, scale: 0.92, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: 8 }}
                transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                className="shrink-0"
              >
                <IconActionButton
                  onClick={onOpenGrammar}
                  label="Open grammar lesson"
                  variant="warning"
                  icon={<AppIcon name="grammar" size={26} className="h-6 w-6 md:h-[26px] md:w-[26px]" />}
                  className="h-14 w-14 rounded-feature md:w-[56px]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex min-w-0 w-full max-w-[300px] items-center justify-center">
            <DockSubMenu<QuizMode>
              open={isQuizMenuOpen && !feedback}
              onClose={() => setIsQuizMenuOpen(false)}
              anchorOffset="left-[37.5%]"
              label="Choose quiz mode"
              options={QUIZ_MODES}
              selectedValue={quizMode}
              onSelect={selectQuizMode}
            />
            <DockSubMenu<FlashcardViewMode>
              open={isFlashcardsMenuOpen && !feedback}
              onClose={() => setIsFlashcardsMenuOpen(false)}
              anchorOffset="left-[12.5%]"
              label="Choose flashcards view"
              options={FLASHCARD_MODES}
              selectedValue={flashcardMode}
              onSelect={selectFlashcardMode}
            />
            <AnimatePresence mode="popLayout">
              {feedback ? (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  role="status"
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface px-4"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${feedback.type === 'learned' ? 'bg-feedback-success' : 'bg-feedback-danger'}`} />
                  <span className={`text-[15px] font-extrabold uppercase tracking-widest ${feedback.type === 'learned' ? 'text-feedback-success-edge' : 'text-feedback-danger-edge'}`}>
                    {feedback.text}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="dock-icons"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex w-full items-center justify-center"
                >
                  <SegmentedControl<PracticeActivityId>
                    value={value}
                    ariaLabel="Practice mode"
                    layoutId="practice-modes-dock-pill"
                    className="w-full h-14 rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface pt-2 pb-1 px-2.5"
                    options={PRACTICE_ACTIVITIES.map((activity) => {
                      const isQuiz = activity.id === 'quiz';
                      const isFlashcards = activity.id === 'flashcards';
                      return {
                        value: activity.id,
                        label: activity.label,
                        showLabel: false,
                        icon: (
                          <AppIcon
                            name={activity.icon}
                            size={24}
                            className="h-6 w-6 transition-transform group-hover:scale-105 md:h-[24px] md:w-[24px]"
                          />
                        ),
                        title: activity.label,
                        buttonProps: isQuiz ? {
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': isQuizMenuOpen,
                            className: isQuizMenuOpen ? 'ring-2 ring-white/40' : undefined,
                        } : isFlashcards ? {
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': isFlashcardsMenuOpen,
                            className: isFlashcardsMenuOpen ? 'ring-2 ring-white/40' : undefined,
                        } : undefined,
                      };
                    })}
                    onChange={(activity) => {
                      if (activity === 'quiz') {
                        setIsQuizMenuOpen((isOpen) => !isOpen);
                        return;
                      }
                      if (activity === 'flashcards') {
                        setIsQuizMenuOpen(false);
                        setIsFlashcardsMenuOpen((isOpen) => !isOpen);
                        return;
                      }
                      setIsQuizMenuOpen(false);
                      setIsFlashcardsMenuOpen(false);
                      onChange(activity);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
