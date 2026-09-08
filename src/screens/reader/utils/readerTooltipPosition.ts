export interface AnchorPosition {
  x: number;
  top: number;
  bottom: number;
}

export interface TooltipDimensions {
  width: number;
  height: number;
}

export interface ViewportBounds {
  innerWidth: number;
  innerHeight: number;
}

export interface TooltipPlacement {
  top: number;
  left: number;
  arrowLeft: number;
  above: boolean;
}

// Backwards-compatible AnchorRect interface for existing callers and tests
export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface TooltipPosition {
  top: number;
  left: number;
  isFlipped: boolean;
}

const TOOLTIP_GAP = 10;
const SCREEN_PADDING = 12;
const DEFAULT_TOOLTIP_WIDTH = 150;
const DEFAULT_TOOLTIP_HEIGHT = 50;

/**
 * Calculates exact viewport-relative top/left and arrow offset for the reader hover tooltip.
 * Clamps tooltip within viewport bounds and ensures the arrow tracks the word center.
 */
export function calculateTooltipPlacement(
  anchor: AnchorPosition,
  dimensions: TooltipDimensions = { width: DEFAULT_TOOLTIP_WIDTH, height: DEFAULT_TOOLTIP_HEIGHT },
  viewport: ViewportBounds = {
    innerWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    innerHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  },
  gap = TOOLTIP_GAP,
  screenPadding = SCREEN_PADDING,
): TooltipPlacement {
  const above = anchor.top > dimensions.height + gap + 10;
  const top = above ? anchor.top - dimensions.height - gap : anchor.bottom + gap;

  const idealLeft = anchor.x - dimensions.width / 2;
  const maxLeft = Math.max(screenPadding, viewport.innerWidth - dimensions.width - screenPadding);
  const left = Math.min(Math.max(screenPadding, idealLeft), maxLeft);

  const arrowHalf = 5;
  const arrowMin = 16;
  const arrowMax = Math.max(arrowMin, dimensions.width - 26);
  const arrowLeft = Math.min(Math.max(arrowMin, anchor.x - left - arrowHalf), arrowMax);

  return {
    top,
    left,
    arrowLeft,
    above,
  };
}

/**
 * Compatibility wrapper for calculateTooltipPosition
 */
export function calculateTooltipPosition(
  anchorRect: AnchorRect,
  viewport: ViewportBounds,
  tooltipWidth = DEFAULT_TOOLTIP_WIDTH,
  tooltipHeight = DEFAULT_TOOLTIP_HEIGHT,
): TooltipPosition {
  const anchor: AnchorPosition = {
    x: anchorRect.left + anchorRect.width / 2,
    top: anchorRect.top,
    bottom: anchorRect.bottom,
  };
  const placement = calculateTooltipPlacement(
    anchor,
    { width: tooltipWidth, height: tooltipHeight },
    viewport,
  );
  return {
    top: placement.top,
    left: placement.left,
    isFlipped: !placement.above,
  };
}
