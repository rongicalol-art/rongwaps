import React from 'react';
import { AppIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useIsWordSaved } from '../hooks/useIsWordSaved';
import { cn } from '../../../utils/cn';

export interface FavoriteButtonProps {
  /** The headword to save or inspect */
  word: string;
  /** Optional traditional representation */
  traditional?: string;
  /** Optional simplified representation */
  simplified?: string;
  /** Optional pinyin representation (string or formatted) */
  pinyin?: string;
  /** Optional definitions metadata */
  definitions?: string | string[] | Record<string, unknown> | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Styling variant */
  variant?: 'ghost' | 'circle' | 'surface';
  /** Additional custom classes */
  className?: string;
  /** Prevent event bubbling (default true) */
  stopPropagation?: boolean;
}

const SIZE_CONFIG = {
  sm: { button: 'h-8 w-8', iconSize: 16 },
  md: { button: 'h-9 w-9', iconSize: 18 },
  lg: { button: 'h-10 w-10', iconSize: 22 },
};

/**
 * Universal Favorite / Save Word button.
 * Encapsulates saved-state detection (Favorites + custom folders),
 * accessible ARIA labels, and opens the universal SaveWordModal.
 */
export const FavoriteButton = React.memo(function FavoriteButton({
  word,
  traditional,
  simplified,
  pinyin,
  definitions,
  size = 'md',
  variant = 'ghost',
  className,
  stopPropagation = true,
}: FavoriteButtonProps) {
  const setSaveWordTarget = useAppStore((state) => state.setSaveWordTarget);
  const { isSaved } = useIsWordSaved(word, traditional, simplified);

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    setSaveWordTarget({
      word,
      traditional: traditional || word,
      simplified: simplified || word,
      pinyin,
      definitions,
    });
  };

  const { button: sizeClass, iconSize } = SIZE_CONFIG[size];

  const variantClass =
    variant === 'circle'
      ? cn(
          'rounded-full transition-colors focus-ring',
          isSaved
            ? 'bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/15'
            : 'bg-ui-canvas text-ui-muted-strong hover:bg-ui-hover hover:text-brand-primary',
        )
      : variant === 'surface'
        ? cn(
            'rounded-control border transition-colors focus-ring',
            isSaved
              ? 'bg-feedback-warning-subtle text-feedback-warning-edge border-feedback-warning/30 hover:bg-feedback-warning-subtle/80'
              : 'bg-ui-surface border-ui-border text-ui-ink hover:bg-ui-hover',
          )
        : cn(
            'rounded-control outline-none transition-colors focus-ring',
            isSaved
              ? 'text-feedback-warning hover:text-feedback-warning-edge'
              : 'text-ui-muted hover:text-feedback-warning',
          );

  const accessibleLabel = isSaved
    ? `Manage saved word ${word}`
    : `Save ${word}`;

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-pressed={isSaved}
      onClick={handleClick}
      className={cn(
        'flex shrink-0 items-center justify-center cursor-pointer select-none',
        sizeClass,
        variantClass,
        className,
      )}
    >
      <AppIcon
        name={isSaved ? 'bookmarkFilled' : 'bookmark'}
        size={iconSize}
        className={isSaved ? 'text-feedback-warning' : undefined}
      />
    </button>
  );
});
