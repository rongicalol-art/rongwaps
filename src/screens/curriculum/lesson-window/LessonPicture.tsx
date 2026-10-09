import { useRef, type PointerEvent } from 'react';
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

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const dx = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > SWIPE_PX) onSwipe(dx < 0 ? 1 : -1);
  };

  return (
    <div
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
        className={isIcon ? 'h-full w-full object-contain p-10' : 'h-full w-full object-cover object-center'}
      />
    </div>
  );
}
