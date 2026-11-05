import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLegalDate, isLegalUpdateCurrent, isSignupOpen, legalEffectivePhrase } from '../../src/screens/legal/legalMeta';
import { showsGooglePhoto } from '../../src/store/slices/profileSlice';
import { studyTogetherOpenToAll } from '../../shared/publicLaunch';

const day = 24 * 60 * 60 * 1000;

test('legal update notice shows until 30 days after the Taiwan effective date', () => {
  const effective = Date.parse('2026-11-01T00:00:00+08:00');
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective - 7 * day), true);
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective + 29 * day), true);
  assert.equal(isLegalUpdateCurrent('2026-11-01', effective + 30 * day), false);
});

test('legal update notice skips accounts that accepted the new text at sign-up', () => {
  const effective = Date.parse('2026-11-14T00:00:00+08:00');
  assert.equal(isLegalUpdateCurrent('2026-11-14', effective + day, '2026-11-01T03:00:00Z'), true);
  assert.equal(isLegalUpdateCurrent('2026-11-14', effective + day, '2026-11-13T16:00:00Z'), false);
  assert.equal(isLegalUpdateCurrent('2026-11-14', effective - day, '2026-11-05T15:59:59Z', '2026-11-06'), true, 'made before sign-up opened');
  assert.equal(isLegalUpdateCurrent('2026-11-14', effective - day, '2026-11-05T16:00:00Z', '2026-11-06'), false, 'made after: accepted at sign-up');
});

test('legal notice says "takes" before the date and "took" from it', () => {
  const effective = Date.parse('2026-11-14T00:00:00+08:00');
  assert.equal(legalEffectivePhrase('2026-11-14', effective - 1), 'Takes effect November 14, 2026.');
  assert.equal(legalEffectivePhrase('2026-11-14', effective), 'Took effect November 14, 2026.');
});

test('legal dates format as the written calendar day', () => {
  assert.equal(formatLegalDate('2026-10-23'), 'October 23, 2026');
});

test('sign-up wording switches at midnight Taiwan on 6 November; Study together mixes on 14 November', () => {
  const open = Date.parse('2026-11-06T00:00:00+08:00');
  assert.equal(isSignupOpen(open - 1), false);
  assert.equal(isSignupOpen(open), true);
  const mixed = Date.parse('2026-11-14T00:00:00+08:00');
  assert.equal(studyTogetherOpenToAll(mixed - 1), false);
  assert.equal(studyTogetherOpenToAll(mixed), true);
});

test('Google photo: older accounts keep it, newer ones start with initials, a choice wins', () => {
  assert.equal(showsGooglePhoto(null, '2026-10-01T00:00:00Z'), true);
  assert.equal(showsGooglePhoto(null, '2026-11-05T15:59:59Z'), true);
  assert.equal(showsGooglePhoto(null, '2026-11-05T16:00:00Z'), false);
  assert.equal(showsGooglePhoto(null, undefined), false);
  assert.equal(showsGooglePhoto(true, '2026-12-01T00:00:00Z'), true);
  assert.equal(showsGooglePhoto(false, '2026-10-01T00:00:00Z'), false);
});
