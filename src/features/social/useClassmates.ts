import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { countedIn } from '../../store/slices/socialSlice';
import type { Person } from '../../../shared/lobby';

/** The lesson the learner is in, for presence lists and a new room's default words. */
export function useCurrentLesson() {
  const viewing = useAppStore((state) => state.socialViewingLesson);
  const people = useAppStore((state) => state.socialPeople);
  return viewing ?? people[0]?.l ?? null;
}

/** Others in a lesson by the exact count (the lists themselves are capped). */
export function useLessonTotal(lesson: number | null) {
  return useAppStore((state) => lesson === null ? 0 : Math.max(0, (state.socialCounts[lesson]?.n ?? 0) - (countedIn(state, lesson) ? 1 : 0)));
}

/**
 * The Online list is a snapshot from when it was opened; this lesson's list is live. Live entries win, and when the
 * live list holds everyone counted here, snapshot entries still claiming this lesson have left it.
 */
export function useClassmates(people: Person[], online: Person[], lesson: number | null, lessonTotal: number) {
  const classmates = useMemo(() => {
    const live = new Set(people.map(p => p.u));
    const liveComplete = people.length >= lessonTotal;
    const map = new Map<string, Person>();
    for (const p of online) if (!(liveComplete && lesson !== null && p.l === lesson && !live.has(p.u))) map.set(p.u, p);
    for (const p of people) map.set(p.u, { ...p, l: p.l ?? lesson });
    return Array.from(map.values());
  }, [online, people, lesson, lessonTotal]);

  return useMemo(() => {
    if (lesson === null) {
      return {
        classmates,
        here: [] as Person[],
        others: [...classmates].sort((a, b) => (a.l ?? 1000) - (b.l ?? 1000) || a.n.localeCompare(b.n)),
      };
    }
    const inLesson: Person[] = [];
    const inOthers: Person[] = [];
    for (const p of classmates) {
      if (p.l === lesson) inLesson.push(p);
      else inOthers.push(p);
    }
    inLesson.sort((a, b) => a.n.localeCompare(b.n));
    inOthers.sort((a, b) => (a.l ?? 1000) - (b.l ?? 1000) || a.n.localeCompare(b.n));
    return { classmates, here: inLesson, others: inOthers };
  }, [classmates, lesson]);
}
