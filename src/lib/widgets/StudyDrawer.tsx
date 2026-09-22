import type { ReactNode } from 'react';
import { Drawer, type DrawerTone } from './Drawer';

export interface StudyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Eyebrow title shown in the sticky header. */
  title: string;
  tone: DrawerTone;
  closeLabel?: string;
  children: ReactNode;
}

/**
 * Shared mobile study drawer shell (reader Study Guide, grammar "don't mix
 * these up"): a bottom sheet with drag handle, eyebrow title, close control and
 * a scrollable body. Hidden from `lg` up, where screens render
 * `StudySidePanel` instead. Screens own the drawer content; the shell is
 * presentation only.
 */
export function StudyDrawer({
  isOpen,
  onClose,
  ariaLabel,
  title,
  tone,
  closeLabel = 'Close',
  children,
}: StudyDrawerProps) {
  return (
    <Drawer.Root open={isOpen} onClose={onClose} tone={tone} workspaceBound>
      <Drawer.Backdrop />
      <Drawer.Content
        size="lg"
        ariaLabel={ariaLabel}
        heightClassName="h-[85vh] max-h-[85vh]"
        className="lg:hidden"
      >
        <Drawer.StickyHeader>
          <Drawer.Handle className="pb-2" />
          <div className="flex items-center justify-between px-4 sm:px-6">
            <Drawer.Title variant="eyebrow">{title}</Drawer.Title>
            <Drawer.Close label={closeLabel} />
          </div>
        </Drawer.StickyHeader>
        <Drawer.Body className="px-4 pb-safe-area flex flex-col min-h-0 custom-scrollbar mb-0">
          {children}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
