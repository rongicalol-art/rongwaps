import { useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingDock, PlayfulNavIcon, SegmentedControl } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { useFloatingDockSleep } from '../../../hooks/useFloatingDockSleep';
import { cn } from '../../../utils/cn';
import type { QuizMode } from '../../../types/models';
import { DockSubMenu, type DockSubMenuOption } from './DockSubMenu';
import { DOCK_SWAP, PracticeDockSlotOutlet, usePracticeDockSlot } from '../../../features/practice';
import type { PracticeDockLayout } from './practiceDockLayout';
import { PracticeStudyAction } from './PracticeStudyAction';
import type { StudyMaterialItem } from '../hooks/useStudyMaterials';

export const PRACTICE_ACTIVITIES = [
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'writing', label: 'Writing', icon: 'writing' },
  { id: 'pinyin', label: 'Pinyin', icon: 'pinyinPractice' },
  { id: 'tones', label: 'Tones', icon: 'tones' },
  { id: 'sentences', label: 'Sentences', icon: 'reading' },
] as const;

export type PracticeActivityId = (typeof PRACTICE_ACTIVITIES)[number]['id'];

export const DOCK_TABS = [
  { id: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'practiceHub', label: 'Practice Hub', icon: 'practiceHub' },
] as const;

export type DockTabId = (typeof DOCK_TABS)[number]['id'];

export type PracticeHubOptionId = 'writing' | 'pinyin' | 'tones' | 'sentences';

const isPracticeHubOption = (value: string): value is PracticeHubOptionId => (
  value === 'writing' || value === 'pinyin' || value === 'tones' || value === 'sentences'
);

const PRACTICE_HUB_OPTIONS: ReadonlyArray<DockSubMenuOption<PracticeHubOptionId>> = [
  { value: 'writing', label: 'Writing', playfulIcon: 'writing' },
  { value: 'pinyin', label: 'Pinyin', playfulIcon: 'pinyinPractice' },
  { value: 'tones', label: 'Tones', playfulIcon: 'tones' },
  { value: 'sentences', label: 'Sentences', playfulIcon: 'reading' },
];

/** The single anchored sub-menu the dock can have open at a time. */
type DockMenu = 'quiz' | 'practiceHub' | 'study';

export interface PracticeModeDockProps {
  onChange: (activity: PracticeActivityId) => void;
  onSelectQuizMode: (mode: QuizMode) => void;
  quizMode?: QuizMode | null;
  value: PracticeActivityId;
  visible?: boolean;
  layout: PracticeDockLayout;
  /** Element that gets `--dock-inset`: the dock's height plus its offset from that element's bottom, so screens can sit above it. */
  insetRef?: RefObject<HTMLElement | null>;
  /** Fade the dock when idle. */
  autoHide?: boolean;
  /** Grammar and Reading runs over the session's lessons; the book button shows when there are any. */
  studyItems?: StudyMaterialItem[];
}

const QUIZ_MODES: ReadonlyArray<DockSubMenuOption<QuizMode>> = [
  { value: 'choices', label: 'Choose', icon: 'choices' },
  { value: 'typing', label: 'Type', icon: 'typeText' },
] as const;

export function PracticeModeDock({
  onChange,
  onSelectQuizMode,
  quizMode,
  value,
  visible = true,
  layout,
  insetRef,
  autoHide = false,
  studyItems = [],
}: PracticeModeDockProps) {
  const { isVertical, side } = layout;
  const dockSlot = usePracticeDockSlot();
  const showModes = !dockSlot?.exclusive;
  const reduceMotion = useReducedMotion();
  const swapY = reduceMotion ? 0 : DOCK_SWAP.distance;
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const modesContainerRef = useRef<HTMLDivElement>(null);

  const dockValue: DockTabId =
    isPracticeHubOption(value)
      ? 'practiceHub'
      : value === 'quiz'
        ? 'quiz'
        : 'flashcards';

  // Measured, not hardcoded: follows the dock's real size and its bottom offset at every breakpoint. Left in place when the dock hides, so the screens never jump.
  // An effect, not a layout effect: a parent's ref is only attached after its children's layout effects ran.
  useEffect(() => {
    const dock = dockRef.current;
    const root = dock?.parentElement;
    const target = insetRef?.current;
    if (!dock || !root || !target) return undefined;
    // Only ever grows: swapping the mode switcher for a mode's own controls (grades, writing) must not nudge the screens.
    let tallest = 0;
    const measure = () => {
      tallest = Math.max(tallest, dock.offsetHeight);
      const px = isVertical ? 0 : Math.ceil(tallest + (parseFloat(getComputedStyle(root).bottom) || 0));
      target.style.setProperty('--dock-inset', isVertical ? '0px' : `calc(${px}px + 1rem)`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    observer.observe(target);
    return () => observer.disconnect();
  }, [insetRef, isVertical]);

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
    <FloatingDock.Root visible={visible && !dockSlot?.yielded} className={layout.rootClassName}>
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
                isVertical ? 'w-full' : 'dock-pill min-w-0 flex-1 w-full max-w-56',
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
              <DockSubMenu<PracticeHubOptionId>
                open={openMenu === 'practiceHub'}
                onClose={() => setOpenMenu(null)}
                modeKey="practiceHub"
                side={side}
                containerRef={modesContainerRef}
                label="Practice options"
                options={PRACTICE_HUB_OPTIONS}
                selectedValue={isPracticeHubOption(value) ? value : null}
                onSelect={(selectedMode) => {
                  onChange(selectedMode);
                }}
              />
              <SegmentedControl<DockTabId>
                value={dockValue}
                ariaLabel="Practice mode"
                layoutId="practice-modes-dock-pill"
                tone="soft"
                hoverLabels
                orientation={isVertical ? 'vertical' : 'horizontal'}
                tooltipSide={side}
                className={cn('w-full rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface shadow-ambient-sm', isVertical ? 'p-1.5' : 'h-full p-1.5 px-2')}
                options={DOCK_TABS.map((tab) => {
                  const isSubMenu = tab.id === 'quiz' || tab.id === 'practiceHub';
                  const isMenuOpen = openMenu === tab.id;
                  return {
                    value: tab.id,
                    label: tab.label,
                    showLabel: false,
                    icon: (
                      <PlayfulNavIcon
                        name={tab.icon}
                        className="h-7 w-7"
                      />
                    ),
                    buttonProps: {
                      ...(isSubMenu && {
                        'data-mode': tab.id,
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
                onChange={(tabId) => {
                  if (tabId === 'practiceHub') {
                    setOpenMenu((current) => (current === 'practiceHub' ? null : 'practiceHub'));
                    return;
                  }
                  if (tabId === 'quiz') {
                    if (value === 'quiz') {
                      setOpenMenu((current) => (current === 'quiz' ? null : 'quiz'));
                      return;
                    }
                    setOpenMenu(null);
                    onChange('quiz');
                    return;
                  }
                  setOpenMenu(null);
                  onChange(tabId as PracticeActivityId);
                }}
              />
            </div>
            {studyItems.length > 0 && (
              <PracticeStudyAction
                isOpen={openMenu === 'study'}
                onToggle={() => setOpenMenu((current) => (current === 'study' ? null : 'study'))}
                onClose={() => setOpenMenu(null)}
                items={studyItems}
                side={side}
                className="order-first"
              />
            )}
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>
    </FloatingDock.Root>
  );
}
