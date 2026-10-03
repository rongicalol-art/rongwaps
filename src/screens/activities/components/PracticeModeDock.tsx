import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppIcon, FloatingDock, SegmentedControl } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingDockSleep } from '../../../hooks/useFloatingDockSleep';
import { cn } from '../../../utils/cn';
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
  onChange: (activity: PracticeActivityId) => void;
  onOpenGrammar?: () => void;
  onOpenReading?: () => void;
  onSelectQuizMode: (mode: QuizMode) => void;
  onSelectFlashcardMode?: (mode: FlashcardViewMode) => void;
  flashcardMode?: FlashcardViewMode;
  quizMode?: QuizMode | null;
  value: PracticeActivityId;
  visible?: boolean;
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
  onChange,
  onOpenGrammar,
  onOpenReading,
  onSelectQuizMode,
  onSelectFlashcardMode,
  flashcardMode = 'cards',
  quizMode,
  value,
  visible = true,
}: PracticeModeDockProps) {
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);

  const { isAsleep, dockProps, wake } = useFloatingDockSleep({
    ref: dockRef,
    isLockedAwake: Boolean(openMenu),
    onMouseLeave: () => setOpenMenu(null),
  });

  // Re-wake dock only when switching activity or mode
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      wake();
    }
  }, [value, wake]);

  useDismiss({
    ref: dockRef,
    onDismiss: () => setOpenMenu(null),
    isActive: Boolean(openMenu),
  });

  return (
    <FloatingDock.Root visible={visible}>
      <div
        ref={dockRef}
        {...dockProps}
        className={cn(
          'pointer-events-auto relative flex w-full max-w-sm items-center justify-center gap-2.5 sm:gap-3',
          'transition-[opacity,box-shadow]',
          isAsleep
            ? 'opacity-20 shadow-none duration-300 ease-in-out'
            : 'opacity-100 duration-200 ease-out',
        )}
      >
        <AnimatePresence initial={false}>
          {(onOpenGrammar || onOpenReading) && (
            <PracticeStudyAction
              isOpen={openMenu === 'study'}
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
          className="relative dock-pill min-w-0 flex-1 w-full max-w-xs"
        >
          <DockSubMenu<QuizMode>
            open={openMenu === 'quiz'}
            onClose={() => setOpenMenu(null)}
            modeKey="quiz"
            containerRef={modesContainerRef}
            label="Choose quiz mode"
            options={QUIZ_MODES}
            selectedValue={quizMode}
            onSelect={onSelectQuizMode}
          />
          <DockSubMenu<FlashcardViewMode>
            open={openMenu === 'flashcards'}
            onClose={() => setOpenMenu(null)}
            modeKey="flashcards"
            containerRef={modesContainerRef}
            label="Choose flashcards view"
            options={FLASHCARD_MODES}
            selectedValue={flashcardMode}
            onSelect={(mode) => onSelectFlashcardMode?.(mode)}
          />
          <SegmentedControl<PracticeActivityId>
            value={value}
            ariaLabel="Practice mode"
            layoutId="practice-modes-dock-pill"
            className="w-full h-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5 px-2.5 shadow-ambient-sm"
            options={PRACTICE_ACTIVITIES.map((activity) => {
              const isSubMenu = activity.id === 'quiz' || activity.id === 'flashcards';
              const isMenuOpen = openMenu === activity.id;
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
                buttonProps: isSubMenu
                  ? {
                      'data-mode': activity.id,
                      'aria-haspopup': 'menu' as const,
                      'aria-expanded': isMenuOpen,
                      className: isMenuOpen ? 'ring-2 ring-white/40' : undefined,
                    }
                  : undefined,
              };
            })}
            onChange={(activity) => {
              const isSubMenu = activity === 'quiz' || activity === 'flashcards';
              if (isSubMenu && value === activity) {
                setOpenMenu((current) => (current === activity ? null : activity));
                return;
              }
              setOpenMenu(null);
              onChange(activity);
            }}
          />
        </div>
      </div>
    </FloatingDock.Root>
  );
}
