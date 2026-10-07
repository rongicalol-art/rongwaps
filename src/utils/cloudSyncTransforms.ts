/**
 * Pure transformations and payload builders for cloud synchronization.
 *
 * Keeps wire shape, delta computation, and snapshot formatting pure and
 * free of React dependencies or store subscriptions.
 */

import type { SRSData } from './srsEngine';
import { isSameSrsData } from './srsRowMapping';
import { getSelectedLessonIds } from './lessonPartSelection';
import type { AppStoreData } from '../store/useAppStore';
import type { LessonPartSelectionMap } from '../types/models';

export interface CloudSaveSnapshot {
  userId: string;
  store: AppStoreData;
  deltaSrsData: Record<string, SRSData>;
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

/**
 * The synced preferences stored in `user_profiles.settings`. A type alias
 * (not an interface) so it is assignable to the jsonb column type.
 *
 * Device-local UI state (active tab, per-deck resume points) is deliberately
 * not synced: it changed on every tap/swipe, forcing a settings write per
 * session step. Old rows may still carry those keys; they are ignored on read.
 */
export type CloudMetadataPayload = {
  favorites: string[];
  activeBookId: number;
  characterPreference: 'traditional' | 'simplified';
  selectedLessons: number[];
  selectedBooks: number[];
};

const METADATA_KEYS = [
  'favorites',
  'activeBookId',
  'characterPreference',
  'selectedLessons',
  'selectedBooks',
] as const satisfies readonly (keyof CloudMetadataPayload)[];

export function buildMetadataPayload(store: {
  favorites: string[];
  activeBookId: number;
  characterPreference: 'traditional' | 'simplified';
  selectedLessonParts: LessonPartSelectionMap;
  selectedBooks: number[];
}): CloudMetadataPayload {
  return {
    favorites: store.favorites,
    activeBookId: store.activeBookId,
    characterPreference: store.characterPreference,
    selectedLessons: getSelectedLessonIds(store.selectedLessonParts, store.activeBookId),
    selectedBooks: store.selectedBooks,
  };
}

/** JSON with object keys sorted, so jsonb key order never reads as a change. */
function stableJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, nested: unknown) => {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return nested;
    return Object.fromEntries(
      Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  });
}

/**
 * True when the payload differs from the last settings known to be on the
 * server (the pulled or last-saved object). Null means nothing is known yet.
 */
export function hasMetadataChanged(
  synced: Record<string, unknown> | null,
  payload: CloudMetadataPayload,
): boolean {
  if (!synced) return true;
  return METADATA_KEYS.some((key) => stableJson(synced[key]) !== stableJson(payload[key]));
}

export const AUTO_SAVE_TRIGGER_SLICES = [
  'activeBookId',
  'characterPreference',
  'favorites',
  'learnedCards',
  'selectedBooks',
  'selectedLessonParts',
  'srsData',
] as const satisfies readonly (keyof AppStoreData)[];
