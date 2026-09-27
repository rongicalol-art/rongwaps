import type { Flashcard } from '../data/flashcards';
import { fetchVocabulary, fetchVocabularyByIds, prepareVocabulary, getCourseVocabLookupMap } from './vocabularyService';
import { fetchAllVocabularyPacks } from './contentPacks';
import { userService } from './userService';
import { getDictionaryEntriesBatch } from './dictionaryService';
import { buildReviewSession } from '../utils/reviewSession';
import type { SRSData } from '../utils/srsEngine';
import type { LessonPartSelectionMap } from '../types/models';
import {
  mapStarredEntriesToFlashcards,
  filterCurriculumCards,
  deriveLocalDueCardIds,
} from '../utils/activityDataDerivations';

export async function loadReviewDeck(
  srsData: Record<string, SRSData>,
  pinnedIds: string[] | null,
): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> {
  const resolveByIds = async (ids: string[]): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> => {
    const idSet = new Set(ids);
    const packedRows = await fetchAllVocabularyPacks();
    if (packedRows) {
      const allCards = prepareVocabulary(packedRows);
      return {
        cards: allCards.filter((card) => idSet.has(card.id)),
        knownIds: new Set(packedRows.map((row) => String(row.id))),
      };
    }
    const rowsById = await fetchVocabularyByIds(ids);
    if (rowsById) {
      return { cards: rowsById, knownIds: null };
    }
    const data = await fetchVocabulary();
    return {
      cards: data.filter((card) => idSet.has(card.id)),
      knownIds: new Set(data.map((card) => card.id)),
    };
  };

  if (pinnedIds) {
    return resolveByIds(pinnedIds);
  }

  const dueIds = await userService.getDueCardIds();
  if (dueIds) {
    const pool = await resolveByIds(dueIds);
    return { cards: buildReviewSession(pool.cards, srsData), knownIds: pool.knownIds };
  }

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
