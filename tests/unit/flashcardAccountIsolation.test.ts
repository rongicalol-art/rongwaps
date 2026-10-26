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
  const imported: unknown[] = [];
  const filters: unknown[][] = [];
  const queue = (list: typeof reads) => {
    const pending = deferred();
    list.push(pending);
    return pending.promise;
  };
  supabase.from = (() => {
    let write = false;
    const query = {
      select: () => write ? { single: () => queue(writes), then: (resolve: (reply: Reply) => unknown) => queue(writes).then(resolve) } : query,
      eq: (...filter: unknown[]) => { filters.push(filter); return query; },
      order: () => query,
      range: () => queue(reads),
      insert: () => queue(writes),
      upsert: (folders: unknown) => { imported.push(folders); return queue(writes); },
      update: () => query,
      delete: () => query,
      match: () => { write = true; return query; },
      in: () => { write = true; return query; },
    };
    return query;
  }) as unknown as typeof originalFrom;
  t.mock.method(debugLogger, 'error', () => {});
  t.mock.method(debugLogger, 'warn', () => {});
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

    await t.test('shared cards retain their creator and pulls paginate past the API row limit', async () => {
      const off = subscribe('A');
      const page = Array.from({ length: 1000 }, (_, index) => ({ ...rows('B')[0], id: `other-creator-${index}` }));
      reads.shift()!.resolve({ data: page, error: null });
      await flush();
      reads.shift()!.resolve({ data: rows('A'), error: null });
      await flush();
      assert.equal(flashcardService.getCachedFlashcards('A')?.length, 1001);
      assert.equal(flashcardService.getCachedFlashcards('A')?.[0].userId, 'B');
      off();
    });

    await t.test('folder pulls filter rows, merge only that folder and deduplicate overlapping requests', async () => {
      const off = subscribe('A');
      await completeRead('A');
      const first = flashcardService.refetchFolderFlashcards('A', 'throttle-fixture');
      const duplicate = flashcardService.refetchFolderFlashcards('A', 'throttle-fixture');
      await flush();
      assert.equal(reads.length, 1);
      assert.deepEqual(filters.pop(), ['folder_id', 'throttle-fixture']);
      reads.shift()!.resolve({ data: [{ ...rows('B')[0], id: 'shared', folder_id: 'throttle-fixture' }], error: null });
      await Promise.all([first, duplicate]);
      assert.deepEqual(flashcardService.getCachedFlashcards('A')?.map((item) => item.id), ['shared-fixture-id', 'shared']);
      await flashcardService.refetchFolderFlashcards('A', 'throttle-fixture');
      assert.equal(reads.length, 0);
      // Losing access removes cached folder rows without dropping private cards.
      const removed = flashcardService.refetchFolderFlashcards('A', 'throttle-fixture', true);
      await flush();
      reads.shift()!.resolve({ data: [], error: null });
      await removed;
      assert.deepEqual(flashcardService.getCachedFlashcards('A')?.map((item) => item.id), ['shared-fixture-id']);
      off();
    });

    await t.test('failed folder pulls retry immediately and throttles clear on logout', async () => {
      const off = subscribe('A');
      await completeRead('A');
      const failed = flashcardService.refetchFolderFlashcards('A', 'fixture-folder');
      await flush();
      reads.shift()!.resolve({ data: null, error: new Error('offline') });
      await failed;
      const retry = flashcardService.refetchFolderFlashcards('A', 'fixture-folder');
      await flush();
      assert.equal(reads.length, 1);
      await completeRead('A');
      await retry;
      off();
      const offAgain = subscribe('A');
      await completeRead('A');
      const afterLogout = flashcardService.refetchFolderFlashcards('A', 'fixture-folder');
      await flush();
      assert.equal(reads.length, 1);
      await completeRead('A');
      await afterLogout;
      offAgain();
    });

    await t.test('same-account subscribers share the initial full pull', async () => {
      const offOne = subscribe('A');
      const offTwo = subscribe('A');
      assert.equal(reads.length, 1);
      await completeRead('A');
      offOne(); offTwo();
    });

    await t.test('guest import never upserts a member folder or a different owner’s folder', async () => {
      const folder = { id: 'guest-folder', name: 'Guest', color: 'blue' };
      const upload = flashcardService.importFolders('A', [folder,
        { ...folder, id: 'member-folder', role: 'editor', ownerId: 'B' },
        { ...folder, id: 'viewer-folder', role: 'viewer', ownerId: 'B' },
        { ...folder, id: 'other-owner', ownerId: 'B' },
      ]);
      assert.deepEqual(imported.pop(), [{ id: 'guest-folder', user_id: 'A', name: 'Guest', color: 'blue' }]);
      writes.shift()!.resolve({ data: null, error: null });
      await upload;
      await flashcardService.importFolders('A', [{ ...folder, role: 'editor' }]);
      assert.equal(writes.length, 0);
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

    await t.test('permission-denied edits restore server truth instead of keeping optimistic text', async () => {
      const off = subscribe('A');
      await completeRead('A');
      const denied = assert.rejects(flashcardService.updateFlashcard('A', card('A').id, { translation: 'denied' }), /no rows/);
      assert.equal(flashcardService.getCachedFlashcards('A')?.[0].translation, 'denied');
      writes.shift()!.resolve({ data: null, error: new Error('no rows') });
      await flush();
      await completeRead('A');
      await denied;
      assert.equal(flashcardService.getCachedFlashcards('A')?.[0].translation, 'A');
      off();
    });

    await t.test('stale mutation callers cannot change B optimistically or refetch A into B', async () => {
      const off = subscribe('B');
      await completeRead('B');
      const original = flashcardService.getCachedFlashcards('B');
      await assert.rejects(flashcardService.updateFlashcard('A', card('A').id, { translation: 'wrong owner' }), /account changed/);
      await assert.rejects(flashcardService.deleteFlashcard('A', card('A').id), /account changed/);
      assert.equal(writes.length, 0, 'stale edit/delete never reach the new account');
      const operations = [
        () => flashcardService.createFlashcard(card('A')),
        () => flashcardService.moveFlashcards('A', [card('A').id], 'wrong folder'),
        () => flashcardService.deleteFolder('A', 'fixture-folder'),
      ];
      for (const operation of operations) {
        const failure = assert.rejects(operation(), /fixture failure/);
        assert.deepEqual(flashcardService.getCachedFlashcards('B'), original);
        await flush();
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
