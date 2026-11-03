import assert from 'node:assert/strict';
import test from 'node:test';

/** A tapped button must not swallow a dock's Space; a button reached with Tab still presses itself. */

class FakeNode {
  constructor(private readonly children: FakeNode[] = []) {}
  contains(other: unknown): boolean {
    return other === this || this.children.some((child) => child.contains(other));
  }
}

test('only the button the last tap landed in counts as tapped', async () => {
  const listeners: Array<(event: { target: unknown }) => void> = [];
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldNode = Object.getOwnPropertyDescriptor(globalThis, 'Node');
  Object.defineProperty(globalThis, 'Node', { configurable: true, value: FakeNode });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener: (_type: string, listener: (event: { target: unknown }) => void) => listeners.push(listener) },
  });
  try {
    const { isTappedFocus, watchTaps } = await import('../../src/utils/browser/tappedFocus');
    const label = new FakeNode() as unknown as EventTarget;
    const choice = new FakeNode([label as unknown as FakeNode]) as unknown as EventTarget;
    const tabbed = new FakeNode() as unknown as EventTarget;
    watchTaps();
    watchTaps();
    assert.equal(listeners.length, 1, 'one listener however many docks ask');
    assert.equal(isTappedFocus(choice), false, 'nothing tapped yet');
    listeners[0]({ target: label });
    assert.equal(isTappedFocus(choice), true, 'a tap on the label inside the choice counts for the choice');
    assert.equal(isTappedFocus(tabbed), false, 'a button reached with Tab is not the tapped one');
    assert.equal(isTappedFocus(null), false);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (oldNode) Object.defineProperty(globalThis, 'Node', oldNode);
    else Reflect.deleteProperty(globalThis, 'Node');
  }
});
