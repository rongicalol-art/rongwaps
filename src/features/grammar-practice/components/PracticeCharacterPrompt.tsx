import { useEffect, type ReactNode } from 'react';
import type { PracticeStatus } from '../practiceTypes';

const POSES = {
  speaking: new URL('../../../assets/images/characters/practice/yiwen-speaking.webp', import.meta.url).href,
  waiting: new URL('../../../assets/images/characters/practice/yiwen-waiting.webp', import.meta.url).href,
  celebrating: new URL('../../../assets/images/characters/practice/yiwen-celebrating.webp', import.meta.url).href,
};

/** The focused prompt shared by sentence building and recorded listening. */
export function PracticeCharacterPrompt({
  children, status, waiting = false, speaking = false,
}: {
  children: ReactNode;
  status: PracticeStatus;
  waiting?: boolean;
  speaking?: boolean;
}) {
  // Warm the three poses before a reaction so feedback never flashes an empty figure.
  useEffect(() => {
    Object.values(POSES).forEach((src) => { const image = new Image(); image.src = src; });
  }, []);
  const pose = status === 'correct' ? 'celebrating' : speaking ? 'speaking' : waiting || status === 'wrong' ? 'waiting' : 'speaking';

  return (
    <div className="grid w-full grid-cols-[112px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[165px_minmax(0,1fr)] sm:gap-4">
      <img
        src={POSES[pose]}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={1010}
        height={1557}
        className="pointer-events-none h-[180px] w-28 select-none object-contain sm:h-[248px] sm:w-[165px]"
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
