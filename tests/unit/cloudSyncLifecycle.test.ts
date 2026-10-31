import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { build } from 'esbuild';
import { createStore } from 'zustand/vanilla';
import { createClient, type User } from '@supabase/supabase-js';
import type { AppState } from '../../src/store/useAppStore';
import { createAuthSlice } from '../../src/store/slices/authSlice';
import { createLearningSlice, LEARNING_ACCOUNT_SWITCH_DEFAULTS } from '../../src/store/slices/learningSlice';
import { createGrammarProgressSlice } from '../../src/store/slices/grammarProgressSlice';
import { createSyncSlice, SYNC_ACCOUNT_SWITCH_DEFAULTS } from '../../src/store/slices/syncSlice';
import type { userService, UserSyncState } from '../../src/services/userService';
import { buildMetadataPayload } from '../../src/utils/sync/cloudSyncTransforms';

const user = (id: string) => ({ id }) as User;
const cloud = (id = 'cloud-card'): UserSyncState => ({
  srsData: { [id]: { cardId: id, interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: 1, lastReviewedAt: 1 } },
  learnedCards: [id], reviewEvents: [], settings: {}, folders: [], hasDelta: true,
  cursor: '2026-10-23T00:00:00Z',
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(t: TestContext) {
  const store = createStore<AppState>((set) => ({
    ...createAuthSlice(set), ...createLearningSlice(set), ...createGrammarProgressSlice(set), ...createSyncSlice(set),
    activeBookId: 1, characterPreference: 'traditional', favorites: [], selectedBooks: [], selectedLessonParts: {},
    customFolders: [], foldersSyncedUserId: null, isReviewMode: false, activeReviewSessionCards: null, swipeFeedback: null,
    resetAccountScopedState: () => set({ ...LEARNING_ACCOUNT_SWITCH_DEFAULTS, ...SYNC_ACCOUNT_SWITCH_DEFAULTS, syncStatus: 'idle' }),
    setCustomFolders: (customFolders: { id: string; name: string; color: string }[]) => set({ customFolders }),
    setFoldersSyncedUserId: (foldersSyncedUserId: string | null) => set({ foldersSyncedUserId }),
  // Only the production domains exercised by these hooks are mounted.
  }) as unknown as AppState);
  store.getState().setCurrentUser({ id: 'A' });
  const service: Pick<typeof userService, 'getSyncAuthorization' | 'getSyncState' | 'syncReviewEvents' | 'syncCardProgress' | 'syncSettings' | 'resetLearningProgress'> = {
    getSyncAuthorization: async (id) => `Bearer ${id}`,
    getSyncState: async () => cloud(), syncReviewEvents: async () => {}, syncCardProgress: async () => {},
    syncSettings: async () => null, resetLearningProgress: async () => null,
  };
  const f = { store, service, user: user('A'), effects: [] as Array<() => void | (() => void)>, cleanups: [] as Array<() => void> };
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  Object.assign(globalThis, { __syncFixture: f, window: new EventTarget(), document: Object.assign(new EventTarget(), { visibilityState: 'visible' }) });
  t.after(() => { f.cleanups.forEach(stop => stop()); Object.assign(globalThis, { window: previousWindow, document: previousDocument }); });
  return f;
}
let moduleId = 0;
// Execute the production hooks with fake React effects and transport. Actual
// slice actions and sync helpers run; no browser, account or network is used.
async function loadHook<T>(name: string): Promise<T> {
  const mocks: Record<string, string> = {
    react: 'export const useCallback=f=>f; export const useRef=v=>({current:v}); export const useEffect=f=>globalThis.__syncFixture.effects.push(f);',
    '../store/useAppStore': 'export const useAppStore=globalThis.__syncFixture.store;',
    '../services/userService': 'export const userService=globalThis.__syncFixture.service;',
    './supabaseClient': 'export const supabase=globalThis.__syncFixture.supabase;',
    '../services/flashcardService': 'export const flashcardService={importFolders:async()=>{}};',
    '../utils/debug/debugLogger': 'export const debugLogger={error(){}};',
    './useAuth': 'export const useAuth=()=>({currentUser:globalThis.__syncFixture.user});',
  };
  const result = await build({
    entryPoints: [`src/hooks/${name}.ts`], bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: [{ name: 'hook-fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${moduleId++}`);
}
function effects(f: ReturnType<typeof fixture>) {
  const cleanup = f.effects.splice(0).map(run => run());
  const unmount = () => cleanup.splice(0).reverse().forEach(stop => stop?.());
  f.cleanups.push(unmount);
  return unmount;
}
function refs() {
  return { persistedOwnerRef: { current: 'A' as string | null }, lastSyncedSettingsRef: { current: null as Record<string, unknown> | null },
    hasFetchedForUserRef: { current: 'A' as string | null }, activeUserIdRef: { current: null as string | null } };
}

test('late pulls cannot contaminate another account, a sign-out, or a new session of the same account', async t => {
  const f = fixture(t);
  const { useCloudSyncFetch } = await loadHook<typeof import('../../src/hooks/useCloudSyncFetch')>('useCloudSyncFetch');
  for (const nextId of ['B', null, 'A']) {
    f.store.getState().setCurrentUser({ id: 'A' });
    const pending = deferred<UserSyncState>();
    f.service.getSyncState = () => pending.promise;
    const r = refs();
    const pulling = useCloudSyncFetch({ currentUser: user('A'), ...r }).fetchFromCloud();
    await setImmediate();
    f.store.getState().setCurrentUser(nextId ? { id: nextId } : null);
    f.store.setState({ srsData: {}, syncStatus: 'idle', syncCheckpoint: null });
    pending.resolve(cloud('A-private-card'));
    assert.equal(await pulling, false);
    assert.deepEqual(f.store.getState().srsData, {});
    assert.equal(f.store.getState().syncStatus, 'idle');
    assert.equal(f.store.getState().syncCheckpoint, null);
  }
});

test('a stale pull failure cannot replace the next account status', async t => {
  const f = fixture(t);
  const { useCloudSyncFetch } = await loadHook<typeof import('../../src/hooks/useCloudSyncFetch')>('useCloudSyncFetch');
  const pending = deferred<UserSyncState>();
  f.service.getSyncState = () => pending.promise;
  const pulling = useCloudSyncFetch({ currentUser: user('A'), ...refs() }).fetchFromCloud();
  await setImmediate();
  f.store.getState().setCurrentUser({ id: 'B' });
  f.store.setState({ syncStatus: 'success', syncError: null });
  pending.reject(new Error('old request failed'));
  await pulling;
  assert.equal(f.store.getState().syncStatus, 'success');
  assert.equal(f.store.getState().syncError, null);
});

test('only the newest concurrent pull can publish its checkpoint', async t => {
  const f = fixture(t);
  const { useCloudSyncFetch } = await loadHook<typeof import('../../src/hooks/useCloudSyncFetch')>('useCloudSyncFetch');
  const pending = deferred<UserSyncState>();
  let calls = 0;
  f.service.getSyncState = () => ++calls === 1 ? pending.promise : Promise.resolve(cloud('new-card'));
  const hook = useCloudSyncFetch({ currentUser: user('A'), ...refs() });
  const old = hook.fetchFromCloud();
  await setImmediate();
  assert.equal(await hook.fetchFromCloud(), true);
  pending.resolve(cloud('old-card'));
  assert.equal(await old, false);
  assert.deepEqual(Object.keys(f.store.getState().srsData), ['new-card']);
});

test('retrying the first pull after an account switch preserves new local reviews', async t => {
  const f = fixture(t);
  const { useCloudSyncFetch } = await loadHook<typeof import('../../src/hooks/useCloudSyncFetch')>('useCloudSyncFetch');
  f.store.getState().setCurrentUser({ id: 'B' });
  const r = refs();
  r.activeUserIdRef.current = 'A';
  let attempts = 0;
  f.service.getSyncState = async () => { if (++attempts === 1) throw new Error('offline'); return cloud(); };
  const hook = useCloudSyncFetch({ currentUser: user('B'), ...r });
  assert.equal(await hook.fetchFromCloud(), false);
  f.store.getState().markCardReviewed('new-local-card', 4);
  assert.equal(await hook.fetchFromCloud(), true);
  assert.ok(f.store.getState().srsData['new-local-card']);
  assert.ok(f.store.getState().srsData['cloud-card']);
  assert.equal(f.store.getState().syncCheckpoint?.srs['new-local-card'], undefined);
});

test('failed saves retry while idle and preserve the outbox until acknowledged', async t => {
  const f = fixture(t);
  const { useCloudSyncSave } = await loadHook<typeof import('../../src/hooks/useCloudSyncSave')>('useCloudSyncSave');
  f.store.getState().markCardReviewed('card', 4, { id: '00000000-0000-4000-8000-000000000001', sessionId: 'fixture', source: 'flashcards', durationMs: 100 });
  const ids = f.store.getState().pendingReviewEvents.map(e => e.id);
  let attempts = 0;
  f.service.syncReviewEvents = async events => {
    if (events.length > 0 && ++attempts === 1) throw new Error('offline');
  };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  useCloudSyncSave({ currentUser: user('A'), ...refs() });
  effects(f);
  t.mock.timers.tick(10_000);
  await setImmediate();
  assert.equal(attempts, 1);
  assert.deepEqual(f.store.getState().pendingReviewEvents.map(e => e.id), ids);
  t.mock.timers.tick(5_000);
  await setImmediate();
  assert.equal(attempts, 2);
  assert.deepEqual(f.store.getState().pendingReviewEvents, []);
  assert.equal(f.store.getState().syncStatus, 'success');
});

test('late save completions never acknowledge or update the next session', async t => {
  const f = fixture(t);
  const { useCloudSyncSave } = await loadHook<typeof import('../../src/hooks/useCloudSyncSave')>('useCloudSyncSave');
  const pending = deferred<void>();
  let cardWrites = 0;
  f.service.syncReviewEvents = () => pending.promise;
  f.service.syncCardProgress = async () => { cardWrites++; };
  const hook = useCloudSyncSave({ currentUser: user('A'), ...refs() });
  effects(f);
  const saving = hook.requestSave();
  await setImmediate();
  f.store.getState().setCurrentUser({ id: 'B' });
  f.store.setState({ syncStatus: 'idle' });
  pending.resolve();
  await saving;
  assert.equal(cardWrites, 0);
  assert.equal(f.store.getState().syncStatus, 'idle');
});

test('late card and settings saves cannot change checkpoints or metadata in a new session', async t => {
  for (const stage of ['cards', 'settings'] as const) await t.test(stage, async t => {
    const f = fixture(t);
    const { useCloudSyncSave } = await loadHook<typeof import('../../src/hooks/useCloudSyncSave')>('useCloudSyncSave');
    const pending = deferred<string | null>();
    if (stage === 'cards') f.service.syncCardProgress = async () => { await pending.promise; };
    else f.service.syncSettings = () => pending.promise;
    const r = refs();
    const hook = useCloudSyncSave({ currentUser: user('A'), ...r });
    effects(f);
    const saving = hook.requestSave();
    await setImmediate();
    f.store.getState().setCurrentUser({ id: 'A' }); // Same account, different login session.
    f.store.setState({ syncStatus: 'idle', lastCloudUpdate: null, syncCheckpoint: null });
    pending.resolve('2026-10-23T00:00:00Z');
    await saving;
    assert.equal(f.store.getState().syncStatus, 'idle');
    assert.equal(f.store.getState().lastCloudUpdate, null);
    assert.equal(f.store.getState().syncCheckpoint, null);
    assert.equal(r.lastSyncedSettingsRef.current, null);
  });
});

test('initial pulls retry without interaction and reconnect flushes pending work', async t => {
  const f = fixture(t);
  const { useCloudSync } = await loadHook<typeof import('../../src/hooks/useCloudSync')>('useCloudSync');
  let pulls = 0;
  let uploads = 0;
  f.service.getSyncState = async () => { if (++pulls === 1) throw new Error('offline'); return cloud(); };
  f.service.syncReviewEvents = async () => { uploads++; };
  t.mock.timers.enable({ apis: ['setTimeout'] });
  useCloudSync();
  const unmount = effects(f);
  await setImmediate();
  assert.equal(pulls, 1);
  assert.equal(uploads, 0);
  t.mock.timers.tick(5_000);
  await setImmediate();
  assert.equal(pulls, 2);
  assert.ok(uploads > 0);
  window.dispatchEvent(new Event('online'));
  await setImmediate();
  assert.equal(pulls, 3);
  unmount();
  const before = pulls;
  t.mock.timers.tick(60_000);
  window.dispatchEvent(new Event('online'));
  await setImmediate();
  assert.equal(pulls, before);
});

test('failed reset restores every field cleared by learning and grammar resets', async t => {
  const f = fixture(t);
  const { useResetProgress } = await loadHook<typeof import('../../src/hooks/useResetProgress')>('useResetProgress');
  f.store.getState().markCardReviewed('card', 4, { id: '00000000-0000-4000-8000-000000000001', sessionId: 'fixture', source: 'flashcards', durationMs: 100 });
  f.store.getState().setLearningBatch('lesson', ['card']);
  f.store.getState().recordConfusion('card', 'other');
  f.store.getState().markPartStarted('part');
  f.store.getState().markPageComplete('page');
  f.store.getState().markPartComplete('part');
  const before = f.store.getState();
  f.service.resetLearningProgress = async () => { throw new Error('offline'); };
  await assert.rejects(useResetProgress({ currentUser: user('A'), onActivityCleared() {}, onGrammarCleared() {} })(), /offline/);
  const restored = f.store.getState();
  for (const key of Object.keys(restored) as Array<keyof AppState>) {
    assert.deepEqual(restored[key], before[key], `reset rollback changed ${key}`);
  }
});

test('reset snapshots after waiting for sync and never restores into another account', async t => {
  const f = fixture(t);
  const { useResetProgress } = await loadHook<typeof import('../../src/hooks/useResetProgress')>('useResetProgress');
  Object.assign(window, { setTimeout, clearTimeout });
  f.store.setState({ syncStatus: 'syncing' });
  const failure = deferred<string | null>();
  f.service.resetLearningProgress = () => failure.promise;
  const resetting = useResetProgress({ currentUser: user('A'), onActivityCleared() {}, onGrammarCleared() {} })();
  f.store.getState().setLearningBatch('arrived-during-sync', ['new-card']);
  f.store.setState({ syncStatus: 'success' });
  await setImmediate();
  failure.reject(new Error('failed reset'));
  await assert.rejects(resetting, /failed reset/);
  assert.deepEqual(f.store.getState().learningBatches, { 'arrived-during-sync': ['new-card'] });
  const late = deferred<string | null>();
  f.service.resetLearningProgress = () => late.promise;
  const resettingAgain = useResetProgress({ currentUser: user('A'), onActivityCleared() {}, onGrammarCleared() {} })();
  f.store.getState().setCurrentUser({ id: 'B' });
  f.store.getState().setLearningBatch('B', ['private-card']);
  late.reject(new Error('old reset failed'));
  await assert.rejects(resettingAgain, /old reset failed/);
  assert.deepEqual(f.store.getState().learningBatches, { B: ['private-card'] });
});

test('the sync transport pins every batch and settings write to its original bearer token', async t => {
  const f = fixture(t);
  const seen: Array<{ token: string | null; batch?: number }> = [];
  const client = createClient('https://sync-fixture.supabase.co', 'fixture-key', {
    // The shared client's current account has already switched to B.
    accessToken: async () => 'B-token',
    global: { fetch: async (input, init) => {
      const body = JSON.parse(String(init?.body));
      seen.push({ token: new Headers(init?.headers).get('Authorization'), batch: (body.p_events ?? body.p_records)?.length });
      return Response.json(String(input).includes('/rpc/') ? null : { updated_at: '2026-10-23T00:00:00Z' });
    } },
  });
  Object.assign(f, { supabase: client });
  const { userService: transport } = await loadHook<typeof import('../../src/services/userService')>('../services/userService');
  f.store.getState().markCardReviewed('card', 4, { id: '00000000-0000-4000-8000-000000000001', sessionId: 'fixture', source: 'flashcards', durationMs: 100 });
  const event = f.store.getState().pendingReviewEvents[0];
  await transport.syncReviewEvents(Array.from({ length: 501 }, () => event), 'Bearer A-token');
  const cards = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`card-${i}`, cloud().srsData['cloud-card']]));
  await transport.syncCardProgress(cards, [], 'Bearer A-token');
  await transport.syncSettings('A', buildMetadataPayload(f.store.getState()), 'Bearer A-token');
  assert.deepEqual(seen.map(r => r.token), Array(5).fill('Bearer A-token'));
  assert.deepEqual(seen.slice(0, 4).map(r => r.batch), [500, 1, 500, 1]);
});

test('sync refuses to acquire credentials for a different or signed-out account', async t => {
  const f = fixture(t);
  let session: { user: { id: string }; access_token: string } | null = { user: { id: 'B' }, access_token: 'B-token' };
  Object.assign(f, { supabase: { auth: { getSession: async () => ({ data: { session }, error: null }) } } });
  const { userService: transport } = await loadHook<typeof import('../../src/services/userService')>('../services/userService');
  await assert.rejects(transport.getSyncAuthorization('A'), /Account changed/);
  session = null;
  await assert.rejects(transport.getSyncAuthorization('A'), /Account changed/);
  session = { user: { id: 'A' }, access_token: 'A-token' };
  assert.equal(await transport.getSyncAuthorization('A'), 'Bearer A-token');
});

test('grammar completion from another device merges in, and a reset elsewhere clears stale local completion', async t => {
  const f = fixture(t);
  const { useCloudSyncFetch } = await loadHook<typeof import('../../src/hooks/useCloudSyncFetch')>('useCloudSyncFetch');
  f.store.setState({ completedPageIds: ['local-page'], completedPartIds: ['local-part'], startedPartIds: [] });
  f.service.getSyncState = async () => ({
    ...cloud(), settings: { grammarProgress: { completedPageIds: ['other-device-page'], startedPartIds: ['p2'] } },
  });
  assert.equal(await useCloudSyncFetch({ currentUser: user('A'), ...refs() }).fetchFromCloud(), true);
  assert.deepEqual(f.store.getState().completedPageIds, ['local-page', 'other-device-page']);
  assert.deepEqual(f.store.getState().completedPartIds, ['local-part']);
  assert.deepEqual(f.store.getState().startedPartIds, ['p2']);

  f.store.getState().setProgressResetSeen('A', '2026-10-01T00:00:00Z');
  f.service.getSyncState = async () => ({
    ...cloud(), progressResetAt: '2026-10-30T00:00:00Z',
    settings: { grammarProgress: { completedPageIds: ['after-reset-page'] } },
  });
  assert.equal(await useCloudSyncFetch({ currentUser: user('A'), ...refs() }).fetchFromCloud(), true);
  assert.deepEqual(f.store.getState().completedPageIds, ['after-reset-page']);
  assert.deepEqual(f.store.getState().completedPartIds, []);
});
