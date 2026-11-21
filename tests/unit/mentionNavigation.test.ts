import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import type { ChatMessage, MentionNotice } from '../../shared/lobby';

// One fixed clock: `Date.now()` per call can tick between notices and flip their order.
const NOW = Date.now();
const line = (id: number, u: string, t = 'hi'): ChatMessage => ({ id, l: 0, u, n: u, c: 'jade', t, ts: NOW + id });
const notice = (id: number, channel: number): MentionNotice => ({ key: `l:${id}`, channel, read: false, message: { ...line(id, 'friend', '@Me hello'), l: channel } });

let state: Record<string, unknown> = {};
const sent: unknown[] = [];
let loads = 0;

/** The real lobby controller, bundled against a plain object store and a fake socket. */
async function loadController(initial: Record<string, unknown>) {
  state = { ...initial };
  sent.length = 0;
  state.setSocial = (patch: object) => { state = { ...state, ...patch }; };
  state.showFeedbackToast = () => {};
  Object.assign(globalThis, { __mentionTest: { store: { getState: () => state }, sent }, document: { visibilityState: 'visible' } });
  // A unique banner gives every test its own module instance (the controller keeps module-level state).
  const bundle = await build({ entryPoints: ['src/features/social/lobbyController.ts'], bundle: true, platform: 'node', format: 'esm', write: false, banner: { js: `// ${++loads}` },
    plugins: [{ name: 'social-fixture', setup(plugin) {
      plugin.onResolve({ filter: /services\/socialService|store\/useAppStore/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.includes('useAppStore') ? 'export const useAppStore=globalThis.__mentionTest.store;' : 'export const connectLobby=(_identity,handlers)=>{globalThis.__mentionTest.open=handlers.onOpen;return {send:message=>{globalThis.__mentionTest.sent.push(message);return true},close:()=>{}}};' }));
    } }],
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/features/social/lobbyController');
  api.setLobbyTransport({ send: message => { sent.push(message); return true; }, close: () => {} });
  return api;
}

test('inbox replay preserves live notices and opening one leaves study presence alone', async () => {
  const api = await loadController({ socialMentions: [], socialMuted: false, socialPanel: null, socialMe: 'me', socialViewingLesson: 101, socialChatRead: 0, socialChatUnread: 0, race: null });
  api.deliver({ t: 'mention', v: notice(2, 0) });
  api.deliver({ t: 'mentions', v: [notice(1, 0)] });
  assert.deepEqual((state.socialMentions as MentionNotice[]).map(item => item.key), ['l:2', 'l:1']);
  api.openMention(notice(2, 0));
  assert.equal(state.socialViewingLesson, 101);
  assert.deepEqual(state.socialPanel, { kind: 'people', tab: 'chat' });
  assert.equal((state.socialMentions as MentionNotice[])[0].read, true);
  assert.equal((state.socialMentionTarget as MentionNotice).message.id, 2);
  api.lobby.subscribe(false, 0);
  api.deliver({ t: 'mention', v: notice(3, 0) });
  assert.equal(state.socialMentionToast, null, 'the open chat does not show a popup');
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

test('class chat: history brings the count, new lines add to it, seeing them clears it and tells the Lobby once', async () => {
  const api = await loadController({ socialMentions: [notice(4, 0)], socialMuted: false, socialPanel: null, socialMe: 'me', socialChatRead: 0, socialChatUnread: 0, socialMentionToast: notice(4, 0), race: null });
  api.lobby.subscribe(false, 0);
  api.deliver({ t: 'history', l: 0, v: [line(4, 'friend', '@Me hello'), line(5, 'friend'), line(6, 'me'), line(7, 'friend')], r: 3, n: 3 });
  assert.equal(state.socialChatRead, 3);
  assert.equal(state.socialChatUnread, 3);
  api.deliver({ t: 'msg', m: line(8, 'friend') });
  api.deliver({ t: 'msg', m: line(9, 'me') });
  api.deliver({ t: 'msg', m: line(10, 'friend', '') });
  assert.equal(state.socialChatUnread, 4, 'own lines and room cards do not count');

  state.socialPanel = { kind: 'people', tab: 'chat' };
  api.lobby.markChatRead(10);
  assert.equal(state.socialChatUnread, 0);
  assert.equal(state.socialChatRead, 10);
  assert.equal((state.socialMentions as MentionNotice[])[0].read, true, 'an @mention in the seen lines is read');
  assert.equal(state.socialMentionToast, null, 'its waiting card is dropped');
  api.deliver({ t: 'msg', m: line(11, 'friend') });
  assert.equal(state.socialChatUnread, 0, 'lines arriving while the chat is open are seen');
  assert.equal(state.socialChatRead, 11);
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.deepEqual(sent.filter(frame => (frame as { t: string }).t === 'read'), [{ t: 'read', id: 11 }], 'one read frame for a burst');

  // A reconnect whose history predates that read does not bring the count back.
  state.socialPanel = null;
  api.deliver({ t: 'history', l: 0, v: [line(5, 'friend'), line(11, 'friend'), line(12, 'friend')], r: 5, n: 3 });
  assert.equal(state.socialChatUnread, 1);
  api.stopLobby();
});

test('@everyone lines become one card from the chat itself, never a mention-read for the Lobby', async () => {
  const api = await loadController({ socialMentions: [], socialMuted: false, socialPanel: null, socialMe: 'me', socialChatRead: 0, socialChatUnread: 0, socialMentionToast: null, race: null });
  api.lobby.subscribe(false, 0);
  api.deliver({ t: 'history', l: 0, v: [{ ...line(2, 'friend', '@everyone old'), a: 1 }, line(3, 'friend'), { ...line(4, 'friend', '@everyone quiz tomorrow'), a: 1 }], r: 2, n: 2 });
  assert.equal((state.socialMentionToast as MentionNotice).message.id, 4, 'the newest unread @everyone gets the card');
  assert.deepEqual((state.socialMentions as MentionNotice[]).map(item => item.key), ['a:4'], 'lines already read are left out');
  api.deliver({ t: 'msg', m: { ...line(5, 'friend', '@everyone room open'), a: 1 } });
  assert.equal((state.socialMentionToast as MentionNotice).message.id, 5);
  api.deliver({ t: 'history', l: 0, v: [{ ...line(4, 'friend', '@everyone quiz tomorrow'), a: 1 }], r: 2, n: 1 });
  assert.equal((state.socialMentions as MentionNotice[]).length, 2, 'a repeated history adds no duplicate');
  state.socialPanel = { kind: 'people', tab: 'chat' };
  api.lobby.markChatRead(5);
  assert.ok((state.socialMentions as MentionNotice[]).every(item => item.read));
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.ok(!sent.some(frame => (frame as { t: string }).t === 'mention-read'), 'the Lobby has no copy to mark');
  api.stopLobby();
});
