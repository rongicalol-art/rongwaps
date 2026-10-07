import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readBoolean,
  readJSON,
  readString,
  remove,
  writeBoolean,
  writeJSON,
  writeString,
} from '../../src/utils/browser/localStorage';

// Mock in-memory storage for node environment
const store = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

test('localStorage util: read and write strings safely', () => {
  (globalThis as unknown as { window?: { localStorage?: Storage } }).window = {
    localStorage: mockStorage,
  };

  store.clear();
  assert.equal(readString('test-key', 'default-val'), 'default-val');

  writeString('test-key', 'saved-val');
  assert.equal(readString('test-key'), 'saved-val');

  remove('test-key');
  assert.equal(readString('test-key', 'default-val'), 'default-val');
});

test('localStorage util: read and write booleans correctly', () => {
  store.clear();
  assert.equal(readBoolean('bool-key', true), true);
  assert.equal(readBoolean('bool-key', false), false);

  writeBoolean('bool-key', true);
  assert.equal(readBoolean('bool-key', false), true);

  writeBoolean('bool-key', false);
  assert.equal(readBoolean('bool-key', true), false);
});

test('localStorage util: read and write JSON objects and fallbacks', () => {
  store.clear();
  const fallback = { a: 1, b: 'two' };
  assert.deepEqual(readJSON('json-key', fallback), fallback);

  const payload = { a: 42, b: 'hello', list: [1, 2, 3] };
  writeJSON('json-key', payload);
  assert.deepEqual(readJSON('json-key', fallback), payload);

  // Corrupted JSON returns fallback
  store.set('json-key', '{ invalid-json');
  assert.deepEqual(readJSON('json-key', fallback), fallback);
});

test('localStorage util: tolerates missing window or throwing storage', () => {
  // Simulate throwing storage (e.g. private mode)
  (globalThis as unknown as { window?: { localStorage?: Storage } }).window = {
    localStorage: {
      ...mockStorage,
      getItem: () => { throw new Error('SecurityError: Storage is blocked'); },
      setItem: () => { throw new Error('SecurityError: Storage is blocked'); },
    },
  };

  assert.equal(readString('any', 'safe'), 'safe');
  assert.doesNotThrow(() => writeString('any', 'value'));
  assert.doesNotThrow(() => writeJSON('any', { val: 1 }));
  assert.deepEqual(readJSON('any', { safe: true }), { safe: true });
});
