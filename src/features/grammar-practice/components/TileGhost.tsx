import { createPortal } from 'react-dom';
import type { DragState } from '../useTileDrag';

/** The copy of a word that follows the pointer: lifted, a touch larger, riding above the fingertip. */
export function TileGhost({ drag }: { drag: DragState | null }) {
  if (!drag) return null;
  const target = drag.returning ?? { x: drag.x, y: drag.y };
  return createPortal(
    <div
      aria-hidden="true"
      style={{
        left: target.x - drag.width / 2,
        top: target.y - drag.height * 2,
        width: drag.width,
        height: drag.height,
        zIndex: 1500,
      }}
      className={
        'pointer-events-none fixed flex scale-105 items-center justify-center rounded-control border-2 border-ui-border border-b-[length:var(--depth-lg)] bg-ui-surface shadow-lg ' +
        (drag.returning ? 'transition-[left,top,opacity] duration-150 ease-out motion-reduce:transition-none opacity-70' : '')
      }
    >
      <span className="font-chinese-sans font-semibold text-[22px] leading-none text-ui-ink-strong">{drag.text}</span>
    </div>,
    document.body,
  );
}
