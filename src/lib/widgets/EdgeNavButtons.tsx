import { cn } from '../../utils/cn';

export interface EdgeNavButtonsProps {
  /** Callback fired when previous (left zone) is tapped. */
  onPrevious?: () => void;
  /** Callback fired when next (right zone) is tapped. */
  onNext?: () => void;
  /** Whether backward navigation is possible. */
  canNavigatePrevious?: boolean;
  /** Whether forward navigation is possible. */
  canNavigateNext?: boolean;
  /** Width profile: 'half' (50% each for full-screen flashcards) or 'edge' (outer margin strips). */
  width?: 'half' | 'edge';
  /** Top offset class (e.g. 'top-[72px]'). Defaults to 'top-[72px]'. */
  topOffset?: string;
  /** Bottom offset class (e.g. 'bottom-0' or 'bottom-[90px]'). Defaults to 'bottom-0'. */
  bottomOffset?: string;
  /** Z-index class. Defaults to 'z-0'. */
  zIndex?: string;
  /** Accessibility label for previous button. */
  previousLabel?: string;
  /** Accessibility label for next button. */
  nextLabel?: string;
}

export function EdgeNavButtons({
  onPrevious,
  onNext,
  canNavigatePrevious = true,
  canNavigateNext = true,
  width = 'half',
  topOffset = 'top-[72px]',
  bottomOffset = 'bottom-0',
  zIndex = 'z-0',
  previousLabel = 'Previous card',
  nextLabel = 'Next card',
}: EdgeNavButtonsProps) {
  const widthClass =
    width === 'edge' ? 'w-[20%] max-w-[130px] cursor-pointer' : 'w-1/2';

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label={previousLabel}
        disabled={!canNavigatePrevious || !onPrevious}
        onClick={(e) => {
          e.stopPropagation();
          onPrevious?.();
        }}
        className={cn(
          'absolute left-0 bg-transparent outline-none disabled:pointer-events-none select-none',
          topOffset,
          bottomOffset,
          zIndex,
          widthClass
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        aria-label={nextLabel}
        disabled={!canNavigateNext || !onNext}
        onClick={(e) => {
          e.stopPropagation();
          onNext?.();
        }}
        className={cn(
          'absolute right-0 bg-transparent outline-none disabled:pointer-events-none select-none',
          topOffset,
          bottomOffset,
          zIndex,
          widthClass
        )}
      />
    </>
  );
}
