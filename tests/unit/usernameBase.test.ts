import assert from 'node:assert/strict';
import test from 'node:test';
import { usernameBase } from '../../src/features/social/socialText';

test('an automatic @username starts from the display name', () => {
  assert.equal(usernameBase('Kai Lin'), 'kai.lin');
  assert.equal(usernameBase('José Núñez-Pérez'), 'jose.nunez.perez');
  assert.equal(usernameBase('  Mei  '), 'mei');
  assert.equal(usernameBase('A very long name indeed'), 'a.very.long.name', 'at most 16, never ending in a dot');
});

test('names it cannot use start from "learner"', () => {
  assert.equal(usernameBase('陳小明'), 'learner', 'no Latin letters');
  assert.equal(usernameBase('Al'), 'learner', 'too short');
  assert.equal(usernameBase('Admin'), 'learner', 'reserved');
});
