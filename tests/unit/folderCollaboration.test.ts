import assert from 'node:assert/strict';
import test from 'node:test';
import { ownsFolder, memberAvatarColor } from '../../src/utils/vocabulary/folderCollaboration';
import { parseFolderLinkPath } from '../../src/utils/browser/folderLinkPath';
import { isSameFolderList } from '../../src/utils/sync/cloudSyncQueue';
import type { UserFolder } from '../../src/types/models';
import { createLibrarySlice } from '../../src/store/slices/librarySlice';

const folder: UserFolder = { id: 'fixture', name: 'Study', color: 'blue' };

test('only owners and guest/legacy folders expose owner actions', () => {
  assert.equal(ownsFolder(folder), true);
  assert.equal(ownsFolder({ ...folder, role: 'owner' }), true);
  assert.equal(ownsFolder({ ...folder, role: 'editor' }), false);
  assert.equal(ownsFolder(undefined), false);
});

test('folder return paths accept only valid local share and join codes', () => {
  for (const path of ['/join/1234567890ab', '/join/a_-1234567890', '/s/12345678']) assert.equal(parseFolderLinkPath(path), path);
  for (const path of [null, '', '/join/short', '/join/12345678901234567', '/join/1234567890?next=evil', '//evil/join/1234567890', 'https://evil.test/join/1234567890', '/join/../library']) assert.equal(parseFolderLinkPath(path), null);
});

test('sync identity includes membership, count, owner, and rotated invite', () => {
  for (const patch of [{ role: 'editor' as const }, { memberCount: 2 }, { ownerId: 'owner' }, { inviteCode: '1234567890ab' }]) {
    assert.equal(isSameFolderList([folder], [{ ...folder, ...patch }]), false);
  }
  assert.equal(isSameFolderList([folder], [{ ...folder }]), true);
});

test('folder store preserves collaboration fields from the sync row', () => {
  let folders: UserFolder[] = [];
  const slice = createLibrarySlice((patch) => { if (typeof patch !== 'function' && patch.customFolders) folders = patch.customFolders; });
  const row: UserFolder = { ...folder, role: 'editor', memberCount: 3, ownerId: 'owner', inviteCode: '1234567890ab' };
  slice.setCustomFolders([row]);
  assert.deepEqual(folders, [row]);
});

test('member avatar colors fall back safely to an existing palette token', () => {
  assert.equal(memberAvatarColor('jade'), 'jade');
  assert.equal(memberAvatarColor(null), 'blue');
  assert.equal(memberAvatarColor('unknown'), 'blue');
});
