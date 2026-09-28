import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthRequiredError,
  logFallback,
  NetworkError,
  PackMissError,
} from '../../src/services/errors';

test('PackMissError exposes packName and formatted message', () => {
  const err = new PackMissError('readings-b1');
  assert.equal(err.name, 'PackMissError');
  assert.equal(err.packName, 'readings-b1');
  assert.equal(err.message, 'Static content pack "readings-b1" not found.');
});

test('NetworkError exposes status and message', () => {
  const err = new NetworkError('/api/tts returned 503', 503);
  assert.equal(err.name, 'NetworkError');
  assert.equal(err.status, 503);
  assert.equal(err.message, '/api/tts returned 503');
});

test('AuthRequiredError formats action or default message', () => {
  const defaultErr = new AuthRequiredError();
  assert.equal(defaultErr.name, 'AuthRequiredError');
  assert.equal(defaultErr.message, 'Authentication required.');

  const actionErr = new AuthRequiredError('save card');
  assert.equal(actionErr.message, 'Authentication required to perform: save card');
});

test('logFallback returns provided fallback and logs without throwing', () => {
  const fallback = { fallback: true };
  const result = logFallback('App', 'Simulated failure', new Error('boom'), fallback, 'warn');
  assert.deepEqual(result, fallback);

  const errorResult = logFallback('Cache', 'Simulated error', new Error('fail'), 42, 'error');
  assert.equal(errorResult, 42);
});
