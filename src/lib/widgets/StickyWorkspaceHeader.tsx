import React, { useState } from 'react';
import { IconActionButton } from './IconActionButton';
import { AppIcon } from './AppIcon';
import { ExpandableSearch } from './ExpandableSearch';

export interface StickyWorkspaceHeaderMenuToggle {
  onClick: () => void;
  label?: string;
}

export interface StickyWorkspaceHeaderProps {
  /** Page/section title rendered in the header. */
  title: string;
  /** Horizontal alignment of the title block. Defaults to centered. */
  align?: 'left' | 'center';
  /** Optional short uppercase label under the title (e.g. book label on Books home). */
  subtitle?: string;
  /** Tailwind token classes for the subtitle text (default: muted). Use accent/course tokens, never hardcoded hex. */
  subtitleClassName?: string;
  /** Optional icon shown next to the title (e.g. folder icon). */
  leftSlot?: React.ReactNode;
  /** Optional content rendered on the right side of the header row (e.g. profile avatar). */
  rightContent?: React.ReactNode;
  /**
   * When provided, renders a quiet hamburger button overlaid on the left at all
   * breakpoints. Same slot as `onBack`; it centers with the title row so nav
   * stays reachable from the workspace header on desktop too.
   */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
  /** When provided, renders a quiet back button overlaid on the left. */
  onBack?: () => void;
  backLabel?: string;
  /** When provided, renders a quiet expandable search icon overlaid on the right. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  className?: string;
}

/**
 * Canonical top-level workspace sticky header.
 * Single source of truth for gradient fade, blur, height, paddings and title
 * typography across Books / Library / Dictionary (AGENTS.md rule 32).
 * All colors are ui-* / brand-* tokens — never hardcode.
 */
export function StickyWorkspaceHeader({
  title,
  subtitle,
  subtitleClassName = 'text-ui-muted',
  leftSlot,
  rightContent,
  menuToggle,
  onBack,
  backLabel = 'Back',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchLabel = 'search',
  align = 'center',
  className = '',
}: StickyWorkspaceHeaderProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Left controls (back button / menu toggle) are ~44px wide at left-3, so the
  // title row needs ~64px of horizontal padding at every breakpoint to avoid
  // overlapping them. Clear the padding zone whenever either control is present.
  const hasLeftControl = Boolean(onBack || menuToggle);
  const rowPaddingClass = hasLeftControl ? 'px-16 md:px-16' : 'px-16 md:px-4';

  return (
    <div
      className={`sticky top-0 z-40 flex w-full origin-top flex-col items-center bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent pb-1 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px] md:pb-2 md:pt-2 ${className}`}
    >
      <div
        className={`relative z-20 flex h-14 w-full flex-col ${rowPaddingClass} ${
          align === 'left'
            ? 'items-start justify-center text-left'
            : 'items-center justify-center text-center'
        }`}
      >
        {menuToggle && (
          <IconActionButton
            onClick={menuToggle.onClick}
            variant="quiet"
            size="lg"
            label={menuToggle.label ?? 'Menu'}
            icon={<AppIcon name="menu" size={22} />}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
        )}

        {onBack && (
          <IconActionButton
            onClick={onBack}
            variant="quiet"
            size="lg"
            label={backLabel}
            icon={<AppIcon name="back" size={22} />}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          />
        )}

        <div
          className={`flex min-w-0 max-w-full items-center gap-2 ${
            align === 'left' ? 'justify-start' : 'justify-center'
          }`}
        >
          {leftSlot && <div className="shrink-0 text-ui-ink [&>svg]:h-6 [&>svg]:w-6">{leftSlot}</div>}
          <h1 className="truncate text-xl font-extrabold tracking-tight text-ui-ink sm:text-2xl md:text-[26px]">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className={`mt-0.5 text-[11px] font-black uppercase tracking-widest md:text-[12px] ${subtitleClassName}`}>
            {subtitle}
          </p>
        )}

        {(rightContent || (typeof searchValue === 'string' && onSearchChange)) && (
          <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 items-center justify-end gap-1 md:right-6">
            {rightContent}
            {typeof searchValue === 'string' && onSearchChange && (
              <ExpandableSearch
                value={searchValue}
                onChange={onSearchChange}
                isExpanded={searchExpanded}
                onExpandedChange={setSearchExpanded}
                placeholder={searchPlaceholder}
                label={searchLabel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}