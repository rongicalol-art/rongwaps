import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { ROSTER_GAP_MS } from '../../shared/lobby';

test('Online snapshot requests inside the Lobby gap wait and collapse into one', async (t) => {
  let state: Record<string, unknown> = { socialOnline: [], race: null, socialMuted: false };
  const sent: Array<{ t: string }> = [];
  state.setSocial = (patch: object) => { state = { ...state, ...patch }; };
  state.showFeedbackToast = () => {};
  Object.assign(globalThis, { __rosterTest: { store: { getState: () => state } } });
  const bundle = await build({ entryPoints: ['src/features/social/lobbyController.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'roster-fixture', setup(plugin) {
      plugin.onResolve({ filter: /services\/socialService|store\/useAppStore/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.includes('useAppStore') ? 'export const useAppStore=globalThis.__rosterTest.store;' : 'export const connectLobby=()=>({send:()=>true,close:()=>{}});' }));
    } }],
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/features/social/lobbyController');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  api.setLobbyTransport({ send: message => { sent.push(message as { t: string }); return true; }, close: () => {} });
  const rosters = () => sent.filter(frame => frame.t === 'roster').length;

  // The panel just opened: its snapshot arrived, so a newcomer's request waits out the gap instead of being dropped.
  api.deliver({ t: 'online', v: [] });
  api.lobby.roster();
  api.lobby.roster();
  assert.equal(rosters(), 0);
  t.mock.timers.tick(ROSTER_GAP_MS + 300);
  assert.equal(rosters(), 1, 'two arrivals inside the gap make one request');

  // Long after the last snapshot, a request goes out at once.
  t.mock.timers.tick(ROSTER_GAP_MS * 2);
  api.lobby.roster();
  assert.equal(rosters(), 2);

  // Closing Study together cancels a waiting request.
  api.lobby.roster();
  api.stopLobby();
  t.mock.timers.tick(ROSTER_GAP_MS * 2);
  assert.equal(rosters(), 2);
});
