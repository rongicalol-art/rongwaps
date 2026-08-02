import type { InteractiveGrammarPart } from '../types/models';

export type LearningPathStatus = 'not-started' | 'in-progress' | 'completed';

export function appendUniqueId(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function getGrammarPathStatus(
  part: InteractiveGrammarPart,
  startedPartIds: string[],
  completedPageIds: string[],
  completedPartIds: string[],
): LearningPathStatus {
  if (completedPartIds.includes(part.id)) return 'completed';
  if (
    startedPartIds.includes(part.id)
    || part.grammarPages.some((page) => completedPageIds.includes(page.id))
  ) return 'in-progress';
  return 'not-started';
}

export function getReadingPathStatus(
  partId: string,
  startedPartIds: string[],
  completedPartIds: string[],
): LearningPathStatus {
  if (completedPartIds.includes(partId)) return 'completed';
  if (startedPartIds.includes(partId)) return 'in-progress';
  return 'not-started';
}
