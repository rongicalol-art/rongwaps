import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

/** A glance is not a read: the end only counts after the reading has been open this long. */
const MIN_OPEN_MS = 8_000;

/**
 * Sits right after a reading's last line. The reading counts as read (for the lesson's done state)
 * once its recording plays through, or once the learner scrolls here after reading for a while.
 */
export function ReadingEndMarker({ readingId, hasFinished }: { readingId: string; hasFinished: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const markReadingRead = useAppStore((state) => state.markReadingRead);
  const isRead = useAppStore((state) => state.readReadingIds.includes(readingId));

  useEffect(() => {
    if (hasFinished && !isRead) markReadingRead(readingId);
  }, [hasFinished, isRead, markReadingRead, readingId]);

  useEffect(() => {
    const el = ref.current;
    if (isRead || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const openedAt = Date.now();
    let timer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      window.clearTimeout(timer);
      if (!entry?.isIntersecting) return;
      timer = window.setTimeout(() => markReadingRead(readingId), Math.max(0, MIN_OPEN_MS - (Date.now() - openedAt)));
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [isRead, markReadingRead, readingId]);

  return <span ref={ref} aria-hidden className="block h-px w-full" />;
}
