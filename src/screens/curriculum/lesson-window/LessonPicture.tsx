import { useRef, type PointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';

const SWIPE_PX = 40;

interface LessonPictureProps {
  src: string;
  /** Icon-style fallback art is shown whole and centred instead of filling the frame. */
  isIcon?: boolean;
  /** Swipe left (+1) or right (-1) changes the part. */
  onSwipe: (step: 1 | -1) => void;
  className?: string;
}

/** The lesson's reading illustration at 16:9; nothing overlays it. */
export function LessonPicture({ src, isIcon = false, onSwipe, className }: LessonPictureProps) {
  const startX = useRef<number | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // The picture leans a few px toward a mouse pointer (the frame crops the 5% it grows by). Touch and icons stay still.
  const lean = !isIcon && !reduceMotion;
  const leanTo = (x: number, y: number) => {
    frame.current?.style.setProperty('--lean-x', `${x}px`);
    frame.current?.style.setProperty('--lean-y', `${y}px`);
  };
  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!lean || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    leanTo(((event.clientX - rect.left) / rect.width - 0.5) * -12, ((event.clientY - rect.top) / rect.height - 0.5) * -8);
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > SWIPE_PX) onSwipe(dx < 0 ? 1 : -1);
  };

  return (
    <div
      ref={frame}
      onPointerMove={handleMove}
      onPointerLeave={() => leanTo(0, 0)}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        startX.current = event.clientX;
      }}
      onPointerUp={handleUp}
      onPointerCancel={() => { startX.current = null; }}
      className={cn('relative aspect-video w-full shrink-0 touch-pan-y select-none overflow-hidden bg-ui-hover', className)}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className={isIcon ? 'h-full w-full object-contain p-10' : cn('h-full w-full object-cover object-center', lean && 'transition-transform duration-[1100ms] ease-out [transform:scale(1.05)_translate(var(--lean-x,0px),var(--lean-y,0px))]')}
      />
    </div>
  );
}
