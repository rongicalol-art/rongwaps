export type GrammarLessonView = 'study' | 'exercise' | 'complete';

export interface GrammarLessonSelection {
  grammarIndex: number;
  view: GrammarLessonView;
}

interface ContinueGrammarOptions {
  grammarIndex: number;
  grammarCount: number;
  allGrammarComplete: boolean;
  firstIncompleteIndex: number;
}

export function selectGrammar(grammarIndex: number): GrammarLessonSelection {
  return { grammarIndex, view: 'study' };
}

export function selectGrammarMode(
  grammarIndex: number,
  view: Extract<GrammarLessonView, 'study' | 'exercise'>,
): GrammarLessonSelection {
  return { grammarIndex, view };
}

export function continueGrammarLesson({
  grammarIndex,
  grammarCount,
  allGrammarComplete,
  firstIncompleteIndex,
}: ContinueGrammarOptions): GrammarLessonSelection {
  if (grammarIndex < grammarCount - 1) return selectGrammar(grammarIndex + 1);
  if (allGrammarComplete) return { grammarIndex, view: 'complete' };
  return selectGrammar(firstIncompleteIndex >= 0 ? firstIncompleteIndex : grammarIndex);
}
