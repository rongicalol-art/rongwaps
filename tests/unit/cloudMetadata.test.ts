import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCloudMetadataPatch,
  resolveGuestFolderMigration,
} from '../../src/utils/sync/cloudMetadata';

const LOCAL = {
  activeBookId: 2,
  selectedLessonParts: { '2:1': [1], '3:1': [2] },
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
      selectedBooks: [3],
    },
    LOCAL,
    { isAccountSwitch: false },
  );

  assert.deepEqual(patch, {
    favorites: ['a'],
    activeBookId: 3,
    characterPreference: 'simplified',
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

test('device-local keys left in old profile rows are ignored', () => {
  const patch = resolveCloudMetadataPatch(
    { activeTab: 'library', sessionProgressIndex: { shared_deck_2_1: 9 } },
    LOCAL,
    { isAccountSwitch: false },
  );

  assert.deepEqual(patch, {});
});

test('account switch resets missing fields to fresh-account defaults', () => {
  const patch = resolveCloudMetadataPatch({}, LOCAL, { isAccountSwitch: true });

  assert.deepEqual(patch, {
    favorites: [],
    activeBookId: 1,
    characterPreference: 'traditional',
    selectedLessonParts: { '2:1': [1], '3:1': [2] },
    selectedBooks: [],
  });
});

test('guest folders migrate only on a first account switch', () => {
  const guestFolders = [{ id: 'f1' }, { id: 'f2' }];

  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [],
    }),
    guestFolders,
  );

  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: false,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [],
    }),
    [],
  );
  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: 'other-user',
      serverFolders: [],
    }),
    [],
  );
  assert.deepEqual(
    resolveGuestFolderMigration({
      isAccountSwitch: true,
      prePullFolders: guestFolders,
      prePullFolderOwner: null,
      serverFolders: [{ id: 'server' }],
    }),
    [],
  );
});
