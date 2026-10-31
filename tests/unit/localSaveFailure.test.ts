import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { useAppStore } from '../../src/store/useAppStore';

/**
 * A failed IndexedDB write (private mode, quota, eviction) must not pass silently:
 * the store raises localSaveFailed, and the next write that lands clears it.
 */
test('a failed device write raises localSaveFailed and the next successful write clears it', async () => {
  const savedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  let failWrites = true;
  const later = (run: () => void) => { void nextTurn().then(run); };
  const database = {
    transaction: () => {
      const transaction = {
        error: null as unknown,
        oncomplete: undefined as (() => void) | undefined,
        onerror: undefined as (() => void) | undefined,
        objectStore: () => ({
          transaction,
          put: () => later(() => {
            if (!failWrites) return transaction.oncomplete?.();
            transaction.error = new DOMException('Storage is full', 'QuotaExceededError');
            transaction.onerror?.();
          }),
        }),
      };
      return transaction;
    },
  };
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: {
      open: () => {
        const request = { result: database, onsuccess: undefined as (() => void) | undefined };
        later(() => request.onsuccess?.());
        return request;
      },
    },
  });
  mock.timers.enable({ apis: ['setTimeout'] });
  const settle = async () => { for (let i = 0; i < 10; i++) await nextTurn(); };
  const persistChange = async (activeTab: 'library' | 'profile') => {
    useAppStore.setState({ activeTab });
    mock.timers.tick(1_000);
    await settle();
  };

  try {
    await settle();
    assert.equal(useAppStore.getState().localSaveFailed, false);

    await persistChange('library');
    assert.equal(useAppStore.getState().localSaveFailed, true);

    failWrites = false;
    await persistChange('profile');
    assert.equal(useAppStore.getState().localSaveFailed, false);
  } finally {
    mock.timers.reset();
    if (savedDb) Object.defineProperty(globalThis, 'indexedDB', savedDb);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
  }
});
