import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon, IconActionButton } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { LessonTestLesson } from '../../../types/lessonTest';
import { LESSON_TEST_PARTS, lessonItemIndex, type LessonTestPlan } from '../../../utils/lesson/lessonTestPlan';
import { useBookletAudio } from '../hooks/useBookletAudio';
import { BookletItem, type BookletView } from './BookletItem';
import { TestWords } from './ChineseText';

interface TestBookletProps {
  lesson: LessonTestLesson;
  plan: LessonTestPlan;
  /** The answers given in the test (question id → original choice index). */
  answers: Record<string, number>;
  onClose: () => void;
  /** A last action under the booklet (the Fix round, when there are mistakes left to fix). */
  footer?: React.ReactNode;
  /** Rises over the results from the bottom; from the Test tab it is the window itself and doesn't move. */
  rise?: boolean;
}

const NO_WORDS: string[] = [];

/** A Pinyin or English switch: a real button that stays pressed (honey) while it's on. */
function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <ActionButton
      size="sm"
      variant="secondary"
      aria-pressed={on}
      edgeColor={on ? 'var(--color-brand-primary-edge)' : undefined}
      frontClassName={on ? '!border-brand-primary bg-brand-primary-wash !text-brand-primary-deep hover:bg-brand-primary-wash' : undefined}
      onClick={onToggle}
    >
      {label}
    </ActionButton>
  );
}

/**
 * Scripts & answers: the whole test on one page, in test order, like the answer booklet after a real TOCFL. Each
 * recording's script (tap a line, or its play button, to hear it; Play all for the whole recording) or text, then
 * its questions with the answer given, the right one and why; missed questions have red numbers. It opens with the
 * Chinese only: Pinyin puts the pinyin over the characters (as in the Reader) and English adds the meanings.
 */
export function TestBooklet({ lesson, plan, answers, onClose, footer, rise = false }: TestBookletProps) {
  const reduceMotion = useReducedMotion();
  const script = useAppStore((state) => state.characterPreference);
  const [pinyin, setPinyin] = useState(false);
  const [english, setEnglish] = useState(false);
  const audio = useBookletAudio();
  const view: BookletView = { script, pinyin, english, audio };
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  // Each part's items with the number of their first question on the test.
  const parts = useMemo(() => {
    const byId = lessonItemIndex(lesson);
    let next = 1;
    return LESSON_TEST_PARTS.map(({ part, label }) => ({
      label,
      entries: plan.items.filter((planned) => planned.part === part).flatMap((planned) => {
        const item = byId.get(planned.itemId);
        if (!item) return [];
        const first = next;
        next += item.questions.length;
        return [{ planned, item, first }];
      }),
    })).filter((entry) => entry.entries.length > 0);
  }, [lesson, plan]);

  const close = () => {
    audio.stop();
    onClose();
  };

  return (
    <motion.div
      data-tone="review"
      role="region"
      aria-label={`Lesson ${lesson.lessonId} test: scripts and answers`}
      initial={rise && !reduceMotion ? { y: '100%' } : false}
      animate={{ y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { y: '100%', transition: { duration: 0.32, ease: [0.4, 0, 1, 1] } }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        close();
      }}
      className="absolute inset-0 z-50 flex flex-col bg-ui-practice-canvas"
    >
      <TestWords value={lesson.allowWords ?? NO_WORDS}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
        <div className="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto] items-center sm:grid-cols-[1fr_auto_1fr] gap-2 bg-gradient-to-b from-ui-practice-canvas from-70% to-transparent px-3 pb-5 pt-3 sm:px-6">
          <IconActionButton ref={closeRef} variant="quiet" icon={<AppIcon name="dropdown" size={24} />} label="Close scripts and answers" onClick={close} className="justify-self-start" />
          {/* The title gives way to the switches on phones. */}
          <h2 className="truncate text-center text-lg font-black text-ui-ink-strong max-sm:invisible">Lesson {lesson.lessonId} test</h2>
          <div className="flex justify-self-end gap-2">
            <Switch label="Pinyin" on={pinyin} onToggle={() => setPinyin((on) => !on)} />
            <Switch label="English" on={english} onToggle={() => setEnglish((on) => !on)} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 pb-12 sm:px-6 lg:max-w-5xl lg:px-10">
          {parts.map(({ label, entries }) => (
            <div key={label}>
              <h3 className="mt-2 text-2xl font-black text-ui-ink-strong">{label}</h3>
              {entries.map(({ planned, item, first }) => (
                <BookletItem key={item.id} item={item} planned={planned} answers={answers} firstNumber={first} view={view} />
              ))}
            </div>
          ))}
          {footer && <div className="mx-auto w-full max-w-md pt-4">{footer}</div>}
        </div>
      </div>
      </TestWords>
    </motion.div>
  );
}
