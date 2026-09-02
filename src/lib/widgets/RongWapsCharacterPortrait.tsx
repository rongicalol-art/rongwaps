import React from 'react';
import { cn } from '../../utils/cn';

export type RongWapsCharacter =
  | 'youmei'
  | 'zhongming'
  | 'yiwen'
  | 'guoan'
  | 'yuanzhen'
  | 'jiale'
  | 'teacher'
  | 'parent'
  | 'doctor'
  | 'cafeWorker'
  | 'apartmentAgent'
  | 'neighbor';

const PORTRAITS: Record<RongWapsCharacter, string> = {
  youmei: new URL('../../assets/images/characters/portraits/youmei.webp', import.meta.url).href,
  zhongming: new URL('../../assets/images/characters/portraits/zhongming.webp', import.meta.url).href,
  yiwen: new URL('../../assets/images/characters/portraits/yiwen.webp', import.meta.url).href,
  guoan: new URL('../../assets/images/characters/portraits/guoan.webp', import.meta.url).href,
  yuanzhen: new URL('../../assets/images/characters/portraits/yuanzhen.webp', import.meta.url).href,
  jiale: new URL('../../assets/images/characters/portraits/jiale.webp', import.meta.url).href,
  teacher: new URL('../../assets/images/characters/portraits/teacher.webp', import.meta.url).href,
  parent: new URL('../../assets/images/characters/portraits/parent.webp', import.meta.url).href,
  doctor: new URL('../../assets/images/characters/portraits/doctor.webp', import.meta.url).href,
  cafeWorker: new URL('../../assets/images/characters/portraits/cafeWorker.webp', import.meta.url).href,
  apartmentAgent: new URL('../../assets/images/characters/portraits/apartmentAgent.webp', import.meta.url).href,
  neighbor: new URL('../../assets/images/characters/portraits/neighbor.webp', import.meta.url).href,
};

export interface RongWapsCharacterPortraitProps extends React.HTMLAttributes<HTMLDivElement> {
  character: RongWapsCharacter;
  label: string;
}

export function RongWapsCharacterPortrait({
  character,
  label,
  className,
  ...props
}: RongWapsCharacterPortraitProps) {
  const portraitUrl = PORTRAITS[character];

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative aspect-square overflow-hidden bg-transparent', className)}
      {...props}
    >
      <img
        src={portraitUrl}
        alt={label}
        draggable={false}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover select-none pointer-events-none scale-[1.24] translate-y-[6%]"
      />
    </div>
  );
}
