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
      <path d="M2 12Q2 2 12 2H28Q34 2 37 9Q39 14 45 14H90Q98 14 98 22V72Q98 82 88 82H12Q2 82 2 72Z" fill={colorBack} />
      <path d="M2 26Q2 17 11 17H89Q98 17 98 26V68Q98 77 89 77H11Q2 77 2 68Z" fill={colorFront} />
      {isStarred && (
        <path
          d="M50 32l5.4 11 12 1.7-8.7 8.5 2.1 12L50 59.4 39.2 65.2l2.1-12-8.7-8.5 12-1.7z"
          fill="#FFFFFF"
          opacity="0.38"
        />
      )}
      {hasPlus && (
        <path d="M50 34v26M37 47h26" stroke="#86A3B5" strokeWidth="7" strokeLinecap="round" />
      )}
    </svg>
  );
}
