import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, DropdownMenuItem } from '../../../lib/widgets';

export interface MenuPoint {
  x: number;
  y: number;
}

const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;

/**
 * Right-click or touch long-press opens the menu at the pointer. A long press
 * swallows the click that follows it so the item underneath is not activated.
 */
export function useMenuTrigger(onOpen: (point: MenuPoint) => void, disabled = false) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<MenuPoint | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);

  if (disabled) return {};
  return {
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpen({ x: event.clientX, y: event.clientY });
    },
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      fired.current = false;
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        if (start.current) onOpen(start.current);
      }, LONG_PRESS_MS);
    },
    onTouchMove: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      if (start.current && Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > LONG_PRESS_SLOP) clear();
    },
    onTouchEnd: clear,
    onTouchCancel: clear,
    onClickCapture: (event: React.MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

export interface LibraryMenuAction {
  id: string;
  label: string;
  icon: 'pencil' | 'trash';
  danger?: boolean;
  onSelect: () => void;
}

interface LibraryContextMenuProps {
  point: MenuPoint;
  label: string;
  actions: LibraryMenuAction[];
  onClose: () => void;
}

const EDGE = 8;

/** Cursor- or finger-anchored menu for a folder or card; stays inside the viewport. */
export function LibraryContextMenu({ point, label, actions, onClose }: LibraryContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [position, setPosition] = useState(point);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPosition({
      x: Math.max(EDGE, Math.min(point.x, window.innerWidth - width - EDGE)),
      y: Math.max(EDGE, Math.min(point.y, window.innerHeight - height - EDGE)),
    });
  }, [point]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + step + items.length) % items.length]?.focus();
  };

  return createPortal(
    <motion.div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
      style={{ left: position.x, top: position.y }}
      className="popover-surface fixed z-[70] flex w-52 origin-top-left flex-col overflow-hidden p-0"
    >
      {actions.map((action) => (
        <DropdownMenuItem
          key={action.id}
          icon={<AppIcon name={action.icon} size={20} />}
          className={action.danger ? 'text-feedback-danger hover:bg-feedback-danger/10' : undefined}
          onClick={() => {
            onClose();
            action.onSelect();
          }}
        >
          {action.label}
        </DropdownMenuItem>
      ))}
    </motion.div>,
    document.body,
  );
}
