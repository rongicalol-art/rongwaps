import { memo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { ReviewOverview } from '../../../utils/srs/reviewOverview';

const calendarIcon = new URL('../../../assets/icons/cube/schedule.svg', import.meta.url).href;
const SETTLE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** px around the button for its focus ring (Tailwind 1.5 = 6px). */
const FOCUS_ROOM = 6;

interface DailyReviewRowProps {
  overview: ReviewOverview;
  onStart: () => void;
}

/**
 * Today's daily review at the top of the lesson list, in the review's honey tone. Shown only while words are
 * waiting; once today's review is done it folds away and the lessons slide up into its place.
 */
export const DailyReviewRow = memo(function DailyReviewRow({ overview, onStart }: DailyReviewRowProps) {
  const reduceMotion = useReducedMotion();
  const count = overview.dailyCount ?? 0;
  const visible = count > 0 && !overview.dailyCompleted;
  const words = `${count} ${count === 1 ? 'word' : 'words'}`;
  const detail = (overview.dailyAnswered ?? 0) > 0 ? `${words} left` : `${words} · 5 min`;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="daily-review"
          // The fold clips, so the inner padding gives the focus ring room and the negative margin takes that room
          // back; both fold to zero together, so the lessons end exactly where they settle.
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: 'auto', opacity: 1, marginTop: -FOCUS_ROOM }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: SETTLE }}
          className="-mx-1.5 w-[calc(100%+0.75rem)] overflow-hidden"
        >
          <div className="px-1.5 pb-4 pt-1.5 lg:pb-6">
            <ActionButton
              variant="secondary"
              size="lg"
              fullWidth
              data-tone="review"
              onClick={onStart}
              aria-label={`Daily review, ${detail}`}
              frontClassName="justify-start gap-3.5 bg-brand-primary-soft px-4 py-3 text-left normal-case tracking-normal hover:bg-brand-primary-wash"
            >
              <img src={calendarIcon} alt="" aria-hidden="true" draggable={false} className="h-11 w-11 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold uppercase tracking-widest text-ui-muted">{detail}</span>
                <span className="block text-lg font-black leading-tight text-ui-ink-strong">Daily review</span>
              </span>
              <AppIcon name="forward" size={22} className="shrink-0 text-brand-primary-deep" />
            </ActionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
