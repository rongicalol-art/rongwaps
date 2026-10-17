import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { StrokeOrderBox } from '../StrokeOrderBox';

/** The breakdown's hero: always the stroke-order canvas, looping; tap it to replay. */
export function CharacterHeroPanel({ character, accentHex }: { character: string; accentHex?: string }) {
  const size = useMediaQuery('(min-width: 640px)') ? 208 : 128;
  return (
    <StrokeOrderBox
      char={character}
      size={size}
      accentHex={accentHex}
      className="shrink-0 border-2 border-b-[length:var(--depth-xl)] border-ui-divider bg-ui-surface"
    />
  );
}
