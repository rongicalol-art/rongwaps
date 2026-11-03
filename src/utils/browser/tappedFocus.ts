/**
 * Whether a key's target got focus from a tap or click (not Tab). Chrome focuses a clicked button, so Space would press
 * a just-tapped answer again instead of a dock's Next; a dock lets its own shortcut win over a tapped button but keeps
 * a button reached with Tab pressable. (`:focus-visible` can't tell them apart: the key press itself turns it on.)
 */
let lastTap: EventTarget | null = null;
let listening = false;

function rememberTap(event: PointerEvent) {
  lastTap = event.target;
}

/** Start remembering taps (idempotent; call from a dock's keyboard effect). */
export function watchTaps(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pointerdown', rememberTap, true);
}

/** True when `target` is (or contains) the element the last tap landed on. */
export function isTappedFocus(target: EventTarget | null): boolean {
  return target instanceof Node && lastTap instanceof Node && target.contains(lastTap);
}
