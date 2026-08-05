import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import type { QuizMode } from '../../../types/models';
import { cn } from '../../../utils/cn';

export const PRACTICE_ACTIVITIES = [
  { id: 'flashcards', label: 'Flashcards', icon: 'cards' },
  { id: 'quiz', label: 'Quiz', icon: 'exam' },
  { id: 'listening', label: 'Listening', icon: 'audio' },
  { id: 'writing', label: 'Writing', icon: 'practice' },
] as const;

export type PracticeActivityId = (typeof PRACTICE_ACTIVITIES)[number]['id'];

interface PracticeModeDockProps {
  feedback: { text: string; type: 'learned' | 'review' } | null;
  onChange: (activity: PracticeActivityId) => void;
  onOpenGrammar?: () => void;
  onSelectQuizMode: (mode: QuizMode) => void;
  quizMode?: QuizMode | null;
  value: PracticeActivityId;
}

const QUIZ_MODES = [
  { value: 'choices', label: 'Choose', icon: 'choices' },
  { value: 'typing', label: 'Type', icon: 'typeText' },
] as const;

export function PracticeModeDock({
  feedback,
  onChange,
  onOpenGrammar,
  onSelectQuizMode,
  quizMode,
  value,
}: PracticeModeDockProps) {
  const [isQuizMenuOpen, setIsQuizMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isQuizMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) setIsQuizMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsQuizMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizMenuOpen]);

  const selectQuizMode = (mode: QuizMode) => {
    setIsQuizMenuOpen(false);
    onSelectQuizMode(mode);
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
                className="w-16 shrink-0 rounded-[17px] border-b-4 border-ui-border bg-ui-surface p-1.5 md:w-[69px]"
              >
                <IconActionButton
                  onClick={onOpenGrammar}
                  label="Open grammar"
                  variant="quiet"
                  icon={<AppIcon name="grammar" size={25} />}
                  className="h-10 w-full rounded-[13px] text-ui-muted-strong hover:bg-ui-surface hover:text-ui-ink-strong"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex min-w-0 w-full max-w-[300px] items-center justify-center">
            <AnimatePresence>
              {isQuizMenuOpen && !feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute bottom-full left-[37.5%] w-[160px] -translate-x-1/2 pb-2"
                >
                  <div
                    role="menu"
                    aria-label="Choose quiz mode"
                    className="rounded-[17px] border-b-4 border-ui-border bg-ui-surface p-1.5"
                  >
                    {QUIZ_MODES.map((mode) => (
                      <ActionButton
                        key={mode.value}
                        role="menuitem"
                        variant="quiet"
                        size="sm"
                        fullWidth
                        className={cn(
                          'justify-start gap-2.5 px-3 py-2 text-left text-ui-ink-strong',
                          quizMode === mode.value && 'bg-brand-primary/10 text-brand-primary hover:text-brand-primary',
                        )}
                        onClick={() => selectQuizMode(mode.value)}
                      >
                        <AppIcon name={mode.icon} size={19} />
                        {mode.label}
                      </ActionButton>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="popLayout">
              {feedback ? (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  role="status"
                  className="flex h-12 w-full items-center justify-center gap-2.5"
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
                    className="w-full border-b-4 border-ui-border bg-ui-surface p-1.5"
                    options={PRACTICE_ACTIVITIES.map((activity) => {
                      const isQuiz = activity.id === 'quiz';
                      return {
                        value: activity.id,
                        label: <span className="sr-only">{activity.label}</span>,
                        icon: <AppIcon name={activity.icon} size={25} />,
                        title: activity.label,
                        buttonProps: isQuiz ? {
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': isQuizMenuOpen,
                            className: isQuizMenuOpen ? 'bg-ui-surface text-ui-ink-strong' : undefined,
                        } : undefined,
                      };
                    })}
                    onChange={(activity) => {
                      if (activity === 'quiz') {
                        setIsQuizMenuOpen((isOpen) => !isOpen);
                        return;
                      }
                      setIsQuizMenuOpen(false);
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
