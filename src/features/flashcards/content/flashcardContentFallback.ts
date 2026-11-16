import type { Flashcard } from '../../../data/flashcards';
import { fetchCourseExampleRecords } from '../../../services/contentPacks';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { getIdPosition } from '../../../utils/lesson/curriculumPosition';
import { buildExampleIndex, type ExampleIndex } from './exampleIndex';
import type { FlashcardExtras } from '../../../utils/vocabulary/flashcardExtrasPack';

let index: Promise<ExampleIndex> | null = null;
/** Exact legacy lookup for edited course cards or a missing generated pack. */
export async function lookupLiveFlashcardExtras(card: Flashcard): Promise<FlashcardExtras> {
  if (!getIdPosition(card.id)) return { examples: [] };
  index ??= Promise.all([fetchCourseExampleRecords(), fetchVocabulary()])
    .then(([records, vocab]) => buildExampleIndex(records, vocab))
    .catch((error) => { index = null; throw error; });
  return { examples: (await index).lookup(card) };
}
