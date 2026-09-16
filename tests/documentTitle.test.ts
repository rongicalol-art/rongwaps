import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAME, documentTitleFor } from '../src/utils/documentTitle';

test('document title composes view name with the app name', () => {
  assert.equal(documentTitleFor('Books'), 'Books · RongWaps');
});

test('document title trims the view label', () => {
  assert.equal(documentTitleFor('  Library  '), 'Library · RongWaps');
});

test('document title falls back to the app name for a missing view', () => {
  for (const empty of [null, undefined, '', '   ']) {
    assert.equal(documentTitleFor(empty), APP_NAME);
  }
});

test('document title keeps view names that contain the separator intact', () => {
  assert.equal(
    documentTitleFor('對話一 · Dialogue 1'),
    '對話一 · Dialogue 1 · RongWaps',
  );
});
