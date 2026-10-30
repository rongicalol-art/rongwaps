import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLongPress } from '../../../hooks/useLongPress';
import { cn } from '../../../utils/cn';
import { readString, writeString } from '../../../utils/browser/localStorage';
import type { LessonWindowPart } from './useLessonWindowParts';

interface PartTabsProps {
  parts: LessonWindowPart[];
  selectedPartIds?: number[];
  activeIndex?: number;
  onSelectPart?: (partId: number) => void;
  onTogglePart?: (partId: number) => void;
  onChange?: (index: number) => void;
  className?: string;
}

interface PartTabItemProps {
  part: LessonWindowPart;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  pulse?: boolean;
}

// The hold-to-include hint: shown after the second part switch, twice at most, never again once they have included a part.
const HINT_KEY = 'part-hint';
const HINT_MAX_SHOWS = 2;
const HINT_VISIBLE_MS = 6000;
const hintDone = () => readString(HINT_KEY) === 'done' || Number(readString(HINT_KEY) ?? 0) >= HINT_MAX_SHOWS;

function PartTabItem({ part, index, isSelected, onSelect, onToggle, pulse }: PartTabItemProps) {
  const pressHandlers = useLongPress<HTMLButtonElement>({
    // Shift/Cmd-click is the mouse way to hold: it includes the part without a long press.
    onTap: (event: MouseEvent<HTMLButtonElement>) => (event.shiftKey || event.metaKey ? onToggle() : onSelect()),
    onLongPress: onToggle,
    delay: 420,
  });

  return (
    <button
      key={part.id}
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-label={`Part ${index + 1}${isSelected ? ', selected' : ''}. Tap to select; hold to include.`}
      title={`Part ${index + 1} · tap to select · hold (or Shift-click) to include`}
      {...pressHandlers}
      style={{ WebkitTouchCallout: 'none', touchAction: 'manipulation' }}
      className={cn(
        '-mb-0.5 flex items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] pb-2.5 pt-3 text-[15px] font-black outline-none focus-ring-inline cursor-pointer select-none',
        'flex-1 lg:flex-none lg:px-0 lg:pr-7 lg:text-base',
        isSelected ? 'border-brand-primary text-ui-ink-strong' : 'border-transparent text-ui-muted hover:text-ui-muted-strong',
        pulse && 'animate-pulse',
      )}
    >
      {part.isDone && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ui-muted" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Done">
          <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
        </svg>
      )}
      <span>Part {index + 1}</span>
    </button>
  );
}

/** Underline tabs: one per part, tap to switch, hold to include multiple parts. */
export function PartTabs({
  parts,
  selectedPartIds,
  activeIndex = 0,
  onSelectPart,
  onTogglePart,
  onChange,
  className,
}: PartTabsProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const switches = useRef(0);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; arrow: number } | null>(null);

  const hideHint = () => setHintIndex(null);
  useEffect(() => {
    if (hintIndex === null) return;
    const timer = window.setTimeout(hideHint, HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [hintIndex]);

  // Centre the bubble's arrow on the pointed-at tab, then keep the bubble inside the row.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const tab = wrap?.querySelectorAll<HTMLElement>('[role="tab"]')[hintIndex ?? -1];
    if (!wrap || !tab) { setAnchor(null); return; }
    const center = tab.offsetLeft + tab.offsetWidth / 2;
    const width = Math.min(244, wrap.offsetWidth);
    const left = Math.max(0, Math.min(center - width / 2, wrap.offsetWidth - width));
    setAnchor({ left, arrow: center - left });
  }, [hintIndex]);

  if (parts.length < 2) return null;

  const current = selectedPartIds?.length ? parts.findIndex((p) => p.id === selectedPartIds[0]) : activeIndex;
  const markSwitch = () => {
    switches.current += 1;
    if (switches.current < 2 || hintDone()) return;
    const shows = Number(readString(HINT_KEY) ?? 0);
    writeString(HINT_KEY, String(shows + 1));
    setHintIndex((current + 1) % parts.length);
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div role="tablist" aria-label="Lesson parts" className="flex border-b-2 border-ui-divider">
        {parts.map((part, index) => {
          const isSelected = selectedPartIds ? selectedPartIds.includes(part.id) : index === activeIndex;
          const handleSelect = () => {
            if (onSelectPart) onSelectPart(part.id);
            else onChange?.(index);
            if (!isSelected) markSwitch();
          };
          const handleToggle = () => {
            writeString(HINT_KEY, 'done');
            hideHint();
            if (onTogglePart) onTogglePart(part.id);
            else handleSelect();
          };

          return (
            <PartTabItem
              key={part.id}
              part={part}
              index={index}
              isSelected={isSelected}
              onSelect={handleSelect}
              onToggle={handleToggle}
              pulse={hintIndex === index && !reduce}
            />
          );
        })}
      </div>
      <AnimatePresence>
        {hintIndex !== null && anchor && (
          <motion.div
            role="status"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ left: anchor.left, width: Math.min(244, wrapRef.current?.offsetWidth ?? 244) }}
            className="absolute top-full z-popover mt-2.5 rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2.5 text-sm font-bold leading-snug text-ui-ink-strong"
          >
            <span aria-hidden className="absolute -top-[7px] size-3 rotate-45 border-l-2 border-t-2 border-ui-border bg-ui-surface" style={{ left: anchor.arrow - 6 }} />
            <span className="pointer-fine:hidden">Hold a part to add it and practise parts together.</span>
            <span className="hidden pointer-fine:inline">Shift-click a part to add it and practise parts together.</span>
            <button type="button" aria-label="Dismiss hint" onClick={hideHint} className="absolute inset-0 rounded-control outline-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
