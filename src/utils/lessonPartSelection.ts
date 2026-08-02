import type { Flashcard } from '../data/flashcards';
import type { LessonPartSelectionMap } from '../types/models';

const LESSON_SELECTION_KEY_PATTERN = /^(\d+):(\d+)$/;

export function getLessonSelectionKey(bookId: number, lessonId: number) {
  return `${bookId}:${lessonId}`;
}

export function sanitizeLessonPartSelectionMap(value: unknown): LessonPartSelectionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, selection]) => {
      if (!LESSON_SELECTION_KEY_PATTERN.test(key)) return [];
      if (selection === 'all') return [[key, selection]];
      if (!Array.isArray(selection)) return [];

      const partIds = Array.from(new Set(selection))
        .filter((partId): partId is number => Number.isSafeInteger(partId) && partId > 0)
        .sort((a, b) => a - b);
      return partIds.length > 0 ? [[key, partIds]] : [];
    }),
  );
}

export function getSelectedLessonIds(
  selections: LessonPartSelectionMap,
  bookId: number,
): number[] {
  const lessonIds = Object.keys(selections).flatMap((key) => {
    const match = key.match(LESSON_SELECTION_KEY_PATTERN);
    if (!match || Number(match[1]) !== bookId) return [];
    return [Number(match[2])];
  });

  return Array.from(new Set(lessonIds)).sort((a, b) => a - b);
}

export function normalizePartSelection(
  partIds: number[],
  availablePartIds: number[],
): number[] | null {
  const available = Array.from(new Set(availablePartIds)).sort((a, b) => a - b);
  const availableSet = new Set(available);
  const selected = Array.from(new Set(partIds))
    .filter((partId) => availableSet.has(partId))
    .sort((a, b) => a - b);

  if (selected.length === 0) return null;
  return selected;
}

export function reconcilePartSelectionsForBook(
  selections: LessonPartSelectionMap,
  bookId: number,
  availablePartsByLesson: Record<number, number[]>,
): LessonPartSelectionMap {
  let changed = false;
  const next = { ...selections };

  Object.entries(selections).forEach(([key, selection]) => {
    const match = key.match(LESSON_SELECTION_KEY_PATTERN);
    if (!match || Number(match[1]) !== bookId) return;

    const lessonId = Number(match[2]);
    const availablePartIds = availablePartsByLesson[lessonId];
    if (!availablePartIds || availablePartIds.length === 0) {
      delete next[key];
      changed = true;
      return;
    }

    if (selection === 'all') {
      next[key] = [availablePartIds[0]];
      changed = true;
      return;
    }
    const normalized = normalizePartSelection(selection, availablePartIds);
    if (!normalized) {
      delete next[key];
      changed = true;
      return;
    }

    const isSame = normalized.length === selection.length
      && normalized.every((partId, index) => partId === selection[index]);
    if (!isSame) {
      next[key] = normalized;
      changed = true;
    }
  });

  return changed ? next : selections;
}

export function isCardInPartSelection(
  card: Flashcard,
  selections: LessonPartSelectionMap,
): boolean {
  const selection = selections[getLessonSelectionKey(card.bookId, card.lessonId)];
  if (!selection || selection === 'all') return true;
  return selection.includes(card.partId ?? 1);
}

export function getCurriculumSelectionFingerprint(
  bookId: number,
  selectedLessons: number[],
  selections: LessonPartSelectionMap,
) {
  if (selectedLessons.length === 0) return 'all';

  return [...selectedLessons]
    .sort((a, b) => a - b)
    .map((lessonId) => {
      const selection = selections[getLessonSelectionKey(bookId, lessonId)];
      return `${lessonId}:${selection === 'all' || !selection ? 'all' : selection.join('.')}`;
    })
    .join(',');
}

export function getCurriculumSessionKey(
  bookId: number,
  selectedLessons: number[],
  selections: LessonPartSelectionMap,
) {
  return `shared_deck_${bookId}_${getCurriculumSelectionFingerprint(bookId, selectedLessons, selections)}`;
}
