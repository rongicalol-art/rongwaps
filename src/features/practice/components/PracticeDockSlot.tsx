import { createContext, useContext, useMemo, useState, type ReactNode, type RefObject } from 'react';

interface PracticeDockSlotValue {
  /** DOM node inside the practice dock where the active mode's own controls render. */
  slot: HTMLElement | null;
  setSlot: (node: HTMLElement | null) => void;
  /** Dock axis, so slotted controls lay out the same way as the dock. */
  isVertical: boolean;
  /** True while slotted controls stand in for the dock's mode switcher. */
  exclusive: boolean;
  setExclusive: (exclusive: boolean) => void;
  /** The full-height practice body the dock sits in; a screen's bottom bar renders here so it can share the dock's lane. */
  laneRef?: RefObject<HTMLElement | null>;
  /** True while a screen's result bar holds the dock's lane; the dock steps aside. */
  yielded: boolean;
  setYielded: (yielded: boolean) => void;
}

/** The dock's mode switcher and a mode's own controls swap with a short fade: no travel, no waiting for the other to leave. */
export const DOCK_SWAP = {
  distance: 0,
  exitSeconds: 0.08,
  enterSeconds: 0.12,
  ease: 'easeOut' as const,
};

const PracticeDockSlotContext = createContext<PracticeDockSlotValue | null>(null);

/**
 * Lets a practice mode (e.g. writing) put its own controls inside the single
 * practice dock instead of mounting a second dock. A mode can claim the dock
 * (`exclusive`) so its controls replace the mode switcher. The dock renders
 * `PracticeDockSlotOutlet`; the mode portals its controls into the slot.
 */
export function PracticeDockSlotProvider({ isVertical, laneRef, children }: {
  isVertical: boolean;
  laneRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [exclusive, setExclusive] = useState(false);
  const [yielded, setYielded] = useState(false);
  const value = useMemo(
    () => ({ slot, setSlot, isVertical, laneRef, exclusive, setExclusive, yielded, setYielded }),
    [slot, isVertical, laneRef, exclusive, yielded],
  );
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
