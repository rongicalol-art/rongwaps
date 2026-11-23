import type { LessonTestPart } from '../../types/lessonTest';
import type { MockBand, MockRecipe, PoolEntry, RecipeLine } from './pool';

/**
 * The band tests' recipes: how many questions of each shape a paper takes, in the official papers' own order and
 * share (measured on the official mock papers, docs/reference/TOCFL.md "Item types by band"). Full is the real
 * length, 50 listening + 50 reading; Quick keeps the same mix at a fifth of the length. To change a paper's make-up,
 * change a number here; to add questions, add them to the pool.
 */

export type MockLength = 'quick' | 'full';
/** The bands a fixed test exists for (Novice questions serve the adaptive test only). */
export type RecipeBand = Exclude<MockBand, 'N'>;

type Shape = readonly [shape: string, quick: number, full: number];

const SHAPES: Readonly<Record<RecipeBand, Record<LessonTestPart, readonly Shape[]>>> = {
  A: {
    // 看圖回答, 問答理解, 對話理解 (spoken, then printed choices).
    listening: [['picture-hear', 2, 10], ['hear-pick-picture', 3, 15], ['dialogue-spoken', 3, 15], ['dialogue-printed', 2, 10]],
    // 單句理解, 看圖釋義, 選詞填空, 完成段落, 閱讀理解. Scene pictures carry 3 gaps and a paragraph 4 blanks here.
    reading: [['sentence-picture', 3, 15], ['realia', 2, 15], ['scene-gap', 3, 9], ['paragraph-bank', 0, 4], ['reading', 2, 7]],
  },
  B: {
    // 對話 (single questions, then groups), 段落 (talks).
    listening: [['dialogue-printed', 4, 20], ['dialogue-group', 2, 10], ['talk', 0, 4], ['talk-group', 4, 16]],
    // 選詞填空 (3 passages), 閱讀理解.
    reading: [['cloze', 5, 17], ['reading', 0, 4], ['reading-group', 5, 29]],
  },
  C: {
    listening: [['dialogue-group', 5, 25], ['talk-group', 5, 25]],
    reading: [['cloze', 5, 17], ['reading-group', 5, 33]],
  },
};

export const RECIPE_BANDS = Object.keys(SHAPES) as RecipeBand[];

export function mockRecipe(band: RecipeBand, length: MockLength): MockRecipe {
  const lines: RecipeLine[] = (['listening', 'reading'] as const).flatMap((part) => SHAPES[band][part]
    .map(([shape, quick, full]) => ({ section: `${band}:${part}:${shape}`, questions: length === 'quick' ? quick : full }))
    .filter((line) => line.questions > 0));
  return { key: `band-${band}-${length}`, band, lines };
}

/** Questions one skill of a recipe asks. */
export function recipeQuestions(recipe: MockRecipe, part: LessonTestPart): number {
  return recipe.lines.filter((line) => line.section.startsWith(`${recipe.band}:${part}:`)).reduce((sum, line) => sum + line.questions, 0);
}

/**
 * Whether the pool can run a band's test: enough questions of that band for a full paper in both skills. A band
 * with no questions yet (Band C before its questions are written) stays closed, and opens by itself once they exist.
 */
export function bandOpen(pool: readonly PoolEntry[], band: RecipeBand): boolean {
  const full = mockRecipe(band, 'full');
  return (['listening', 'reading'] as const).every((part) => {
    // One test shows one version of a slot, so a family counts once.
    const families = new Map<string, number>();
    for (const entry of pool) if (entry.band === band && entry.part === part) families.set(entry.family, Math.max(families.get(entry.family) ?? 0, entry.item.questions.length));
    const have = [...families.values()].reduce((sum, questions) => sum + questions, 0);
    return have >= recipeQuestions(full, part);
  });
}
