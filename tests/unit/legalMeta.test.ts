import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLegalDate, isLegalUpdateCurrent } from '../../src/screens/legal/legalMeta';

test('legal update notice shows until 30 days after the Taiwan effective date', () => {
  const effective = Date.parse('2026-11-01T00:00:00+08:00');
  const day = 24 * 60 * 60 * 1000;
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective - 7 * day), true);
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective + 29 * day), true);
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective + 30 * day), false);
});

test('legal dates format as the written calendar day', () => {
  assert.equal(formatLegalDate('2026-10-23'), 'October 23, 2026');
});
