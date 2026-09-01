import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FOLDER_COLOR_PALETTE,
  CUSTOM_FOLDER_OPTIONS,
  STARRED_FOLDER_COLOR,
  CUSTOM_CARDS_FOLDER_COLOR,
  getFolderColorOption,
  resolveFolderColor,
} from '../src/screens/library/utils/folderColors';

test('palette has 8 distinct vibrant colors with front and back shades', () => {
  assert.equal(FOLDER_COLOR_PALETTE.length, 8);
  assert.equal(CUSTOM_FOLDER_OPTIONS.length, 8);
  const ids = new Set(FOLDER_COLOR_PALETTE.map((c) => c.id));
  assert.equal(ids.size, 8);

  for (const color of FOLDER_COLOR_PALETTE) {
    assert.ok(color.front.startsWith('#'));
    assert.ok(color.back.startsWith('#'));
    assert.ok(color.accent.length > 0);
    assert.ok(color.accentBg.length > 0);
    assert.ok(color.accentBorder.length > 0);
  }
});

test('starred and custom cards canonical folder colors are defined', () => {
  assert.equal(STARRED_FOLDER_COLOR.id, 'yellow');
  assert.equal(STARRED_FOLDER_COLOR.front, '#FFC800');
  assert.equal(STARRED_FOLDER_COLOR.back, '#E0A900');

  assert.equal(CUSTOM_CARDS_FOLDER_COLOR.id, 'blue');
  assert.equal(CUSTOM_CARDS_FOLDER_COLOR.front, '#1CB0F6');
  assert.equal(CUSTOM_CARDS_FOLDER_COLOR.back, '#1899D6');
});

test('getFolderColorOption finds color by id or hex case-insensitively', () => {
  const purple = getFolderColorOption('purple');
  assert.equal(purple?.id, 'purple');

  const greenByHex = getFolderColorOption('#58CC02');
  assert.equal(greenByHex?.id, 'green');

  assert.equal(getFolderColorOption('nonexistent'), undefined);
  assert.equal(getFolderColorOption(undefined), undefined);
});

test('resolveFolderColor resolves direct palette ids', () => {
  const coral = resolveFolderColor('coral');
  assert.equal(coral.id, 'coral');
  assert.equal(coral.front, '#FF4B4B');
});

test('resolveFolderColor resolves JSON color objects with colorId', () => {
  const jsonColor = JSON.stringify({
    colorId: 'teal',
    front: '#00CD9C',
    back: '#00A880',
  });
  const resolved = resolveFolderColor(jsonColor);
  assert.equal(resolved.id, 'teal');
  assert.equal(resolved.front, '#00CD9C');
});

test('resolveFolderColor resolves JSON with front and back hexes', () => {
  const customJson = JSON.stringify({
    front: '#FF64B4',
    back: '#E04090',
  });
  const resolved = resolveFolderColor(customJson);
  assert.equal(resolved.id, 'pink');
});

test('resolveFolderColor handles legacy hardcoded bg-brand-primary by cycling', () => {
  const legacyJson = JSON.stringify({
    accentBg: 'bg-brand-primary',
    accentBorder: 'border-brand-primary-edge',
  });
  // Folder index 0 should get Purple (index 0 + 1 = index 1 in palette, which is Purple)
  const folder0 = resolveFolderColor(legacyJson, 0);
  assert.equal(folder0.id, 'purple');

  // Folder index 1 should get Green
  const folder1 = resolveFolderColor(legacyJson, 1);
  assert.equal(folder1.id, 'green');

  // They must be different colors
  assert.notEqual(folder0.id, folder1.id);
});

test('resolveFolderColor gives different fallback colors to different folder indexes when empty', () => {
  const color0 = resolveFolderColor(undefined, 0);
  const color1 = resolveFolderColor(undefined, 1);
  const color2 = resolveFolderColor(undefined, 2);

  assert.notEqual(color0.id, color1.id);
  assert.notEqual(color1.id, color2.id);
});
