import type { Flashcard } from '../../../data/flashcards';
import { fetchCourseExampleRecords, fetchMemoryHooksMap, resolveMnemonicFromMap } from '../../../services/contentPacks';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { getIdPosition } from '../../../utils/lesson/curriculumPosition';
import { normalizeMnemonic, wordMnemonicKey } from '../../character-memory-hooks';
import { buildExampleIndex, type ExampleIndex } from './exampleIndex';
import type { FlashcardExtras } from '../../../utils/vocabulary/flashcardExtrasPack';

let index: Promise<ExampleIndex> | null = null;
/** Exact legacy lookup for edited course cards or a missing generated pack. */
export async function lookupLiveFlashcardExtras(card: Flashcard): Promise<FlashcardExtras> {
  const hooks = fetchMemoryHooksMap();
  if (getIdPosition(card.id)) {
    index ??= Promise.all([fetchCourseExampleRecords(), fetchVocabulary()])
      .then(([records, vocab]) => buildExampleIndex(records, vocab))
      .catch((error) => { index = null; throw error; });
  }
  const [map, examples] = await Promise.all([hooks, getIdPosition(card.id) ? index!.then((i) => i.lookup(card)) : []]);
  const raw = map ? resolveMnemonicFromMap(map, wordMnemonicKey(card.front)) : null;
  return { examples, wordHook: raw ? normalizeMnemonic(raw) : null };
}
