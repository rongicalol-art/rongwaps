import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

test('pausing Flow before example playback prevents the old word task from stopping the new audio', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let releaseWord!: () => void;
  const word = new Promise<void>(resolve => { releaseWord = resolve; });
  let stops = 0;
  const cleanups: Array<() => void> = [];
  const fixture = {
    effect: (effect: () => (() => void) | undefined) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
    audio: { playCard: () => word, stop: () => { stops++; }, initialize: () => {} },
    store: {},
  };
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  globals.__cardFlowCancellation = fixture;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout } });
  t.after(() => {
    cleanups.forEach(cleanup => cleanup());
    delete globals.__cardFlowCancellation;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
  });
  const bundle = await build({ entryPoints: ['src/screens/flashcard/hooks/useCardFlow.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'running-flow', setup(plugin) {
      plugin.onResolve({ filter: /^react$|audioService$|sentenceAudio$|contentPacks$|useAppStore$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'react'
        ? 'export const useEffect=fn=>globalThis.__cardFlowCancellation.effect(fn),useCallback=fn=>fn,useRef=current=>({current}),useState=value=>[value==="idle"?"playing":value,()=>{}];'
        : args.path.endsWith('audioService') ? 'export const audioService=globalThis.__cardFlowCancellation.audio;'
          : args.path.endsWith('useAppStore') ? 'export const useAppStore=select=>select(globalThis.__cardFlowCancellation.store);'
            : args.path.endsWith('contentPacks') ? 'export const fetchPackedFlashcardExtras=async()=>null;'
              : 'export const playFlowSentence=async()=>{};' }));
    } }],
  });
  const { useCardFlow } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/screens/flashcard/hooks/useCardFlow');
  const flow = useCardFlow({ currentCard: { id: 'fake', bookId: 1, lessonId: 1, front: '字', back: 'character' }, currentIndex: 0, totalCount: 1, setIsFlipped: () => {}, onAdvance: () => assert.fail('paused flow cannot advance'), onReplay: () => {} });
  t.mock.timers.tick(220); await Promise.resolve();
  t.mock.timers.tick(360); await Promise.resolve();
  flow.pauseFlow();
  releaseWord();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stops, 0, 'a cancelled Flow must not stop the example replacing its word recording');
});
