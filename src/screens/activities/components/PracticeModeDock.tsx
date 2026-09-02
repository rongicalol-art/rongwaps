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
  onOpenReading?: () => void;
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
  modeKey,
  containerRef,
  options,
  selectedValue,
  onSelect,
  label,
}: {
  open: boolean;
  onClose: () => void;
  modeKey: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  options: ReadonlyArray<{ value: T; label: string; icon: Parameters<typeof AppIcon>[0]['name'] }>;
  selectedValue?: T | null;
  onSelect: (value: T) => void;
  label: string;
}) {
  const [menuLeft, setMenuLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const targetButton = containerRef.current.querySelector<HTMLElement>(`[data-mode="${modeKey}"]`);
      if (!targetButton) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = targetButton.getBoundingClientRect();
      const halfWidth = 80; // 160px / 2

      // Exact center of the button relative to the container
      const buttonCenterInContainer = (buttonRect.left + buttonRect.width / 2) - containerRect.left;
      const idealLeft = buttonCenterInContainer - halfWidth;

      // Screen clamping bounds: keep at least 16px from screen edges
      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - containerRect.left;
      const maxLeft = (maxScreenX - 160) - containerRect.left;

      // On wide screens where there is space, idealLeft is used directly.
      // On narrow screens where idealLeft would clip off-screen, it clamps safely.
      const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      setMenuLeft(clampedLeft);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open, modeKey, containerRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-full w-[160px] pb-2 z-50 pointer-events-auto"
          style={{
            left: menuLeft !== null ? `${menuLeft}px` : modeKey === 'flashcards' ? '0px' : '25%',
          }}
        >
          <div
            role="menu"
            aria-label={label}
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5"
          >
            {options.map((mode) => (
              <ActionButton
                key={mode.value}
                role="menuitem"
                variant="quiet"
                size="sm"
                fullWidth
                className={cn(
                  'justify-start gap-2.5 px-3 py-2 text-left',
                  selectedValue === mode.value
                    ? 'text-brand-primary hover:text-brand-primary'
                    : 'text-ui-ink-strong',
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
  onOpenReading,
  onSelectQuizMode,
  onSelectFlashcardMode,
  flashcardMode = 'cards',
  quizMode,
  value,
}: PracticeModeDockProps) {
  const [isQuizMenuOpen, setIsQuizMenuOpen] = useState(false);
  const [isFlashcardsMenuOpen, setIsFlashcardsMenuOpen] = useState(false);
  const [isStudyMenuOpen, setIsStudyMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);
  const grammarButtonRef = useRef<HTMLDivElement>(null);
  const [studyMenuLeft, setStudyMenuLeft] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isStudyMenuOpen) return;

    const updateStudyPosition = () => {
      if (!grammarButtonRef.current) return;
      const buttonRect = grammarButtonRef.current.getBoundingClientRect();
      const halfWidth = 80; // 160px / 2
      const idealLeft = buttonRect.width / 2 - halfWidth;

      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - buttonRect.left;
      const maxLeft = (maxScreenX - 160) - buttonRect.left;

      const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      setStudyMenuLeft(clampedLeft);
    };

    updateStudyPosition();
    window.addEventListener('resize', updateStudyPosition);
    return () => window.removeEventListener('resize', updateStudyPosition);
  }, [isStudyMenuOpen]);

  useEffect(() => {
    if (!isQuizMenuOpen && !isFlashcardsMenuOpen && !isStudyMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setIsQuizMenuOpen(false);
        setIsFlashcardsMenuOpen(false);
        setIsStudyMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuizMenuOpen(false);
        setIsFlashcardsMenuOpen(false);
        setIsStudyMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizMenuOpen, isFlashcardsMenuOpen, isStudyMenuOpen]);

  // Only one sub-menu open at a time
  useEffect(() => {
    if (isQuizMenuOpen) {
      setIsFlashcardsMenuOpen(false);
      setIsStudyMenuOpen(false);
    }
  }, [isQuizMenuOpen]);
  useEffect(() => {
    if (isFlashcardsMenuOpen) {
      setIsQuizMenuOpen(false);
      setIsStudyMenuOpen(false);
    }
  }, [isFlashcardsMenuOpen]);
  useEffect(() => {
    if (isStudyMenuOpen) {
      setIsQuizMenuOpen(false);
      setIsFlashcardsMenuOpen(false);
    }
  }, [isStudyMenuOpen]);

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
          className="pointer-events-auto relative flex w-full max-w-[368px] items-center justify-center gap-2 sm:gap-3"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsQuizMenuOpen(false);
              setIsFlashcardsMenuOpen(false);
              setIsStudyMenuOpen(false);
            }
          }}
        >
          <AnimatePresence initial={false}>
            {(onOpenGrammar || onOpenReading) && !feedback && (
              <motion.div
                ref={grammarButtonRef}
                key="grammar-entry"
                initial={{ opacity: 0, scale: 0.92, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: 8 }}
                transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                className="relative shrink-0"
              >
                {/* Popover centered above the button on wide screens, clamped on mobile */}
                <AnimatePresence>
                  {isStudyMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute bottom-full pb-2 w-[160px] z-50 pointer-events-auto"
                      style={{
                        left: studyMenuLeft !== null ? `${studyMenuLeft}px` : 'calc(50% - 80px)',
                      }}
                    >
                      <div
                        role="menu"
                        aria-label="Choose Grammar or Reading"
                        className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5"
                      >
                        {onOpenGrammar && (
                          <ActionButton
                            role="menuitem"
                            variant="quiet"
                            size="sm"
                            fullWidth
                            className="justify-start gap-2.5 px-3 py-2 text-left text-ui-ink-strong hover:text-feedback-warning-edge"
                            onClick={() => {
                              setIsStudyMenuOpen(false);
                              onOpenGrammar();
                            }}
                          >
                            <AppIcon name="grammar" size={19} className="text-feedback-warning-edge shrink-0" />
                            <span>Grammar</span>
                          </ActionButton>
                        )}
                        {onOpenReading && (
                          <ActionButton
                            role="menuitem"
                            variant="quiet"
                            size="sm"
                            fullWidth
                            className="justify-start gap-2.5 px-3 py-2 text-left text-ui-ink-strong hover:text-brand-primary"
                            onClick={() => {
                              setIsStudyMenuOpen(false);
                              onOpenReading();
                            }}
                          >
                            <AppIcon name="book" size={19} className="text-brand-primary shrink-0" />
                            <span>Reading</span>
                          </ActionButton>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <IconActionButton
                  onClick={() => {
                    if (onOpenGrammar && onOpenReading) {
                      setIsStudyMenuOpen((prev) => !prev);
                    } else if (onOpenGrammar) {
                      onOpenGrammar();
                    } else if (onOpenReading) {
                      onOpenReading();
                    }
                  }}
                  label="Study materials (grammar and reading)"
                  variant="warning"
                  icon={<AppIcon name="grammar" size={26} className="h-6 w-6 md:h-[26px] md:w-[26px]" />}
                  className={cn(
                    "h-14 w-14 rounded-feature md:w-[56px]",
                    isStudyMenuOpen && "ring-2 ring-brand-primary/40",
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={modesContainerRef}
            className="relative flex h-14 min-w-0 flex-1 w-full max-w-[300px] items-center justify-center"
          >
            <DockSubMenu<QuizMode>
              open={isQuizMenuOpen && !feedback}
              onClose={() => setIsQuizMenuOpen(false)}
              modeKey="quiz"
              containerRef={modesContainerRef}
              label="Choose quiz mode"
              options={QUIZ_MODES}
              selectedValue={quizMode}
              onSelect={selectQuizMode}
            />
            <DockSubMenu<FlashcardViewMode>
              open={isFlashcardsMenuOpen && !feedback}
              onClose={() => setIsFlashcardsMenuOpen(false)}
              modeKey="flashcards"
              containerRef={modesContainerRef}
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
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4"
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
                  className="flex h-14 w-full items-center justify-center"
                >
                  <SegmentedControl<PracticeActivityId>
                    value={value}
                    ariaLabel="Practice mode"
                    layoutId="practice-modes-dock-pill"
                    className="w-full h-14 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1 px-2.5"
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
                            'data-mode': 'quiz',
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': isQuizMenuOpen,
                            className: isQuizMenuOpen ? 'ring-2 ring-white/40' : undefined,
                        } : isFlashcards ? {
                            'data-mode': 'flashcards',
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
