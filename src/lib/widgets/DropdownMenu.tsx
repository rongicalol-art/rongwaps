import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';

export interface DropdownMenuTriggerProps {
  ref: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  'aria-expanded': boolean;
  'aria-haspopup': 'menu';
  'aria-controls': string;
}

export interface DropdownMenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Accessible name for the menu trigger. */
  label: string;
  /** Render prop receives trigger props; build your own styled button. */
  renderTrigger: (props: DropdownMenuTriggerProps) => React.ReactNode;
  /** Controlled open state. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Right-align (default) or left-align the menu with its trigger. */
  align?: 'start' | 'end';
  /** Gap between trigger and menu. Default 12px. */
  gapClassName?: string;
  /** Width of the menu surface (default w-60). */
  widthClassName?: string;
  /** The menu items rendered inside the popover. */
  children: React.ReactNode;
}

/**
 * Simple dropdown/popover menu with menu semantics, keyboard navigation
 * (Tab/Enter/Space/Escape/arrow keys), roving tabindex, outside-click and
 * Escape dismissal, and viewport-safe right alignment.
 *
 * Surface style follows the RongWaps tactile card system: white, rounded,
 * thick bottom edge for depth, no outline, no blur shadow.
 * A plain quick fade is used for open/close; reduced-motion users get none.
 */
export function DropdownMenu({
  label,
  renderTrigger,
  open,
  onOpenChange,
  align = 'end',
  gapClassName = 'mt-2',
  widthClassName = 'w-44',
  className,
  children,
  ...props
}: DropdownMenuProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const reduceMotion = useReducedMotion();

  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement =>
      React.isValidElement(child) && (child.props as { role?: string }).role === 'menuitem',
  );

  const close = () => {
    onOpenChange(false);
    setFocusedIndex(-1);
    // Restore focus to the trigger so keyboard users return to a known spot.
    triggerRef.current?.focus();
  };

  const openMenu = () => {
    onOpenChange(true);
    setFocusedIndex(0);
  };

  const toggle = () => {
    if (open) close();
    else openMenu();
  };

  // Outside click + Escape dismissal while open.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the active menu item when the menu opens.
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const itemEls = containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    itemEls?.[focusedIndex]?.focus();
  }, [open, focusedIndex]);

  const moveFocus = (direction: 1 | -1, toEnd = false) => {
    setFocusedIndex((current) => {
      if (items.length === 0) return current;
      if (toEnd) return direction === 1 ? 0 : items.length - 1;
      return (current + direction + items.length) % items.length;
    });
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(1, true);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(-1, true);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  const triggerProps: DropdownMenuTriggerProps = {
    ref: triggerRef,
    onClick: toggle,
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    'aria-controls': menuId,
  };

  return (
    <div ref={containerRef} className={cn('relative shrink-0', className)} {...props}>
      {renderTrigger(triggerProps)}

      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown-menu"
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute top-full z-50 rounded-control border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface shadow-ambient-md',
              'flex flex-col p-0.5',
              gapClassName,
              widthClassName,
              align === 'end' ? 'right-0' : 'left-0',
              'max-w-[calc(100vw-1.5rem)]',
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface DropdownMenuItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: React.ReactNode;
  iconClassName?: string;
  /** Pale-blue active fill (study modes like Flow). */
  active?: boolean;
  /** Avoid a checkmark: active items are distinguished by fill + color. */
  label?: React.ReactNode;
  /** Rows keep a minimum 52px hit target. */
  rowClassName?: string;
  children?: React.ReactNode;
}

export function DropdownMenuItem({
  icon,
  iconClassName,
  active,
  label,
  rowClassName,
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cn(
        'flex min-h-9 w-full cursor-pointer select-none items-center gap-2.5 rounded-sm px-3 py-1.5 text-left text-xs font-extrabold text-ui-ink outline-none transition-[background-color,color,transform] duration-100',
        'focus-ring',
        active
          ? 'bg-brand-primary/10 text-brand-primary'
          : 'hover:bg-ui-hover active:translate-y-[2px]',
        rowClassName,
        className,
      )}
      {...props}
    >
      {icon && <span className={cn('shrink-0 text-[19px]', active && 'text-brand-primary', iconClassName)}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children ?? label}</span>
    </button>
  );
}

/** Static icon helper for consistent menu item icon sizing. */
export function DropdownMenuIcon({ name }: { name: Parameters<typeof AppIcon>[0]['name'] }) {
  return <AppIcon name={name} size={22} />;
}