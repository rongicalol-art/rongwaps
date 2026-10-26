import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FolderShareDrawer } from '../../src/screens/library/components/FolderShareDrawer';
import { LibraryCardGrid } from '../../src/screens/library/components/LibraryCardGrid';
import type { UserFolder } from '../../src/types/models';
import { canEditFolder } from '../../src/utils/vocabulary/folderCollaboration';

const noop = () => {};
const members = [
  { user_id: 'owner', role: 'owner' as const, display_name: 'Ron', avatar_color: 'jade' },
  { user_id: 'viewer', role: 'viewer' as const, display_name: 'Mei', avatar_color: null },
  { user_id: 'editor', role: 'editor' as const, display_name: 'Lin', avatar_color: 'plum' },
];

function shareMarkup(role: UserFolder['role']) {
  return renderToStaticMarkup(createElement(FolderShareDrawer, {
    folder: { id: 'fixture', name: 'Study', color: 'blue', role }, currentUserId: role,
    members, error: null, busy: false, onClose: noop, onRetry: noop, onRemove: noop,
    onSetRole: noop, onCopyLink: async () => true, onLeave: noop,
  }));
}

test('share owner can change View/Edit and remove members; their own row stays Owner', () => {
  const html = shareMarkup('owner');
  assert.match(html, /Ron \(you\)/);
  assert.match(html, /Owner/);
  assert.match(html, /Access for Mei/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Remove Mei/);
  assert.doesNotMatch(html, /Remove Ron/);
  assert.doesNotMatch(html, /Stop sharing|Leave folder/);
  assert.match(html, /Copy link/);
});

test('viewers and editors see plain roles, may copy the link, and may leave', () => {
  for (const role of ['viewer', 'editor'] as const) {
    const html = shareMarkup(role);
    assert.match(html, /Can view/);
    assert.match(html, /Can edit/);
    assert.match(html, /Copy link/);
    assert.match(html, /Leave folder/);
    assert.doesNotMatch(html, /Access for|Remove Mei|Stop sharing/);
  }
});

test('a viewer can open cards while add, edit/delete menu and bulk selection are absent', () => {
  for (const role of ['viewer', 'editor', 'owner', undefined] as const) {
    const editable = canEditFolder({ id: 'fixture', name: 'Study', color: 'blue', role });
    const html = renderToStaticMarkup(createElement(LibraryCardGrid, {
      items: [{ id: 'card', folderId: 'fixture', simplified: '字', translation: 'character', userId: 'owner', createdAt: 0 }],
      isStarred: false, libraryActiveFolder: 'fixture', onOpenCard: noop, onRemoveCard: noop,
      onAddCard: editable ? noop : undefined, onCardMenu: editable ? noop : undefined,
    }));
    assert.match(html, /Open 字/);
    assert.equal(html.includes('Options for 字'), editable);
    assert.equal(html.includes('New card'), editable);
    assert.doesNotMatch(html, /Select 字/);
  }
});
