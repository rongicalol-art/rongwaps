import type { Flashcard } from '../data/flashcards';
import { fetchVocabulary, prepareVocabulary } from './vocabularyService';
import { getCourseVocabLookupMap } from './courseVocabLookup';
import { fetchAllVocabularyPacks } from './contentPacks';
import { getDictionaryEntriesBatch } from './dictionaryService';
import { useAppStore } from '../store/useAppStore';
import { flashcardService } from './flashcardService';
import { createDailyReviewPlan, reviewDay } from '../utils/srs/reviewSession';
import type { SRSData } from '../utils/srs/srsEngine';
import type { LessonPartSelectionMap } from '../types/models';
import {
  mapStarredEntriesToFlashcards,
  mapCustomCardsToFlashcards,
  filterCurriculumCards,
  deriveLocalDueCardIds,
} from '../utils/vocabulary/activityDataDerivations';

export async function loadReviewDeck(
  srsData: Record<string, SRSData>,
  pinnedIds: string[] | null,
): Promise<{ cards: Flashcard[]; knownIds: Set<string> | null }> {
  const store = useAppStore.getState();
  const activePinned = pinnedIds?.length ? pinnedIds : null;
  let existingPlan = store.dailyReviewPlan?.day === reviewDay() && (store.dailyReviewPlan.cardIds.length || store.dailyReviewPlan.completed) ? store.dailyReviewPlan : null;
  const existingIds = existingPlan?.cardIds;
  if (activePinned && existingIds && (activePinned.length !== existingIds.length || activePinned.some((id, index) => id !== existingIds[index]))) existingPlan = null;
  const ids = existingPlan?.completed ? [] : activePinned ?? existingPlan?.cardIds ?? deriveLocalDueCardIds(srsData);
  const idSet = new Set(ids);
  const courseRows = await fetchAllVocabularyPacks();
  const course = courseRows ? prepareVocabulary(courseRows.filter(row => idSet.has(String(row.id)))) : [];
  const savedIds = ids.filter(id => id.startsWith('star-')).map(id => id.slice(5));
  const customIds = ids.filter(id => id.startsWith('custom-')).map(id => id.slice(7));
  const vocabMap = savedIds.length || customIds.length ? await getCourseVocabLookupMap() : new Map<string, Flashcard>();
  const saved = savedIds.length ? mapStarredEntriesToFlashcards(savedIds, await getDictionaryEntriesBatch(savedIds), vocabMap).cards : [];
  const customRows = customIds.length && store.currentUser
    ? await flashcardService.getReviewCards(store.currentUser.id, customIds)
    : store.localFlashcards.filter(card => customIds.includes(card.id));
  const custom = customRows.flatMap(card => mapCustomCardsToFlashcards([card], vocabMap, card.folderId || 'custom').cards);
  const pool = [...course, ...saved, ...custom];
  if ((useAppStore.getState().currentUser?.id ?? null) !== (store.currentUser?.id ?? null)) return { cards: [], knownIds: null };
  let plan = existingPlan ?? createDailyReviewPlan(pool, srsData, store.reviewEvents, null);
  // Removed or inaccessible cards must not create a phantom empty session.
  const resolved = new Set(pool.map(card => card.id));
  plan = { ...plan, cardIds: plan.cardIds.filter(id => resolved.has(id)) };
  if (plan.cardIds.length === 0 && Object.keys(plan.answers).length > 0) plan.completed = true;
  useAppStore.getState().setDailyReviewPlan(plan);
  const order = new Map(plan.cardIds.map((id, index) => [id, index]));
  return {
    cards: plan.completed ? [] : pool.filter(card => order.has(card.id)).sort((a,b) => order.get(a.id)! - order.get(b.id)!),
    knownIds: courseRows ? new Set([...courseRows.map(row => String(row.id)), ...saved.map(c => c.id), ...custom.map(c => c.id)]) : null,
  };
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
