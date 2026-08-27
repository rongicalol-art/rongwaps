import type { InteractiveGrammarPart, PartSegment } from '../types/models';

/** One reading step per grammar point. Exercises remain authored for later. */
export function buildGrammarPartSegments(part: InteractiveGrammarPart): PartSegment[] {
  return part.grammarPages.map((grammarPage, index) => ({
    partId: index + 1,
    label: `Grammar ${grammarPage.grammarNumber}`,
    cardCount: 1,
    startIndex: index,
  }));
}

export interface GrammarLessonSelection {
  grammarIndex: number;
  isPartComplete?: boolean;
}

interface ContinueGrammarOptions {
  grammarIndex: number;
  grammarCount: number;
  pageId: string;
  completedPageIds: string[];
  allPageIds: string[];
}

export function selectGrammar(grammarIndex: number): GrammarLessonSelection {
  return { grammarIndex };
}

/**
 * Advance after a completed grammar. Completing the grammar marks `pageId`
 * complete before deciding whether the part is finished, so the result is
 * correct even when the render-time completed set has not updated yet during
 * the same click.
 */
export function continueGrammarLesson({
  grammarIndex,
  grammarCount,
  pageId,
  completedPageIds,
  allPageIds,
}: ContinueGrammarOptions): GrammarLessonSelection {
  const postCompletion = new Set(completedPageIds);
  postCompletion.add(pageId);
  const allComplete = allPageIds.every((id) => postCompletion.has(id));
  if (grammarIndex < grammarCount - 1) return selectGrammar(grammarIndex + 1);
  if (allComplete) return { grammarIndex, isPartComplete: true };
  const firstIncompleteIndex = allPageIds.findIndex((id) => !postCompletion.has(id));
  return selectGrammar(firstIncompleteIndex >= 0 ? firstIncompleteIndex : grammarIndex);
}
