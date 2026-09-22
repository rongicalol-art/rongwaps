import { useEffect, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface DockSubMenuProps<T extends string> {
  open: boolean;
  onClose: () => void;
  modeKey: string;
  containerRef: RefObject<HTMLDivElement | null>;
  options: ReadonlyArray<{ value: T; label: string; icon: Parameters<typeof AppIcon>[0]['name'] }>;
  selectedValue?: T | null;
  onSelect: (value: T) => void;
  label: string;
}

export function DockSubMenu<T extends string>({
  open,
  onClose,
  modeKey,
  containerRef,
  options,
  selectedValue,
  onSelect,
  label,
}: DockSubMenuProps<T>) {
  const [menuLeft, setMenuLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const targetButton = containerRef.current.querySelector<HTMLElement>(`[data-mode="${modeKey}"]`);
      if (!targetButton) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = targetButton.getBoundingClientRect();
      const menuWidth = 240;
      const halfWidth = menuWidth / 2; // 120px

      // Exact center of the button relative to the container
      const buttonCenterInContainer = (buttonRect.left + buttonRect.width / 2) - containerRect.left;
      const idealLeft = buttonCenterInContainer - halfWidth;

      // Screen clamping bounds: keep at least 16px from screen edges
      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - containerRect.left;
      const maxLeft = (maxScreenX - menuWidth) - containerRect.left;

      // On wide screens where there is space, idealLeft is used directly.
      // On narrow screens where idealLeft would clip off-screen, it clamps safely.
      const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      setMenuLeft(clampedLeft);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open, modeKey, containerRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-full w-60 sm:w-64 pb-3 z-50 pointer-events-auto"
          style={{
            left: menuLeft !== null ? `${menuLeft}px` : 'calc(50% - 120px)',
          }}
        >
          <div
            role="menu"
            aria-label={label}
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg flex flex-col gap-1.5"
          >
            {options.map((mode) => (
              <ActionButton
                key={mode.value}
                role="menuitem"
                variant="quiet"
                size="md"
                fullWidth
                className={cn(
                  'justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold',
                  selectedValue === mode.value
                    ? 'text-brand-primary hover:text-brand-primary'
                    : 'text-ui-ink-strong',
                )}
                onClick={() => {
                  onSelect(mode.value);
                  onClose();
                }}
              >
                <AppIcon name={mode.icon} size={22} />
                {mode.label}
              </ActionButton>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
