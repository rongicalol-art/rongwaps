import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '../../utils/cn';
import { MemoryHookPopover } from './MemoryHookPopover';
import { useMemoryHook } from './useMemoryHook';

/**
 * A single Chinese character that plays a subtle magnetic hover game and
 * reveals its memory hook in an iOS-style popover on hover/focus.
 *
 * - Magnet: a gentle field (~90px) around the character, tracked on the
 *   window so the pull works beside the glyph too. The pull caps at ~4px so
 *   it reads as a soft tug, never a grab. Mouse/trackpad only; disabled
 *   under reduced motion and while the flashcard is being dragged.
 * - Hook: hovering the character (or Tab-focusing it) reads the pre-generated
 *   memory hook from the cache (`getCachedMnemonic` — nothing is generated on
 *   the spot; a placeholder shows on a miss). The popover opens with a single
 *   quiet fade/rise (no blur, no springy overshoot, no staggered reveal) and
 *   the whole card is magnetic too — it follows the same cursor spring as the
 *   glyph, so the hook and the character pull together. Width is fixed and
 *   the body reserves two lines, so loading never makes it resize.
 * - The popover renders in a portal so it can never be clipped (e.g. by the
 *   flashcard's scrollable back face); click still opens the character
 *   breakdown and the accessible name is enriched with the hook once loaded.
 */
export interface MemoryHookCharacterProps {
  char: string;
  /** Classes for the Chinese glyph itself (size, color, leading…). */
  glyphClassName?: string;
  /** Extra classes for the button. */
  className?: string;
  /** Accessible name prefix; the hook text is appended once loaded. */
  label?: string;
  /** Click action, e.g. opening the character breakdown. */
  onOpen?: (char: string) => void;
  /** Keep the popover from opening (e.g. while the card is being dragged). */
  tooltipDisabled?: boolean;
  /** How long (ms) the pointer must rest on the character first. */
  tooltipDelayMs?: number;
  /** Maximum pixel pull toward the cursor. */
  magnetStrength?: number;
  /** Radius of the magnetic field around the character center. */
  magnetRadius?: number;
}

export function MemoryHookCharacter({
  char,
  glyphClassName,
  className,
  label,
  onOpen,
  tooltipDisabled = false,
  tooltipDelayMs = 240,
  magnetStrength = 4,
  magnetRadius = 90,
}: MemoryHookCharacterProps) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);

  const [hoverCapable] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  const [armed, setArmed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipAbove, setTooltipAbove] = useState(true);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; top: number; bottom: number } | null>(null);
  const { hook, loaded: hookLoaded } = useMemoryHook(char, armed && !tooltipDisabled);

  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const springX = useSpring(magnetX, { stiffness: 300, damping: 21, mass: 0.6 });
  const springY = useSpring(magnetY, { stiffness: 300, damping: 21, mass: 0.6 });

  useEffect(() => {
    magnetX.set(0);
    magnetY.set(0);
  }, [char, magnetX, magnetY]);

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
  }, []);

  // A disabled popover never stays open (e.g. while the flashcard is dragged),
  // and the magnet rests too.
  useEffect(() => {
    if (tooltipDisabled) {
      setShowTooltip(false);
      setArmed(false);
      magnetX.set(0);
      magnetY.set(0);
    }
  }, [tooltipDisabled, magnetX, magnetY]);

  // Magnetic field: tracked on the window so the pull works around the
  // character (the field is wider than the glyph), not only on it. The
  // character center is cached and refreshed on scroll/resize/hover.
  useEffect(() => {
    if (!hoverCapable || reduceMotion) return;
    const updateCenter = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      centerRef.current = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : null;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || tooltipDisabled) {
        if (magnetX.get() !== 0) magnetX.set(0);
        if (magnetY.get() !== 0) magnetY.set(0);
        return;
      }
      const center = centerRef.current;
      if (!center) return;
      const dx = event.clientX - center.x;
      const dy = event.clientY - center.y;
      const distance = Math.hypot(dx, dy);
      if (distance > magnetRadius) {
        if (magnetX.get() !== 0) magnetX.set(0);
        if (magnetY.get() !== 0) magnetY.set(0);
        return;
      }
      // Gentle falloff: the tug stays small over most of the field and only
      // strengthens near the character, capped far below the glyph's size.
      const pull = Math.max(0, 1 - distance / magnetRadius) ** 1.25;
      const offsetX = Math.min(Math.abs(dx * pull), magnetStrength) * Math.sign(dx);
      const offsetY = Math.min(Math.abs(dy * pull), magnetStrength) * Math.sign(dy);
      magnetX.set(offsetX);
      magnetY.set(offsetY);
    };
    updateCenter();
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('resize', updateCenter);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', updateCenter);
    };
  }, [hoverCapable, reduceMotion, tooltipDisabled, magnetRadius, magnetStrength, magnetX, magnetY]);

  const showTooltipNow = () => {
    setShowTooltip(true);
    const rect = buttonRef.current?.getBoundingClientRect();
    setTooltipAbove(rect ? rect.top > 150 : true);
  };

  const arm = () => {
    setArmed(true);
    const rect = buttonRef.current?.getBoundingClientRect();
    centerRef.current = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : null;
    if (tooltipDisabled) return;
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      showTooltipNow();
    }, tooltipDelayMs);
  };

  const disarm = () => {
    setArmed(false);
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    setShowTooltip(false);
  };

  // Keep the portal popover anchored to the character (the flashcard back
  // face scrolls; the card itself can move between renders).
  const updateAnchor = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    setTooltipAnchor(rect ? { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom } : null);
  }, []);

  useEffect(() => {
    if (!showTooltip || tooltipDisabled) return;
    updateAnchor();
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);
    return () => {
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [showTooltip, tooltipDisabled, updateAnchor]);

  const accessibleBase = label ?? `Open character breakdown for ${char}`;
  const accessibleLabel =
    hookLoaded && hook ? `${accessibleBase}. Memory hook: ${hook.replace(/\*\*/g, '')}` : accessibleBase;

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={accessibleLabel}
      onPointerEnter={arm}
      onPointerLeave={disarm}
      onFocus={showTooltipNow}
      onBlur={disarm}
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.(char);
      }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-sm focus-ring-inline',
        className,
      )}
    >
      <motion.span
        style={{ x: springX, y: springY }}
        className={cn('block font-chinese', glyphClassName)}
      >
        {char}
      </motion.span>

      <MemoryHookPopover
        open={showTooltip && !tooltipDisabled}
        anchor={tooltipAnchor}
        above={tooltipAbove}
        hook={hook}
        loaded={hookLoaded}
        emptyText={<>No memory hook yet — this character&rsquo;s story will live here.</>}
        magneticX={springX}
        magneticY={springY}
      />
    </button>
  );
}
