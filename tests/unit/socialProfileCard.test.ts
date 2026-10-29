import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

/** Builds profileCard.ts against a synthetic store and vocabulary (no network, no real progress). */
async function load(state: Record<string, unknown>, rows: unknown[] | null = [{ id: 'B1L1-1', traditional: '你好', simplified: '你好' }]) {
  Object.assign(globalThis, { __cardTest: { store: { getState: () => state }, rows } });
  const result = await build({ entryPoints: ['src/features/social/profileCard.ts'], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'synthetic-card', setup(plugin) {
      plugin.onResolve({ filter: /store\/useAppStore|services\/contentPacks|services\/profileMedia/ }, args => ({ path: args.path, namespace: 'synthetic' }));
      plugin.onLoad({ filter: /.*/, namespace: 'synthetic' }, args => ({ contents: args.path.includes('useAppStore')
        ? 'export const useAppStore=globalThis.__cardTest.store;'
        : args.path.includes('contentPacks') ? 'export const fetchAllVocabularyPacks=async()=>globalThis.__cardTest.rows;'
          : 'export const getProfileMediaUrl=async(user,path)=>`https://p.test/storage/v1/object/sign/profile-media/${path}?token=t`;' }));
    } }],
  });
  return await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text + `\n// ${Math.random()}`).toString('base64')}`) as typeof import('../../src/features/social/profileCard');
}

const day = 86_400_000;
const learner = (patch: Record<string, unknown> = {}) => ({
  currentUser: { id: 'u1' }, showProfile: true, coverPreset: 'jade', coverPath: null, activeBookId: 1, characterPreference: 'traditional',
  srsData: {}, learnedCards: ['B1L1-1'], reviewEvents: [{ reviewedAt: Date.now() - 40 * day }, { reviewedAt: Date.now() }], ...patch,
});

test('a visit card carries cover, book, start, characters and streak', async () => {
  const { buildProfileCard } = await load(learner({ coverPath: 'u1/cover.webp' }));
  const card = await buildProfileCard();
  assert.ok(card);
  assert.equal(card.cv, 'jade');
  assert.equal(card.b, 1);
  assert.equal(card.k, 2);
  assert.equal(card.st, 1);
  assert.ok(card.s && card.s < Date.now() - 39 * day);
  assert.match(card.ci ?? '', /profile-media\/u1\/cover\.webp/);
});

test('no card when the learner hides their profile or is signed out', async () => {
  assert.equal(await (await load(learner({ showProfile: false }))).buildProfileCard(), null);
  assert.equal(await (await load(learner({ currentUser: null }))).buildProfileCard(), null);
});

test('a card still answers when vocabulary cannot load, without a character count', async () => {
  const card = await (await load(learner(), null)).buildProfileCard();
  assert.ok(card);
  assert.equal('k' in card, false);
});
