import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { usernameBase } from '../../src/features/social/socialText';
import { USERNAME_CHANGE_DAYS, USERNAME_SEARCH_LIMIT, usernameFormatOk } from '../../shared/username';

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

test('the app and the database agree on the @username rules', () => {
  const sql = readFileSync('supabase/migrations/20261121130000_usernames.sql', 'utf8');
  assert.ok(sql.includes(`interval '${USERNAME_CHANGE_DAYS} days'`), 'same weekly limit');
  assert.ok(sql.includes(`limit ${USERNAME_SEARCH_LIMIT};`), 'same search limit');
  assert.ok(sql.includes("'^[a-z0-9_.]{3,20}$'") && sql.includes("'(^\\.|\\.$|\\.\\.)'"), 'same format');
  for (const ok of ['kai.lin', 'ana_01', 'abc']) assert.ok(usernameFormatOk(ok), ok);
  for (const bad of ['ab', '.kai', 'kai.', 'k..i', 'Kai', 'kai-lin', 'a'.repeat(21)]) assert.ok(!usernameFormatOk(bad), bad);
});
