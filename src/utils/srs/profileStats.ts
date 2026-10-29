import type { DBVocabularyRow } from '../../types/database';
import type { ReviewEvent } from './reviewEvents';

function localDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function shiftDay(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

/** Calendar arithmetic (rather than 24h offsets) also handles DST boundaries. */
export function computeStreak(events: Pick<ReviewEvent, 'reviewedAt'>[], now: number | Date) {
  const today = new Date(now);
  const days = new Set(events.filter((e) => Number.isFinite(e.reviewedAt) && e.reviewedAt <= +today)
    .map((e) => localDay(new Date(e.reviewedAt))));
  const studiedToday = days.has(localDay(today));
  let cursor = shiftDay(today, studiedToday ? 0 : -1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  const todayIndex = (today.getDay() + 6) % 7;
  const monday = shiftDay(today, -todayIndex);
  return { streak, studiedToday, todayIndex, week: Array.from({ length: 7 }, (_, i) => days.has(localDay(shiftDay(monday, i)))) };
}

/** The earliest review that already happened (ms), or null for a new learner. */
export function firstReviewAt(events: Pick<ReviewEvent, 'reviewedAt'>[], now: number): number | null {
  const first = events.reduce((min, event) => event.reviewedAt <= now && event.reviewedAt > 0 ? Math.min(min, event.reviewedAt) : min, Infinity);
  return Number.isFinite(first) ? first : null;
}

/** Each word's study form in the learner's script, for character counts and word lists. */
export function characterForms(rows: Pick<DBVocabularyRow, 'id' | 'traditional' | 'simplified'>[], preference: 'traditional' | 'simplified'): Map<string, string> {
  return new Map(rows.map((row) => [row.id, row[preference] ?? row.traditional ?? row.simplified ?? '']));
}

/** Caller projects the active character form once; only Han glyphs count. */
export function countKnownCharacters(learnedCards: string[], vocabById: ReadonlyMap<string, string>): number {
  const characters = new Set<string>();
  for (const id of learnedCards) {
    for (const glyph of vocabById.get(id) ?? '') {
      if (/\p{Script=Han}/u.test(glyph)) characters.add(glyph);
    }
  }
  return characters.size;
}

export function lessonProgress(vocabItems: Pick<DBVocabularyRow, 'id'>[], learnedCards: string[]) {
  const learned = new Set(learnedCards);
  const progress: Record<number, { known: number; total: number }> = {};
  for (const id of new Set(vocabItems.map((item) => item.id))) {
    const match = /^B\d+L(\d+)-/.exec(id);
    const lesson = Number(match?.[1]);
    if (!lesson) continue;
    const entry = progress[lesson] ??= { known: 0, total: 0 };
    entry.total++;
    if (learned.has(id)) entry.known++;
  }
  return progress;
}

/** Records are ordered oldest first; each word's alternatives newest first. */
export function topConfusionPairs(confusions: Record<string, string[]>, limit = 3): [string, string][] {
  const seen = new Set<string>();
  const pairs: [string, string][] = [];
  for (const [a, others] of Object.entries(confusions).reverse()) {
    for (const b of others) {
      const key = JSON.stringify([a, b].sort());
      if (a === b || seen.has(key)) continue;
      seen.add(key);
      pairs.push([a, b]);
      if (pairs.length >= limit) return limit > 0 ? pairs : [];
    }
  }
  return pairs;
}
