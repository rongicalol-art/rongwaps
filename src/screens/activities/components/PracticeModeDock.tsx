import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingDock, PlayfulNavIcon, SegmentedControl } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingDockSleep } from '../../../hooks/useFloatingDockSleep';
import { cn } from '../../../utils/cn';
import type { QuizMode } from '../../../types/models';
import type { FlashcardViewMode } from '../../flashcard';
import { DockSubMenu } from './DockSubMenu';
import { DOCK_SWAP, PracticeDockSlotOutlet, usePracticeDockSlot } from '../../../features/practice';
import { PracticeStudyAction } from './PracticeStudyAction';
import type { PracticeDockLayout } from './practiceDockLayout';

export const PRACTICE_ACTIVITIES = [
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'listening', label: 'Listening', icon: 'listening' },
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
  layout: PracticeDockLayout;
  /** Fade the dock when idle. */
  autoHide?: boolean;
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
  layout,
  autoHide = false,
}: PracticeModeDockProps) {
  const { isVertical, side } = layout;
  const showModes = !usePracticeDockSlot()?.exclusive;
  const reduceMotion = useReducedMotion();
  const swapY = reduceMotion ? 0 : DOCK_SWAP.distance;
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);

  const { isAsleep, dockProps, wake } = useFloatingDockSleep({
    ref: dockRef,
    enabled: autoHide,
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
    <FloatingDock.Root visible={visible} className={layout.rootClassName}>
      <div
        ref={dockRef}
        {...dockProps}
        className={cn(
          'pointer-events-auto relative flex flex-col items-center gap-2.5',
          isVertical ? 'w-[60px]' : 'w-full max-w-sm',
          'transition-[opacity,box-shadow]',
          isAsleep
            ? 'opacity-20 shadow-none duration-300 ease-in-out'
            : 'opacity-100 duration-200 ease-out',
        )}
      >
        {/* The mode switcher and a mode's own controls (e.g. writing) share one grid cell, so swapping them never shifts the dock. */}
        <div className="grid w-full">
        <PracticeDockSlotOutlet className="w-full [grid-area:1/1] self-end" />

        <AnimatePresence initial={false}>
        {showModes && (
          <motion.div
            key="dock-modes"
            initial={{ opacity: 0, y: swapY }}
            animate={{
              opacity: 1,
              y: 0,
              // Wait for the other controls to slide away before rising in.
              transition: { duration: DOCK_SWAP.enterSeconds, ease: DOCK_SWAP.ease, delay: DOCK_SWAP.exitSeconds },
            }}
            exit={{ opacity: 0, y: swapY, transition: { duration: DOCK_SWAP.exitSeconds, ease: DOCK_SWAP.ease } }}
            className={cn(
              'flex w-full items-center justify-center gap-2.5 [grid-area:1/1] self-end sm:gap-3',
              isVertical && 'flex-col',
            )}
          >
            <div
              ref={modesContainerRef}
              className={cn(
                'relative',
                isVertical ? 'w-full' : 'dock-pill min-w-0 flex-1 w-full max-w-xs',
              )}
            >
              <DockSubMenu<QuizMode>
                open={openMenu === 'quiz'}
                onClose={() => setOpenMenu(null)}
                modeKey="quiz"
                side={side}
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
                side={side}
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
                tone="soft"
                hoverLabels
                orientation={isVertical ? 'vertical' : 'horizontal'}
                tooltipSide={side}
                className={cn('w-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface shadow-ambient-sm', isVertical ? 'p-1.5' : 'h-full p-1.5 px-2.5')}
                options={PRACTICE_ACTIVITIES.map((activity) => {
                  const isSubMenu = activity.id === 'quiz' || activity.id === 'flashcards';
                  const isMenuOpen = openMenu === activity.id;
                  return {
                    value: activity.id,
                    label: activity.label,
                    showLabel: false,
                    icon: (
                      <PlayfulNavIcon
                        name={activity.icon}
                        className="h-7 w-7 transition-transform group-hover:scale-105"
                      />
                    ),
                    buttonProps: {
                      ...(isSubMenu && {
                        'data-mode': activity.id,
                        'aria-haspopup': 'menu' as const,
                        'aria-expanded': isMenuOpen,
                      }),
                      className: cn(
                        isVertical && 'h-11 flex-none',
                        isSubMenu && isMenuOpen && 'ring-2 ring-brand-primary/40',
                      ),
                    },
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
                  side={side}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>
    </FloatingDock.Root>
  );
}
