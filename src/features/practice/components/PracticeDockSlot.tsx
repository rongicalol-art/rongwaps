import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface PracticeDockSlotValue {
  /** DOM node inside the practice dock where the active mode's own controls render. */
  slot: HTMLElement | null;
  setSlot: (node: HTMLElement | null) => void;
  /** Dock axis, so slotted controls lay out the same way as the dock. */
  isVertical: boolean;
  /** True while slotted controls stand in for the dock's mode switcher. */
  exclusive: boolean;
  setExclusive: (exclusive: boolean) => void;
}

/**
 * Shared choreography for swapping the dock's mode switcher and a mode's own
 * controls: the outgoing one slides down and fades, then the incoming one rises
 * in after it. Transform and opacity only, so it stays on the compositor.
 */
export const DOCK_SWAP = {
  distance: 28,
  exitSeconds: 0.16,
  enterSeconds: 0.24,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

const PracticeDockSlotContext = createContext<PracticeDockSlotValue | null>(null);

/**
 * Lets a practice mode (e.g. writing) put its own controls inside the single
 * practice dock instead of mounting a second dock. A mode can claim the dock
 * (`exclusive`) so its controls replace the mode switcher. The dock renders
 * `PracticeDockSlotOutlet`; the mode portals its controls into the slot.
 */
export function PracticeDockSlotProvider({ isVertical, children }: { isVertical: boolean; children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [exclusive, setExclusive] = useState(false);
  const value = useMemo(() => ({ slot, setSlot, isVertical, exclusive, setExclusive }), [slot, isVertical, exclusive]);
  return <PracticeDockSlotContext.Provider value={value}>{children}</PracticeDockSlotContext.Provider>;
}

export function usePracticeDockSlot(): PracticeDockSlotValue | null {
  return useContext(PracticeDockSlotContext);
}

/** Rendered by the practice dock. Collapses when nothing is slotted in. */
export function PracticeDockSlotOutlet({ className }: { className?: string }) {
  const context = usePracticeDockSlot();
  return <div ref={context?.setSlot} className={className ? `${className} empty:hidden` : 'empty:hidden'} />;
}
