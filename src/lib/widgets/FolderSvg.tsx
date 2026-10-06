import { cn } from '../../utils/cn';

/** Library folder glyph: back tab + front face. `hasPlus` = new-folder tile, `isStarred` = starred folder. */
export function FolderSvg({
  colorFront,
  colorBack,
  hasPlus,
  isStarred,
  className,
}: {
  colorFront: string;
  colorBack: string;
  hasPlus?: boolean;
  isStarred?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 84" className={cn("h-full w-full", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 0 h 14 c 2 0 4 1 5 3 l 3 7 c 1.5 3.5 3.5 6 6 6 h 52 c 6.6 0 12 5.4 12 12 v 44 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 v -64 c 0 -4.4 3.6 -8 8 -8 z"
        fill={colorBack}
      />
      <path
        d="M0 32 c 0 -6.6 5.4 -12 12 -12 h 76 c 6.6 0 12 5.4 12 12 v 40 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 z"
        fill={colorBack}
      />
      <path
        d="M0 28 c 0 -6.6 5.4 -12 12 -12 h 76 c 6.6 0 12 5.4 12 12 v 40 c 0 6.6 -5.4 12 -12 12 h -76 c -6.6 0 -12 -5.4 -12 -12 z"
        fill={colorFront}
      />
      {isStarred && (
        <path
          d="M50 34l4.1 8.3 9.2 1.3-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z"
          fill="#FFFFFF"
          opacity="0.32"
        />
      )}
      {hasPlus && (
        <path d="M50 38v20m-10-10h20" stroke="#7BA3B5" strokeWidth="6" strokeLinecap="round" />
      )}
    </svg>
  );
}
