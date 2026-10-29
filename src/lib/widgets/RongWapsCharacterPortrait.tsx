import React from 'react';
import { cn } from '../../utils/cn';
import type { RongWapsCharacter } from '../../types/models';

const PORTRAITS: Record<RongWapsCharacter, string> = {
  meixin: new URL('../../assets/images/characters/portraits/meixin.webp', import.meta.url).href,
  ryosuke: new URL('../../assets/images/characters/portraits/ryosuke.webp', import.meta.url).href,
  kexin: new URL('../../assets/images/characters/portraits/kexin.webp', import.meta.url).href,
  yifan: new URL('../../assets/images/characters/portraits/yifan.webp', import.meta.url).href,
  mingsheng: new URL('../../assets/images/characters/portraits/mingsheng.webp', import.meta.url).href,
  ryusuke: new URL('../../assets/images/characters/portraits/ryusuke.webp', import.meta.url).href,
  mrsWang: new URL('../../assets/images/characters/portraits/mrsWang.webp', import.meta.url).href,
  book2Classmate: new URL('../../assets/images/characters/portraits/book2Classmate.webp', import.meta.url).href,
  electronicsClerk: new URL('../../assets/images/characters/portraits/electronicsClerk.webp', import.meta.url).href,
  confucius: new URL('../../assets/images/characters/portraits/confucius.webp', import.meta.url).href,
  zilu: new URL('../../assets/images/characters/portraits/zilu.webp', import.meta.url).href,
  book2ChildA: new URL('../../assets/images/characters/portraits/book2ChildA.webp', import.meta.url).href,
  book2ChildB: new URL('../../assets/images/characters/portraits/book2ChildB.webp', import.meta.url).href,

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
  tomoko: new URL('../../assets/images/characters/portraits/tomoko.webp', import.meta.url).href,
  dongxian: new URL('../../assets/images/characters/portraits/dongxian.webp', import.meta.url).href,
  shawn: new URL('../../assets/images/characters/portraits/shawn.webp', import.meta.url).href,
  mary: new URL('../../assets/images/characters/portraits/mary.webp', import.meta.url).href,
  fangcao: new URL('../../assets/images/characters/portraits/fangcao.webp', import.meta.url).href,
  jiahao: new URL('../../assets/images/characters/portraits/jiahao.webp', import.meta.url).href,
  mingzhe: new URL('../../assets/images/characters/portraits/mingzhe.webp', import.meta.url).href,
  managerWang: new URL('../../assets/images/characters/portraits/managerWang.webp', import.meta.url).href,
  officeStaff: new URL('../../assets/images/characters/portraits/officeStaff.webp', import.meta.url).href,
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
        className="h-full w-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}
