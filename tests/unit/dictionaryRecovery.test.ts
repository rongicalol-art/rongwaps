import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

// Keep the hook's request lifecycle runnable without a DOM or persisted user progress.
async function searchHarness() {
  const states: unknown[] = [];
  const calls: Array<{ publish: (rows: unknown[]) => void; resolve: (rows: unknown[]) => void; reject: (error: Error) => void }> = [];
  const harness = {
    state: (initial: unknown) => { const index = states.length; states.push(initial); return [initial, (value: unknown) => { states[index] = value; }]; },
    search: (_query: string, publish: (rows: unknown[]) => void) => new Promise<unknown[]>((resolve, reject) => calls.push({ publish, resolve, reject })),
  };
  Object.assign(globalThis, { __dictionaryRecovery: harness });
  const bundle = await build({ entryPoints: ['src/hooks/useDictionarySearch.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'dictionary-request-fixture', setup(plugin) {
      plugin.onResolve({ filter: /^react$|dictionaryService$|debugLogger$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'react'
        ? 'export const useState=globalThis.__dictionaryRecovery.state,useEffect=()=>{},useCallback=fn=>fn,useRef=value=>({current:value});'
        : args.path.endsWith('dictionaryService') ? 'export const executeRemoteSearch=(...args)=>globalThis.__dictionaryRecovery.search(...args);'
          : 'export const debugLogger={error:()=>{}};' }));
    } }],
  });
  const module = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + `\n// ${Math.random()}`).toString('base64')}`) as typeof import('../../src/hooks/useDictionarySearch');
  const hook = module.useDictionarySearch('recovery-fixture');
  return { calls, states, retry: hook.retry };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const row = { id: 1, traditional: '老師', simplified: '老师', pinyin_accented: 'lǎo shī', definitions: ['teacher'], match_type: 'exact', total_score: 6200 };

test('partial dictionary results stay visible after a 503 and retry completes the same search', async () => {
  const h = await searchHarness();
  h.retry();
  h.calls[0].publish([row]);
  assert.equal(h.states[1], true, 'partial results do not end the global loading indicator');
  h.calls[0].reject(new Error('Dictionary request failed (503)'));
  await flush();
  assert.equal((h.states[0] as unknown[]).length, 1);
  assert.equal(h.states[1], false);
  assert.match(String(h.states[2]), /try again/i);
  h.retry();
  assert.equal(h.states[1], true);
  assert.equal(h.states[2], null);
  h.calls[1].resolve([row, { ...row, id: 2 }]);
  await flush();
  assert.equal((h.states[0] as unknown[]).length, 2);
  assert.equal(h.states[1], false);
  assert.equal(h.states[2], null);
});

test('a 503 without local rows remains an error rather than an empty successful search', async () => {
  const h = await searchHarness();
  h.retry();
  h.calls[0].reject(new Error('Dictionary request failed (503)'));
  await flush();
  assert.deepEqual(h.states[0], []);
  assert.equal(h.states[1], false);
  assert.match(String(h.states[2]), /try again/i);
});
