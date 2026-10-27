import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

// Exercise the real listener with controlled focus and callbacks; no study progress is recorded.
test('F toggles Flow and E plays an example, with typing, modifiers and inactive screens protected', async t => {
  let cleanup = () => {};
  const bundle = await build({ entryPoints: ['src/screens/flashcard/hooks/useFlashcardKeyboardShortcuts.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'shortcut-effects', setup(plugin) {
      plugin.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useRef=current=>({current}); export const useEffect=fn=>globalThis.__shortcutEffects(fn);' }));
    } }],
  });
  class Element { editable = false; closest() { return this.editable ? this : null; } }
  const focus = new Element();
  let dialog = false;
  const surface = new EventTarget();
  for (const [key, value] of Object.entries({
    window: surface, document: { activeElement: focus, querySelector: () => dialog ? {} : null }, HTMLElement: Element,
    __shortcutEffects: (effect: () => () => void) => { cleanup = effect(); },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); });
  }
  const { useFlashcardKeyboardShortcuts: hook } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/screens/flashcard/hooks/useFlashcardKeyboardShortcuts');
  const calls: string[] = [];
  const options = {
    completed: false, activeBreakdown: null, currentIndex: 1, maxVisitedIndex: 1, cardsLength: 3,
    currentCard: { id: 'fixture', bookId: 1, lessonId: 1, front: '字', back: 'character' },
    isReviewDeck: false, autoPlayAudio: false, pauseFlow: () => calls.push('pause'),
    triggerNav: () => calls.push('navigate'), triggerKeyboardRate: () => calls.push('rate'),
    setIsFlipped: () => calls.push('flip'), onManualRevealAudio: () => {},
    onToggleFlow: () => calls.push('flow'), onPlayExample: () => calls.push('example'),
  };
  const press = (key: string, flags = {}) => {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key, ...flags });
    surface.dispatchEvent(event);
    return event.defaultPrevented;
  };
  hook(options);
  assert.equal(press('f'), true);
  assert.equal(press('F'), true);
  assert.equal(press('e'), true);
  assert.equal(press('E'), true);
  assert.deepEqual(calls, ['flow', 'flow', 'example', 'example']);
  calls.length = 0;
  for (const flags of [{ repeat: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
    press('f', flags); press('e', flags);
  }
  focus.editable = true;
  press('f'); press('e');
  focus.editable = false;
  dialog = true;
  press('f'); press('e');
  dialog = false;
  assert.deepEqual(calls, []);
  for (const override of [{ completed: true }, { isIntroActive: true }, { activeBreakdown: '字' }, { currentCard: null }]) {
    cleanup(); hook({ ...options, ...override });
    press('f'); press('e');
  }
  assert.deepEqual(calls, []);
  cleanup();
  press('f'); press('e');
  assert.deepEqual(calls, [], 'unmount removes the listener');
});
