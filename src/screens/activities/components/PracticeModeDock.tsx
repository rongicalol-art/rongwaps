import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, FloatingDock, SegmentedControl } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import type { QuizMode } from '../../../types/models';
import type { FlashcardViewMode } from '../../flashcard';
import { DockSubMenu } from './DockSubMenu';
import { PracticeStudyAction } from './PracticeStudyAction';

export const PRACTICE_ACTIVITIES = [
  { id: 'flashcards', label: 'Flashcards', icon: 'cards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'listening', label: 'Listening', icon: 'audio' },
  { id: 'writing', label: 'Writing', icon: 'writing' },
] as const;

export type PracticeActivityId = (typeof PRACTICE_ACTIVITIES)[number]['id'];

/** The single anchored sub-menu the dock can have open at a time. */
type DockMenu = 'quiz' | 'flashcards' | 'study';

export interface PracticeModeDockProps {
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
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);

  useDismiss({
    ref: dockRef,
    onDismiss: () => setOpenMenu(null),
    isActive: Boolean(openMenu),
  });

  return (
    <FloatingDock.Root>
      <div
        ref={dockRef}
        className="pointer-events-auto relative flex w-full max-w-[392px] items-center justify-center gap-2.5 sm:gap-3"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpenMenu(null);
          }
        }}
      >
        <AnimatePresence initial={false}>
          {(onOpenGrammar || onOpenReading) && (
            <PracticeStudyAction
              isOpen={openMenu === 'study'}
              hasFeedback={Boolean(feedback)}
              onToggle={() => {
                if (onOpenGrammar && onOpenReading) {
                  setOpenMenu((current) => (current === 'study' ? null : 'study'));
                } else if (onOpenGrammar) {
                  onOpenGrammar();
                } else if (onOpenReading) {
                  onOpenReading();
                }
              }}
              onClose={() => setOpenMenu(null)}
              onOpenGrammar={onOpenGrammar}
              onOpenReading={onOpenReading}
            />
          )}
        </AnimatePresence>

        <div
          ref={modesContainerRef}
          className="relative flex dock-pill min-w-0 flex-1 w-full max-w-[320px] items-center justify-center"
        >
          <DockSubMenu<QuizMode>
            open={openMenu === 'quiz' && !feedback}
            onClose={() => setOpenMenu(null)}
            modeKey="quiz"
            containerRef={modesContainerRef}
            label="Choose quiz mode"
            options={QUIZ_MODES}
            selectedValue={quizMode}
            onSelect={onSelectQuizMode}
          />
          <DockSubMenu<FlashcardViewMode>
            open={openMenu === 'flashcards' && !feedback}
            onClose={() => setOpenMenu(null)}
            modeKey="flashcards"
            containerRef={modesContainerRef}
            label="Choose flashcards view"
            options={FLASHCARD_MODES}
            selectedValue={flashcardMode}
            onSelect={(mode) => onSelectFlashcardMode?.(mode)}
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
                className="flex dock-pill w-full items-center justify-center gap-2.5 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    feedback.type === 'learned' ? 'bg-feedback-success' : 'bg-feedback-danger'
                  }`}
                />
                <span
                  className={`text-[15px] font-extrabold uppercase tracking-widest ${
                    feedback.type === 'learned'
                      ? 'text-feedback-success-edge'
                      : 'text-feedback-danger-edge'
                  }`}
                >
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
                className="flex dock-pill w-full items-center justify-center"
              >
                <SegmentedControl<PracticeActivityId>
                  value={value}
                  ariaLabel="Practice mode"
                  layoutId="practice-modes-dock-pill"
                  className="w-full dock-pill rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5 px-2.5"
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
                          size={26}
                          className="h-6.5 w-6.5 transition-transform group-hover:scale-105"
                        />
                      ),
                      title: activity.label,
                      buttonProps: isQuiz
                        ? {
                            'data-mode': 'quiz',
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': openMenu === 'quiz',
                            className: openMenu === 'quiz' ? 'ring-2 ring-white/40' : undefined,
                          }
                        : isFlashcards
                        ? {
                            'data-mode': 'flashcards',
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': openMenu === 'flashcards',
                            className:
                              openMenu === 'flashcards' ? 'ring-2 ring-white/40' : undefined,
                          }
                        : undefined,
                    };
                  })}
                  onChange={(activity) => {
                    if (activity === 'quiz') {
                      setOpenMenu((current) => (current === 'quiz' ? null : 'quiz'));
                      return;
                    }
                    if (activity === 'flashcards') {
                      setOpenMenu((current) =>
                        current === 'flashcards' ? null : 'flashcards'
                      );
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
    </FloatingDock.Root>
  );
}
