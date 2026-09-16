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

/** The single anchored sub-menu the dock can have open at a time. */
type DockMenu = 'quiz' | 'flashcards' | 'study';

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
      const menuWidth = 240;
      const halfWidth = menuWidth / 2; // 120px

      // Exact center of the button relative to the container
      const buttonCenterInContainer = (buttonRect.left + buttonRect.width / 2) - containerRect.left;
      const idealLeft = buttonCenterInContainer - halfWidth;

      // Screen clamping bounds: keep at least 16px from screen edges
      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - containerRect.left;
      const maxLeft = (maxScreenX - menuWidth) - containerRect.left;

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
          className="absolute bottom-full w-60 sm:w-64 pb-3 z-50 pointer-events-auto"
          style={{
            left: menuLeft !== null ? `${menuLeft}px` : 'calc(50% - 120px)',
          }}
        >
          <div
            role="menu"
            aria-label={label}
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg flex flex-col gap-1.5"
          >
            {options.map((mode) => (
              <ActionButton
                key={mode.value}
                role="menuitem"
                variant="quiet"
                size="md"
                fullWidth
                className={cn(
                  'justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold',
                  selectedValue === mode.value
                    ? 'text-brand-primary hover:text-brand-primary'
                    : 'text-ui-ink-strong',
                )}
                onClick={() => {
                  onSelect(mode.value);
                  onClose();
                }}
              >
                <AppIcon name={mode.icon} size={22} />
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
  // At most one anchored sub-menu is open, so a single slot replaces the
  // three booleans + mutual-exclusion effects it used to take to hold that
  // invariant (and the transient two-menus-open render they allowed).
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);
  const grammarButtonRef = useRef<HTMLDivElement>(null);
  const [studyMenuLeft, setStudyMenuLeft] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (openMenu !== 'study') return;

    const updateStudyPosition = () => {
      if (!grammarButtonRef.current) return;
      const buttonRect = grammarButtonRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const halfWidth = menuWidth / 2; // 120px
      const idealLeft = buttonRect.width / 2 - halfWidth;

      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - buttonRect.left;
      const maxLeft = (maxScreenX - menuWidth) - buttonRect.left;

      const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      setStudyMenuLeft(clampedLeft);
    };

    updateStudyPosition();
    window.addEventListener('resize', updateStudyPosition);
    return () => window.removeEventListener('resize', updateStudyPosition);
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

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
        className="pointer-events-none absolute inset-x-0 bottom-0 z-dock mb-4 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 md:mb-6"
      >
        <div
          ref={dockRef}
          className="pointer-events-auto relative flex w-full max-w-[368px] items-center justify-center gap-2 sm:gap-3"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOpenMenu(null);
            }
          }}
        >
          <AnimatePresence initial={false}>
            {(onOpenGrammar || onOpenReading) && (
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
                  {openMenu === 'study' && !feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute bottom-full pb-3 w-60 sm:w-64 z-50 pointer-events-auto"
                      style={{
                        left: studyMenuLeft !== null ? `${studyMenuLeft}px` : 'calc(50% - 120px)',
                      }}
                    >
                      <div
                        role="menu"
                        aria-label="Choose Grammar or Reading"
                        className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg flex flex-col gap-1.5"
                      >
                        {onOpenGrammar && (
                          <ActionButton
                            role="menuitem"
                            variant="quiet"
                            size="md"
                            fullWidth
                            className="justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold text-ui-ink-strong hover:text-feedback-warning-edge"
                            onClick={() => {
                              setOpenMenu(null);
                              onOpenGrammar();
                            }}
                          >
                            <AppIcon name="grammar" size={22} className="text-feedback-warning-edge shrink-0" />
                            <span>Grammar</span>
                          </ActionButton>
                        )}
                        {onOpenReading && (
                          <ActionButton
                            role="menuitem"
                            variant="quiet"
                            size="md"
                            fullWidth
                            className="justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold text-ui-ink-strong hover:text-brand-primary"
                            onClick={() => {
                              setOpenMenu(null);
                              onOpenReading();
                            }}
                          >
                            <AppIcon name="book" size={22} className="text-brand-primary shrink-0" />
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
                      setOpenMenu((current) => (current === 'study' ? null : 'study'));
                    } else if (onOpenGrammar) {
                      onOpenGrammar();
                    } else if (onOpenReading) {
                      onOpenReading();
                    }
                  }}
                  label="Study materials (grammar and reading)"
                  variant="warning"
                  icon={<AppIcon name="grammar" size={26} className="h-6 w-6" />}
                  className={cn(
                    "h-14 w-14 rounded-feature",
                    openMenu === 'study' && "ring-2 ring-brand-primary/40",
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
              open={openMenu === 'quiz' && !feedback}
              onClose={() => setOpenMenu(null)}
              modeKey="quiz"
              containerRef={modesContainerRef}
              label="Choose quiz mode"
              options={QUIZ_MODES}
              selectedValue={quizMode}
              onSelect={selectQuizMode}
            />
            <DockSubMenu<FlashcardViewMode>
              open={openMenu === 'flashcards' && !feedback}
              onClose={() => setOpenMenu(null)}
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
                            className="h-6 w-6 transition-transform group-hover:scale-105"
                          />
                        ),
                        title: activity.label,
                        buttonProps: isQuiz ? {
                            'data-mode': 'quiz',
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': openMenu === 'quiz',
                            className: openMenu === 'quiz' ? 'ring-2 ring-white/40' : undefined,
                        } : isFlashcards ? {
                            'data-mode': 'flashcards',
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': openMenu === 'flashcards',
                            className: openMenu === 'flashcards' ? 'ring-2 ring-white/40' : undefined,
                        } : undefined,
                      };
                    })}
                    onChange={(activity) => {
                      // Tapping the segment that owns an open sub-menu closes
                      // it; tapping the other one swaps the open sub-menu.
                      if (activity === 'quiz') {
                        setOpenMenu((current) => (current === 'quiz' ? null : 'quiz'));
                        return;
                      }
                      if (activity === 'flashcards') {
                        setOpenMenu((current) => (current === 'flashcards' ? null : 'flashcards'));
                        return;
                      }
                      setOpenMenu(null);
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
