import assert from 'node:assert/strict';
import test from 'node:test';
import { isFolderOwner, canEditFolder, memberAvatarColor } from '../../src/utils/vocabulary/folderCollaboration';
import { parseFolderLinkPath } from '../../src/utils/browser/folderLinkPath';
import { isSameFolderList } from '../../src/utils/sync/cloudSyncQueue';
import type { UserFolder } from '../../src/types/models';
import { createLibrarySlice } from '../../src/store/slices/librarySlice';

const folder: UserFolder = { id: 'fixture', name: 'Study', color: 'blue' };

test('only owners and guest/legacy folders expose owner actions', () => {
  assert.equal(isFolderOwner(folder), true);
  assert.equal(isFolderOwner({ ...folder, role: 'owner' }), true);
  assert.equal(isFolderOwner({ ...folder, role: 'editor' }), false);
  assert.equal(isFolderOwner({ ...folder, role: 'viewer' }), false);
  assert.equal(isFolderOwner(undefined), false);
});

test('folder return paths accept only valid local join codes', () => {
  for (const path of ['/join/1234567890ab', '/join/a_-1234567890']) assert.equal(parseFolderLinkPath(path), path);
  for (const path of [null, '', '/s/12345678', '/join/short', '/join/12345678901234567', '/join/1234567890?next=evil', '//evil/join/1234567890', 'https://evil.test/join/1234567890', '/join/../library']) assert.equal(parseFolderLinkPath(path), null);
});

test('sync identity includes membership, count, owner, and rotated invite', () => {
  for (const patch of [{ role: 'editor' as const }, { role: 'viewer' as const }, { memberCount: 2 }, { ownerId: 'owner' }, { inviteCode: '1234567890ab' }]) {
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

test('owners, editors and legacy folders can edit; viewers cannot', () => {
  for (const role of [undefined, 'owner', 'editor'] as const) assert.equal(canEditFolder({ ...folder, role }), true);
  assert.equal(canEditFolder(undefined), true);
  assert.equal(canEditFolder({ ...folder, role: 'viewer' }), false);
});
