import type { Flashcard } from '../data/flashcards';
import { fetchVocabulary, prepareVocabulary } from './vocabularyService';
import { getCourseVocabLookupMap } from './courseVocabLookup';
import { fetchAllVocabularyPacks } from './contentPacks';
import { getDictionaryEntriesBatch } from './dictionaryService';
import { buildReviewSession } from '../utils/srs/reviewSession';
import type { SRSData } from '../utils/srs/srsEngine';
import type { LessonPartSelectionMap } from '../types/models';
import {
  mapStarredEntriesToFlashcards,
  filterCurriculumCards,
  deriveLocalDueCardIds,
} from '../utils/vocabulary/activityDataDerivations';

export async function loadReviewDeck(
  srsData: Record<string, SRSData>,
  pinnedIds: string[] | null,
): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> {
  const resolveByIds = async (ids: string[]): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> => {
    const idSet = new Set(ids);
    const packedRows = await fetchAllVocabularyPacks();
    return {
      cards: packedRows ? prepareVocabulary(packedRows.filter((row) => idSet.has(String(row.id)))) : [],
      // Exclusion pruning needs the full catalog, even when today's review is small.
      knownIds: packedRows ? new Set(packedRows.map((row) => String(row.id))) : null,
    };
  };

  if (pinnedIds) {
    return resolveByIds(pinnedIds);
  }

  // Local SRS state is the freshest view: it includes reviews not yet saved,
  // and incremental pulls already merge other devices' reviews.
  const localDueIds = deriveLocalDueCardIds(srsData);
  const pool = await resolveByIds(localDueIds);
  return { cards: buildReviewSession(pool.cards, srsData), knownIds: pool.knownIds };
}

export async function fetchStarredDeckData(
  favorites: string[],
): Promise<{ cards: Flashcard[]; knownIds: Set<string> }> {
  if (favorites.length === 0) {
    return { cards: [], knownIds: new Set() };
  }
  const [batchResults, vocabMap] = await Promise.all([
    getDictionaryEntriesBatch(favorites),
    getCourseVocabLookupMap().catch(() => new Map<string, Flashcard>()),
  ]);
  return mapStarredEntriesToFlashcards(favorites, batchResults, vocabMap);
}

export async function fetchCurriculumDeckData(
  activeBookId: number,
  selectedLessons: number[],
  selectedLessonParts: LessonPartSelectionMap,
): Promise<{ cards: Flashcard[]; knownIds: Set<string> }> {
  const data = await fetchVocabulary(activeBookId);
  return filterCurriculumCards(data, selectedLessons, selectedLessonParts);
}
