import { useState } from 'react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import type { TeachHook } from '../../../../types/hookPieces';
import { strokeInRanges } from '../../../../utils/characters/hookPieces';
import { PiecePainting, paintToneForJob } from '../../../character-memory-hooks';
import { CharacterHeroPanel } from './CharacterHeroPanel';

/**
 * Hero for a character with a memory hook: the character painted by piece job
 * (amber meaning, blue sound). Tap it to watch the stroke order.
 */
export function PieceHero({ teach, accentHex }: { teach: TeachHook; accentHex?: string }) {
  const size = useMediaQuery('(min-width: 640px)') ? 208 : 128;
  const [animating, setAnimating] = useState(false);

  if (animating) return <CharacterHeroPanel character={teach.char} accentHex={accentHex} />;
  return (
    <button
      type="button"
      aria-label={`Play stroke order for ${teach.char}`}
      onClick={() => setAnimating(true)}
      style={{ width: size, height: size }}
      className="relative shrink-0 overflow-hidden rounded-feature border-2 border-b-[length:var(--depth-xl)] border-ui-divider bg-ui-surface focus-ring"
    >
      <PiecePainting
        char={teach.char}
        toneOf={(stroke) => {
          const piece = teach.pieces.find((item) => strokeInRanges(item.strokes, stroke));
          return piece ? paintToneForJob(piece.job) : 'rest';
        }}
        className="absolute inset-[9%] h-[82%] w-[82%] text-[88px] sm:text-[140px]"
      />
      <svg viewBox="0 0 14 14" aria-hidden="true" className="absolute bottom-2 right-2 h-3.5 w-3.5 fill-ui-muted"><path d="M2 1l11 6-11 6z" /></svg>
    </button>
  );
}
