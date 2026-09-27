/**
 * Pure transformations and payload builders for cloud synchronization.
 *
 * Keeps wire shape, delta computation, and snapshot formatting pure and
 * free of React dependencies or store subscriptions.
 */

import type { SRSData } from './srsEngine';
import { isSameSrsData } from './srsRowMapping';
import { getSelectedLessonIds } from './lessonPartSelection';
import type { SyncProgressCounters } from './cloudSyncQueue';
import type { AppStoreData } from '../store/useAppStore';

export interface CloudSaveSnapshot {
  userId: string;
  userMetadata: Record<string, unknown>;
  store: AppStoreData;
  deltaSrsData: Record<string, SRSData>;
}

export function getProgressCounters(store: {
  sessionProgress: { cardsReviewed: number; cardsLearned: number };
}): SyncProgressCounters {
  return {
    cardsReviewed: store.sessionProgress.cardsReviewed,
    cardsLearned: store.sessionProgress.cardsLearned,
  };
}

export function getDailyActivity(
  activity: string | null | undefined,
): 'flashcards' | 'quiz' | 'listening' | 'writing' | undefined {
  if (activity === 'flashcards' || activity === 'flashcards-review') return 'flashcards';
  if (activity === 'quiz' || activity === 'listening' || activity === 'writing') return activity;
  return undefined;
}

export function computeSrsDelta(
  previous: Record<string, SRSData> | null,
  current: Record<string, SRSData>,
): Record<string, SRSData> {
  // First sync for this user (never pulled/saved): send everything.
  if (!previous) return current;

  const delta: Record<string, SRSData> = {};
  for (const [key, value] of Object.entries(current)) {
    const prev = previous[key];
    if (!prev || !isSameSrsData(prev, value)) {
      delta[key] = value;
    }
  }
  return delta;
}

export interface CloudMetadataPayload {
  favorites: string[];
  activeBookId: number;
  characterPreference: 'traditional' | 'simplified';
  sessionProgressIndex: number;
  activeTab: string;
  activeActivity: string | null;
  selectedLessons: number[];
  selectedBooks: number[];
}

import type { LessonPartSelectionMap } from '../types/models';

export function buildMetadataPayload(store: {
  favorites: string[];
  activeBookId: number;
  characterPreference: 'traditional' | 'simplified';
  sessionProgressIndex: number;
  activeTab: string;
  activeActivity: string | null;
  selectedLessonParts: LessonPartSelectionMap;
  selectedBooks: number[];
}): CloudMetadataPayload {
  return {
    favorites: store.favorites,
    activeBookId: store.activeBookId,
    characterPreference: store.characterPreference,
    sessionProgressIndex: store.sessionProgressIndex,
    activeTab: store.activeTab,
    activeActivity: store.activeActivity,
    selectedLessons: getSelectedLessonIds(store.selectedLessonParts, store.activeBookId),
    selectedBooks: store.selectedBooks,
  };
}

export function hasMetadataChanged(
  userMetadata: Record<string, unknown>,
  payload: CloudMetadataPayload,
): boolean {
  return (
    JSON.stringify(userMetadata.favorites) !== JSON.stringify(payload.favorites) ||
    userMetadata.activeBookId !== payload.activeBookId ||
    userMetadata.characterPreference !== payload.characterPreference ||
    JSON.stringify(userMetadata.sessionProgressIndex) !== JSON.stringify(payload.sessionProgressIndex) ||
    userMetadata.activeTab !== payload.activeTab ||
    userMetadata.activeActivity !== payload.activeActivity ||
    JSON.stringify(userMetadata.selectedLessons) !== JSON.stringify(payload.selectedLessons) ||
    JSON.stringify(userMetadata.selectedBooks) !== JSON.stringify(payload.selectedBooks)
  );
}

export const AUTO_SAVE_TRIGGER_SLICES = [
  'activeActivity',
  'activeBookId',
  'activeTab',
  'characterPreference',
  'customFolders',
  'favorites',
  'lastActivity',
  'learnedCards',
  'selectedBooks',
  'selectedLessonParts',
  'sessionProgress',
  'sessionProgressIndex',
  'srsData',
] as const satisfies readonly (keyof AppStoreData)[];
