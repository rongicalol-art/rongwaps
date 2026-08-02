import type { HTMLAttributes } from 'react';
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

interface CharacterCrop {
  sheet: 'main' | 'supporting';
  column: 0 | 1 | 2;
  row: 0 | 1;
}

const CHARACTER_CROPS: Record<RongWapsCharacter, CharacterCrop> = {
  youmei: { sheet: 'main', column: 0, row: 0 },
  zhongming: { sheet: 'main', column: 1, row: 0 },
  yiwen: { sheet: 'main', column: 2, row: 0 },
  guoan: { sheet: 'main', column: 0, row: 1 },
  yuanzhen: { sheet: 'main', column: 1, row: 1 },
  jiale: { sheet: 'main', column: 2, row: 1 },
  teacher: { sheet: 'supporting', column: 0, row: 0 },
  parent: { sheet: 'supporting', column: 1, row: 0 },
  doctor: { sheet: 'supporting', column: 2, row: 0 },
  cafeWorker: { sheet: 'supporting', column: 0, row: 1 },
  apartmentAgent: { sheet: 'supporting', column: 1, row: 1 },
  neighbor: { sheet: 'supporting', column: 2, row: 1 },
};

const SHEETS = {
  main: new URL('../../assets/images/characters/rongwaps-main-cast-app.jpg', import.meta.url).href,
  supporting: new URL('../../assets/images/characters/rongwaps-supporting-cast-app.jpg', import.meta.url).href,
} as const;

export interface RongWapsCharacterPortraitProps extends HTMLAttributes<HTMLDivElement> {
  character: RongWapsCharacter;
  label: string;
}

export function RongWapsCharacterPortrait({
  character,
  label,
  className,
  ...props
}: RongWapsCharacterPortraitProps) {
  const crop = CHARACTER_CROPS[character];

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative aspect-square overflow-hidden bg-ui-surface', className)}
      {...props}
    >
      <img
        src={SHEETS[crop.sheet]}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{
          width: '306%',
          left: `${-(crop.column * 102 + 1)}%`,
          top: `${-(crop.row * 102 + 1)}%`,
        }}
      />
    </div>
  );
}
