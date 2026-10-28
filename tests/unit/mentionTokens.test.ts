import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { updateMentionTokens } from '../../src/features/social/mentionTokens';

test('mentions survive surrounding edits but lose identity when edited', () => {
  const token = { id: 'account', start: 3, end: 7, text: '@Ron' };
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hey @Ron!', [token]), [{ ...token, start: 4, end: 8 }]);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi @Ron!!', [token]), [token]);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi @Roni!', [token]), []);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi @Roń!', [token]), []);
  const repeated = [{ id: 'first', start: 0, end: 2, text: '@A' }, { id: 'second', start: 3, end: 5, text: '@A' }];
  assert.deepEqual(updateMentionTokens('@A @A', '@A', repeated, { start: 0, end: 3, inputType: 'deleteContentBackward' }), [{ ...repeated[1], start: 0, end: 2 }]);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi @Ron!!', [token]), [token]);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi @Rob!', [token]), []);
  assert.deepEqual(updateMentionTokens('Hi @Ron!', 'Hi !', [token]), []);
});
