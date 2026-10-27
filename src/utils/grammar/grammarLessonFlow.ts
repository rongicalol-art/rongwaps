import type { InteractiveGrammarPage, InteractiveGrammarPart, PartSegment } from '../../types/models';
import { formatPartSelection } from '../lesson/lessonPartSelection';

/** One reading step per grammar point. Exercises remain authored for later. */
export function buildGrammarPartSegments(part: InteractiveGrammarPart): PartSegment[] {
  return part.grammarPages.map((grammarPage, index) => ({
    partId: index + 1,
    label: `Grammar ${grammarPage.grammarNumber}`,
    cardCount: 1,
    startIndex: index,
  }));
}

/**
 * One continuous run for a multi-part grammar launch: every selected part's
 * pages in course order, deduped by page id. Each page keeps its source part
 * (`page.partId`), so completion still lands on the real grammar part.
 * A single part is returned unchanged to keep its identity stable.
 */
export function combineGrammarParts(parts: InteractiveGrammarPart[]): InteractiveGrammarPart | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const pages = Array.from(
    new Map(parts.flatMap((part) => part.grammarPages).map((page) => [page.id, page] as const)).values(),
  );
  const firstNumber = pages[0]?.grammarNumber ?? 1;
  const lastNumber = pages[pages.length - 1]?.grammarNumber ?? firstNumber;

  return {
    ...parts[0],
    id: parts.map((part) => part.id).join('+'),
    title: `Grammar ${firstNumber}–${lastNumber} · ${formatPartSelection(parts.map((part) => part.partId))}`,
    grammarPages: pages,
  };
}

/** Source part numbers whose every grammar page appears in `completedPageIds`. */
export function completedGrammarPartNumbers(
  pages: Pick<InteractiveGrammarPage, 'id' | 'partId'>[],
  completedPageIds: string[],
): number[] {
  const completed = new Set(completedPageIds);
  const pagesByPart = new Map<number, string[]>();

  for (const page of pages) {
    const ids = pagesByPart.get(page.partId) ?? [];
    ids.push(page.id);
    pagesByPart.set(page.partId, ids);
  }

  return [...pagesByPart]
    .flatMap(([partId, ids]) => (ids.every((id) => completed.has(id)) ? [partId] : []));
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
