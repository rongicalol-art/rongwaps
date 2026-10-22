import assert from 'node:assert/strict';
import test from 'node:test';
import { supabase } from '../../src/services/supabaseClient';
import { flashcardService } from '../../src/services/flashcardService';
import { debugLogger } from '../../src/utils/debug/debugLogger';
import type { UserFlashcard } from '../../src/types/models';

// Initialize only a dummy client; every database method below is mocked.
const oldUrl = process.env.VITE_SUPABASE_URL;
const oldKey = process.env.VITE_SUPABASE_ANON_KEY;
process.env.VITE_SUPABASE_URL = 'https://account-isolation.invalid';
process.env.VITE_SUPABASE_ANON_KEY = 'test-public-key';
const originalFrom = supabase.from;
if (oldUrl === undefined) delete process.env.VITE_SUPABASE_URL;
else process.env.VITE_SUPABASE_URL = oldUrl;
if (oldKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
else process.env.VITE_SUPABASE_ANON_KEY = oldKey;

const card = (userId: string): UserFlashcard => ({
  id: 'shared-fixture-id', userId, simplified: '字', translation: userId,
  folderId: 'fixture-folder', createdAt: 1,
});
const rows = (userId: string) => [{
  id: card(userId).id, user_id: userId, simplified: '字', translation: userId,
  folder_id: 'fixture-folder', created_at: 1,
}];
type Reply = { data: ReturnType<typeof rows> | null; error: Error | null };
function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((done) => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test('custom-card cache stays isolated across account changes, logout and delayed mutations', async (t) => {
  const reads: ReturnType<typeof deferred>[] = [];
  const writes: ReturnType<typeof deferred>[] = [];
  const queue = (list: typeof reads) => {
    const pending = deferred();
    list.push(pending);
    return pending.promise;
  };
  supabase.from = (() => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () => queue(reads),
      insert: () => queue(writes),
      update: () => query,
      delete: () => query,
      match: () => queue(writes),
      in: () => queue(writes),
    };
    return query;
  }) as unknown as typeof originalFrom;
  t.mock.method(debugLogger, 'error', () => {});
  const subscriptions: (() => void)[] = [];
  const subscribe = (owner: string, listener: (cards: UserFlashcard[]) => void = () => {}) => {
    const unsubscribe = flashcardService.subscribeToUserFlashcards(owner, listener);
    subscriptions.push(unsubscribe);
    return unsubscribe;
  };
  const completeRead = async (owner: string) => {
    reads.shift()!.resolve({ data: rows(owner), error: null });
    await flush();
  };

  try {
    await t.test('late A response cannot reach B or an overlapping A subscriber', async () => {
      const seenA: string[][] = [];
      const seenB: string[][] = [];
      const offA = subscribe('A', (cards) => seenA.push(cards.map((item) => item.userId)));
      const lateA = reads.shift()!;
      const offB = subscribe('B', (cards) => seenB.push(cards.map((item) => item.userId)));
      offA(); // A cleanup may run after B has subscribed.
      await completeRead('B');
      lateA.resolve({ data: rows('A'), error: null });
      await flush();
      assert.deepEqual(seenA, [[], []]);
      assert.deepEqual(seenB, [[], ['B']]);
      assert.equal(flashcardService.getCachedFlashcards('A'), null);
      assert.equal(flashcardService.getCachedFlashcards('B')?.[0].userId, 'B');
      offB();
      assert.equal(flashcardService.getCachedFlashcards('B'), null);
    });

    await t.test('logout invalidates an old request even when the same account returns', async () => {
      const off = subscribe('A');
      const beforeLogout = reads.shift()!;
      off();
      const offAgain = subscribe('A');
      await completeRead('A');
      beforeLogout.resolve({ data: [], error: null });
      await flush();
      assert.equal(flashcardService.getCachedFlashcards('A')?.length, 1);
      offAgain();
    });

    await t.test('removing one same-account subscriber keeps the other active', async () => {
      const offOne = subscribe('A');
      await completeRead('A');
      const seen: string[][] = [];
      const offTwo = subscribe('A', (cards) => seen.push(cards.map((item) => item.userId)));
      offOne();
      assert.equal(flashcardService.getCachedFlashcards('A')?.length, 1);
      assert.deepEqual(seen, [['A']]);
      offTwo();
    });

    await t.test('failed create from a previous login cannot roll back the new login cache', async () => {
      const off = subscribe('A');
      await completeRead('A');
      const failure = assert.rejects(flashcardService.createFlashcard(card('A')), /fixture failure/);
      off();
      const offAgain = subscribe('A');
      await completeRead('A');
      writes.shift()!.resolve({ data: null, error: new Error('fixture failure') });
      await failure;
      assert.equal(flashcardService.getCachedFlashcards('A')?.length, 1);
      offAgain();
    });

    await t.test('stale mutation callers cannot change B optimistically or refetch A into B', async () => {
      const off = subscribe('B');
      await completeRead('B');
      const original = flashcardService.getCachedFlashcards('B');
      const operations = [
        () => flashcardService.createFlashcard(card('A')),
        () => flashcardService.updateFlashcard('A', card('A').id, { translation: 'wrong owner' }),
        () => flashcardService.deleteFlashcard('A', card('A').id),
        () => flashcardService.moveFlashcards('A', [card('A').id], 'wrong folder'),
        () => flashcardService.deleteFolder('A', 'fixture-folder'),
      ];
      for (const operation of operations) {
        const failure = assert.rejects(operation(), /fixture failure/);
        assert.deepEqual(flashcardService.getCachedFlashcards('B'), original);
        writes.shift()!.resolve({ data: null, error: new Error('fixture failure') });
        await failure;
        assert.deepEqual(flashcardService.getCachedFlashcards('B'), original);
        assert.equal(reads.length, 0);
      }
      off();
    });
  } finally {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    supabase.from = originalFrom;
  }
});
