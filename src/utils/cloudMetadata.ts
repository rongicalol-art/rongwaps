import type { LessonPartSelectionMap } from '../types/models';
import { lessonsToPartSelection } from './lessonPartSelection';

/**
 * Owner of the "apply pulled cloud metadata to local state" rules.
 *
 * Metadata (favorites, selection, session resume points) is only overwritten
 * from the cloud when the cloud is at least as new as local state, or on an
 * account switch — a plain card-delta pull must not clobber local changes
 * that are still inside the debounced save window. Account switches are
 * authoritative: missing cloud fields fall back to fresh-account defaults
 * instead of leaking the previous user's local values.
 */

export type CharacterPreference = 'traditional' | 'simplified';
export type ActiveTab = 'path' | 'search' | 'library' | 'profile';

export interface CloudMetadataLocalState {
  activeBookId: number;
  selectedLessonParts: LessonPartSelectionMap;
  sessionProgressIndex: Record<string, number>;
}

export interface CloudMetadataPatch {
  favorites?: string[];
  activeBookId?: number;
  characterPreference?: CharacterPreference;
  activeTab?: ActiveTab;
  selectedLessonParts?: LessonPartSelectionMap;
  selectedBooks?: number[];
  sessionProgressIndex?: Record<string, number>;
}

export function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : null;
}

export function numberArray(value: unknown): number[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? value
    : null;
}

export function numberRecord(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  return entries.every(([, item]) => typeof item === 'number')
    ? Object.fromEntries(entries) as Record<string, number>
    : null;
}

function isCharacterPreference(value: unknown): value is CharacterPreference {
  return value === 'traditional' || value === 'simplified';
}

function isActiveTab(value: unknown): value is ActiveTab {
  return value === 'path' || value === 'search' || value === 'library' || value === 'profile';
}

/**
 * The next book id: cloud wins when present, account switches reset to book
 * 1, otherwise local state stands.
 */
function nextActiveBookId(
  metadata: Record<string, unknown>,
  local: CloudMetadataLocalState,
  isAccountSwitch: boolean,
): number {
  if (typeof metadata.activeBookId === 'number') return metadata.activeBookId;
  return isAccountSwitch ? 1 : local.activeBookId;
}

/**
 * Merge cloud session resume points into the local map. Cloud wins only when
 * it is strictly ahead: an explicit local clear (key absent locally but
 * present in cloud) keeps the local view — the next save removes it
 * server-side too.
 */
function mergedSessionProgressIndex(
  localIndex: Record<string, number>,
  cloudIndex: Record<string, number>,
): Record<string, number> {
  const merged = { ...localIndex };
  for (const [key, cloudValue] of Object.entries(cloudIndex)) {
    const localValue = localIndex[key];
    if (localValue !== undefined && cloudValue > localValue) {
      merged[key] = cloudValue;
    }
  }
  return merged;
}

export function resolveCloudMetadataPatch(
  metadata: Record<string, unknown>,
  local: CloudMetadataLocalState,
  options: { isAccountSwitch: boolean },
): CloudMetadataPatch {
  const { isAccountSwitch } = options;
  const patch: CloudMetadataPatch = {};

  const favorites = stringArray(metadata.favorites);
  if (favorites || isAccountSwitch) {
    patch.favorites = favorites ?? [];
  }

  const activeBookId = nextActiveBookId(metadata, local, isAccountSwitch);
  if (activeBookId !== local.activeBookId) {
    patch.activeBookId = activeBookId;
  }

  if (isCharacterPreference(metadata.characterPreference)) {
    patch.characterPreference = metadata.characterPreference;
  } else if (isAccountSwitch) {
    patch.characterPreference = 'traditional';
  }

  if (isActiveTab(metadata.activeTab)) {
    patch.activeTab = metadata.activeTab;
  } else if (isAccountSwitch) {
    patch.activeTab = 'path';
  }

  const lessons = numberArray(metadata.selectedLessons);
  if (lessons || isAccountSwitch) {
    // Cloud lesson selections arrive as the legacy flat list; they convert
    // into the canonical per-book parts map for the active book (the only
    // book the derived lesson list ever applies to). Replacing this book's
    // entries matches the previous wholesale replace of the flat array.
    const otherBooks = Object.fromEntries(
      Object.entries(local.selectedLessonParts)
        .filter(([key]) => !key.startsWith(`${activeBookId}:`)),
    );
    patch.selectedLessonParts = {
      ...otherBooks,
      ...lessonsToPartSelection(activeBookId, lessons ?? []),
    };
  }

  const selectedBooks = numberArray(metadata.selectedBooks);
  if (selectedBooks || isAccountSwitch) {
    patch.selectedBooks = selectedBooks ?? [];
  }

  const sessionProgressIndex = numberRecord(metadata.sessionProgressIndex);
  if (sessionProgressIndex) {
    patch.sessionProgressIndex = isAccountSwitch
      ? sessionProgressIndex
      : mergedSessionProgressIndex(local.sessionProgressIndex, sessionProgressIndex);
  } else if (isAccountSwitch) {
    patch.sessionProgressIndex = {};
  }

  return patch;
}

/**
 * Guest -> account migration: an account that has never stored folders
 * server-side adopts the pre-login local list — but only when that list was
 * never synced to any account on this device, so a stale server-derived list
 * can never be uploaded as if it were guest data. Tombstoned (deleted) guest
 * folders are not migrated.
 */
export function resolveGuestFolderMigration<T extends { id: string }>(input: {
  isAccountSwitch: boolean;
  prePullFolders: T[];
  prePullFolderOwner: string | null;
  serverFolders: T[];
  tombstones: readonly string[];
}): T[] {
  const { isAccountSwitch, prePullFolders, prePullFolderOwner, serverFolders, tombstones } = input;
  if (
    !isAccountSwitch
    || serverFolders.length > 0
    || prePullFolders.length === 0
    || prePullFolderOwner !== null
  ) {
    return [];
  }

  const tombstoneSet = new Set(tombstones);
  return prePullFolders.filter((folder) => !tombstoneSet.has(folder.id));
}
