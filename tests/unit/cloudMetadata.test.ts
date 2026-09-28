import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCloudMetadataPatch,
  resolveGuestFolderMigration,
} from '../../src/utils/cloudMetadata';

const LOCAL = {
  activeBookId: 2,
  selectedLessonParts: { '2:1': [1], '3:1': [2] },
  sessionProgressIndex: { shared_deck_2_1: 4 },
};

test('a card-delta pull with no cloud metadata leaves local state untouched', () => {
  const patch = resolveCloudMetadataPatch({}, LOCAL, { isAccountSwitch: false });

  assert.deepEqual(patch, {});
});

test('present cloud metadata patches local state on a normal pull', () => {
  const patch = resolveCloudMetadataPatch(
    {
      favorites: ['a'],
      activeBookId: 3,
      characterPreference: 'simplified',
      activeTab: 'library',
      selectedBooks: [3],
    },
    LOCAL,
    { isAccountSwitch: false },
  );

  assert.deepEqual(patch, {
    favorites: ['a'],
    activeBookId: 3,
    characterPreference: 'simplified',
    activeTab: 'library',
    selectedBooks: [3],
  });
});

test('legacy flat lesson list converts to the active book parts map', () => {
  const patch = resolveCloudMetadataPatch(
    { selectedLessons: [2, 5] },
    LOCAL,
    { isAccountSwitch: false },
  );

  assert.deepEqual(patch.selectedLessonParts, {
    '3:1': [2],
    '2:2': [1],
    '2:5': [1],
  });
});

test('session index merge keeps cloud values only when strictly ahead', () => {
  const patch = resolveCloudMetadataPatch(
    { sessionProgressIndex: { shared_deck_2_1: 4, shared_deck_2_2: 9, new_key: 3 } },
    LOCAL,
    { isAccountSwitch: false },
  );

  // Keys absent locally stay cleared: an explicit local clear must not be
  // resurrected by the cloud copy.
  assert.deepEqual(patch.sessionProgressIndex, {
    shared_deck_2_1: 4,
  });
});

test('account switch resets missing fields to fresh-account defaults', () => {
  const patch = resolveCloudMetadataPatch({}, LOCAL, { isAccountSwitch: true });

  assert.deepEqual(patch, {
    favorites: [],
    activeBookId: 1,
    characterPreference: 'traditional',
    activeTab: 'path',
    selectedLessonParts: { '2:1': [1], '3:1': [2] },
    selectedBooks: [],
    sessionProgressIndex: {},
  });
});

test('account switch replaces the session index instead of merging', () => {
  const patch = resolveCloudMetadataPatch(
    { sessionProgressIndex: { shared_deck_2_1: 1 } },
    LOCAL,
    { isAccountSwitch: true },
  );

  assert.deepEqual(patch.sessionProgressIndex, { shared_deck_2_1: 1 });
});

test('guest folders migrate only on a first account switch', () => {
  const guestFolders = [{ id: 'f1' }, { id: 'f2' }];

  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [],
      tombstones: ['f2'],
    }),
    [{ id: 'f1' }],
  );

  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: false,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [],
      tombstones: [],
    }),
    [],
  );
  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: 'other-user',
      serverFolders: [],
      tombstones: [],
    }),
    [],
  );
  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [{ id: 'server' }],
      tombstones: [],
    }),
    [],
  );
});
