import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { newRaceRoom, enterRace, type RaceSnapshot } from '../../shared/quizRace';

type Handlers = { onState: (state: RaceSnapshot, userId: string) => void; onStatus: (status: string) => void; onError: (message: string) => void };
type Handle = { code: string; send: (frame: unknown) => boolean; close: () => void };
const snapshot = (round = 1): RaceSnapshot => {
  const state = newRaceRoom('ABCDEF', { lessons: { 1: [1] }, types: [] }, true, 's', Date.now());
  enterRace(state, 'me', 'Me', 'blue', Date.now()); enterRace(state, 'friend', 'Friend', 'jade', Date.now());
  return { ...state, round, serverTime: Date.now(), connected: ['me', 'friend'] };
};

async function controller() {
  let state: Record<string, unknown> = { currentUser: { id: 'me' }, race: null, racePlaying: false, socialStatus: 'live', raceStatus: 'off', racePending: false };
  const listeners: Array<(state: Record<string, unknown>, previous: Record<string, unknown>) => void> = [];
  const calls: Array<{ handlers: Handlers; resolve: (handle: Handle) => void; reject: (error: Error) => void; signal: AbortSignal }> = [];
  const invited: unknown[] = [];
  const leaves: string[] = [];
  const errors: string[] = [];
  const update = (patch: object) => { const previous = state; state = { ...state, ...patch }; listeners.forEach(fn => fn(state, previous)); };
  state.setSocial = update; state.showFeedbackToast = (message: string) => errors.push(message);
  const store = { getState: () => state, subscribe: (fn: typeof listeners[number]) => { listeners.push(fn); } };
  const harness = { store, connect: (_identity: unknown, _target: unknown, handlers: Handlers, signal: AbortSignal) => new Promise<Handle>((resolve, reject) => { calls.push({ handlers, resolve, reject, signal }); }), leaves, invited };
  Object.assign(globalThis, { __socialTest: harness });
  const result = await build({ entryPoints: ['src/features/social/raceController.ts'], bundle: true, format: 'esm', platform: 'node', write: false,
    plugins: [{ name: 'synthetic-social', setup(plugin) {
      plugin.onResolve({ filter: /services\/socialService|store\/useAppStore|\.\/lobbyController/ }, args => ({ path: args.path, namespace: 'synthetic' }));
      plugin.onLoad({ filter: /.*/, namespace: 'synthetic' }, args => ({ contents: args.path.includes('socialService')
        ? 'export const connectRace=(...args)=>globalThis.__socialTest.connect(...args); export const leaveRaceRoom=async code=>{globalThis.__socialTest.leaves.push(code)};'
        : args.path.includes('useAppStore') ? 'export const useAppStore=globalThis.__socialTest.store;'
          : 'export const lobby={invite:(to,code)=>{globalThis.__socialTest.invited.push({to,code});return true}};' }));
    } }],
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text + `\n// ${Math.random()}`).toString('base64')}`) as typeof import('../../src/features/social/raceController');
  return { api, calls, invited, leaves, errors, state: () => state, update };
}
const identity = { name: 'Me', color: 'blue' };
const selection = { lessons: { 1: [1] }, types: [] };
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };

test('repeated invites coalesce pending creation and reuse the waiting room', async () => {
  const h = await controller();
  const first = h.api.createRace(identity, selection, true, ['a']);
  const second = h.api.createRace(identity, selection, true, ['b']);
  await flush(); assert.equal(h.calls.length, 1);
  h.calls[0].resolve({ code: 'ABCDEF', send: () => true, close: () => {} });
  await Promise.all([first, second]);
  h.calls[0].handlers.onStatus('live'); h.calls[0].handlers.onState(snapshot(), 'me');
  assert.deepEqual(h.invited, [{to:['a','b'],code:'ABCDEF'}]);
  await h.api.createRace(identity, selection, true, ['c']);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.invited.at(-1), {to:['c'],code:'ABCDEF'});
  h.api.leaveRace();
});

test('leaving during an HTTP join cancels it and late callbacks cannot reopen the room', async () => {
  const h = await controller();
  const opening = h.api.joinRace(identity, 'ABCDEF');
  await flush(); h.api.leaveRace();
  assert.equal(h.calls[0].signal.aborted, true);
  let closed = false;
  h.calls[0].resolve({ code:'ABCDEF',send:()=>true,close:()=>{closed=true;} });
  await opening;
  h.calls[0].handlers.onStatus('live'); h.calls[0].handlers.onState(snapshot(), 'me');
  assert.equal(closed,true); assert.equal(h.state().race,null); assert.equal(h.state().racePending,false);
  assert.deepEqual(h.leaves,[],'cancelled old joins must not evict a newer connection with the same room code');
});

test('disconnect buffers only latest progress and reconnect replays it once; rematches isolate rounds', async () => {
  const h = await controller();
  const sent: unknown[] = [];
  let live = true;
  const opening = h.api.joinRace(identity,'ABCDEF'); await flush();
  h.calls[0].resolve({code:'ABCDEF',send:frame=>{if(!live)return false;sent.push(frame);return true;},close:()=>{}}); await opening;
  const race = {...snapshot(),phase:'race' as const,deadline:Date.now()+600000};
  h.calls[0].handlers.onStatus('live'); h.calls[0].handlers.onState(race,'me');
  h.api.reportRaceProgress(1,4,1);
  live=false; h.calls[0].handlers.onStatus('reconnecting');
  h.api.reportRaceProgress(2,4,1); h.api.reportRaceProgress(3,4,2);
  assert.equal(sent.length,1);
  live=true; h.calls[0].handlers.onStatus('live'); h.calls[0].handlers.onState(race,'me');
  assert.deepEqual(sent.at(-1),{type:'progress',round:1,answered:3,total:4,correct:2});
  h.api.reportRaceProgress(3,4,2); assert.equal(sent.length,2);
  h.calls[0].handlers.onState(snapshot(2),'me');
  assert.equal(sent.length,2,'old-round progress is not sent into the rematch');
  h.api.leaveRace();
});

test('terminal closure clears stale room state and failed joins do not close a personal quiz', async () => {
  const h = await controller();
  let stops=0; h.api.setRaceLauncher({start:()=>{},stop:()=>{stops++;}});
  h.update({activeActivity:'quiz'});
  const failed = h.api.joinRace(identity,'ABCDEF'); await flush();
  h.calls[0].reject(new Error('Room expired')); await failed;
  assert.equal(stops,0); assert.equal(h.state().activeActivity,'quiz'); assert.equal(h.state().racePending,false);
  const opening=h.api.joinRace(identity,'ABCDEF');await flush();
  h.calls[1].resolve({code:'ABCDEF',send:()=>true,close:()=>{}});await opening;
  h.calls[1].handlers.onStatus('live');h.calls[1].handlers.onState({...snapshot(),phase:'race'},'me');
  h.calls[1].handlers.onStatus('off');
  assert.equal(stops,1);assert.equal(h.state().race,null);assert.equal(h.state().raceStatus,'off');
  assert.deepEqual(h.leaves,[],'terminal replacement closes the local view without evicting the new tab');
});

test('preparation updates keep the quiz open until the race actually starts', async () => {
  const h = await controller();
  let starts = 0; let stops = 0;
  h.api.setRaceLauncher({ start: () => { starts += 1; }, stop: () => { stops += 1; } });
  const opening = h.api.joinRace(identity, 'ABCDEF'); await flush();
  h.calls[0].resolve({ code: 'ABCDEF', send: () => true, close: () => {} }); await opening;
  const preparing = { ...snapshot(), phase: 'preparing' as const, prepareDeadline: Date.now() + 60_000 };
  h.calls[0].handlers.onStatus('live'); h.calls[0].handlers.onState(preparing, 'me');
  assert.deepEqual([starts, stops, h.state().racePlaying], [1, 0, true]);
  const ready = { ...preparing, players: preparing.players.map(player => player.id === 'me' ? { ...player, preparedAt: Date.now() } : player), revision: 1 };
  h.calls[0].handlers.onState(ready, 'me');
  assert.deepEqual([starts, stops, h.state().racePlaying], [1, 0, true], 'another preparation snapshot must not close the quiz');
  h.calls[0].handlers.onState({ ...ready, phase: 'race', startedAt: Date.now(), deadline: Date.now() + 600_000, revision: 2 }, 'me');
  assert.deepEqual([starts, stops, h.state().racePlaying], [1, 0, true]);
  h.calls[0].handlers.onState({ ...ready, phase: 'results', revision: 3 }, 'me');
  assert.deepEqual([starts, stops, h.state().racePlaying], [1, 1, false]);
  h.api.leaveRace();
});

test('rapid settings edits stay optimistic and send the latest choice after the previous acknowledgement', async () => {
  const h = await controller(); const sent: unknown[]=[];
  const opening=h.api.joinRace(identity,'ABCDEF');await flush();
  h.calls[0].resolve({code:'ABCDEF',send:frame=>{sent.push(frame);return true;},close:()=>{}});await opening;
  const initial=snapshot();h.calls[0].handlers.onStatus('live');h.calls[0].handlers.onState(initial,'me');
  const first={lessons:{1:[1,2]},types:[]};const latest={lessons:{1:[1,2,3]},types:[]};
  h.api.raceSend({type:'settings',selection:first,open:true});
  h.api.raceSend({type:'settings',selection:latest,open:true});
  assert.equal(sent.length,1);
  assert.deepEqual((h.state().race as RaceSnapshot).selection,latest);
  h.calls[0].handlers.onState({...initial,selection:first,revision:1},'me');
  assert.equal(sent.length,2);assert.deepEqual((h.state().race as RaceSnapshot).selection,latest);
  h.calls[0].handlers.onState({...initial,selection:latest,revision:2},'me');
  h.api.raceSend({type:'start'});
  assert.deepEqual(sent.at(-1),{type:'start',round:1});h.api.leaveRace();
});
