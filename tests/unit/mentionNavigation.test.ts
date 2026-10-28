import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import type { MentionNotice } from '../../shared/lobby';

const notice = (id: number, channel: number): MentionNotice => ({ key: `l:${id}`, channel, read: false, message: { id, l: channel, u: 'friend', n: 'Friend', c: 'jade', t: '@Me hello', ts: Date.now() + id } });

test('inbox replay preserves live notices and opening another lesson leaves study presence alone', async () => {
  let state: Record<string, unknown> = { socialMentions: [], socialMuted: false, socialPanel: null, socialMe: 'me', socialViewingLesson: 101, socialUnread: false, race: null };
  const sent: unknown[] = [];
  state.setSocial = (patch: object) => { state = { ...state, ...patch }; };
  state.showFeedbackToast = () => {};
  Object.assign(globalThis, { __mentionTest: { store: { getState: () => state }, sent }, document: { visibilityState: 'visible' } });
  const bundle = await build({ entryPoints: ['src/features/social/lobbyController.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'social-fixture', setup(plugin) {
      plugin.onResolve({ filter: /services\/socialService|store\/useAppStore/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.includes('useAppStore') ? 'export const useAppStore=globalThis.__mentionTest.store;' : 'export const connectLobby=(_identity,handlers)=>{globalThis.__mentionTest.open=handlers.onOpen;return {send:message=>{globalThis.__mentionTest.sent.push(message);return true},close:()=>{}}};' }));
    } }],
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/features/social/lobbyController');
  api.setLobbyTransport({ send: message => { sent.push(message); return true; }, close: () => {} });
  api.deliver({ t: 'mention', v: notice(2, 102) });
  api.deliver({ t: 'mentions', v: [notice(1, 101)] });
  assert.deepEqual((state.socialMentions as MentionNotice[]).map(item => item.key), ['l:2', 'l:1']);
  api.openMention(notice(2, 102));
  assert.equal(state.socialViewingLesson, 101);
  assert.deepEqual(state.socialPanel, { kind: 'people', tab: 'chat', chatScope: 'lesson', chatLesson: 102 });
  assert.equal((state.socialMentions as MentionNotice[])[0].read, true);
  assert.equal((state.socialMentionTarget as MentionNotice).message.id, 2);
  api.lobby.subscribe(false, 102);
  api.deliver({ t: 'mention', v: notice(3, 102) });
  assert.equal(state.socialMentionToast, null, 'the open channel does not show a popup');
  assert.equal((state.socialMentions as MentionNotice[])[0].read, true);
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.ok(sent.some(frame => (frame as { t: string }).t === 'mention-read'));
  api.deliver({ t: 'mention-read', key: 'l:2' });
  api.stopLobby();
  api.setLobbyTransport(null);
  state.currentUser = { id: 'first' };
  api.startLobby({ name: 'First', color: 'jade' });
  api.lobby.readMention('old-account');
  api.stopLobby();
  state.currentUser = { id: 'second' };
  api.startLobby({ name: 'Second', color: 'jade' });
  (globalThis as unknown as { __mentionTest: { open: () => void } }).__mentionTest.open();
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.ok(!sent.some(frame => (frame as { key?: string }).key === 'old-account'), 'pending reads cannot cross accounts');
  api.stopLobby();
});
