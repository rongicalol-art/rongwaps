import { cn } from '../../../utils/cn';
import type { ToneMark } from '../data/types';

export const TONE_NAMES: Record<ToneMark, string> = {
  1: 'High',
  2: 'Rising',
  3: 'Low',
  4: 'Falling',
};

export const TONE_PATHS: Record<ToneMark, string> = {
  1: 'M14 15H86',
  2: 'M14 45Q56 32 86 14',
  3: 'M14 38C40 52 62 54 86 28',
  4: 'M14 14L86 48',
};

export const TONE_MARK_SVGS: Record<ToneMark, string> = {
  1: 'M2 5H24',
  2: 'M4 8L22 2',
  3: 'M3 2L13 8L23 2',
  4: 'M4 2L22 8',
};

interface ToneContourProps {
  tone: ToneMark;
  className?: string;
  showStaff?: boolean;
  strokeWidth?: number;
  toneColored?: boolean;
}

export function ToneContour({
  tone,
  className,
  showStaff = true,
  strokeWidth = 5.5,
  toneColored = false,
}: ToneContourProps) {
  return (
    <svg viewBox="0 0 100 62" fill="none" className={cn('shrink-0', className)} aria-hidden="true">
      {showStaff && (
        <g className="stroke-ui-divider" strokeWidth={1.6} strokeDasharray="1 5" strokeLinecap="round">
          <line x1="10" y1="14" x2="90" y2="14" />
          <line x1="10" y1="31" x2="90" y2="31" />
          <line x1="10" y1="48" x2="90" y2="48" />
        </g>
      )}
      <path
        d={TONE_PATHS[tone]}
        stroke={toneColored ? 'var(--sh-tone)' : 'var(--color-brand-primary)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ToneMarkGlyph({ tone, className }: { tone: ToneMark; className?: string }) {
  return (
    <svg viewBox="0 0 26 10" fill="none" className={cn('overflow-visible', className)} aria-hidden="true">
      <path d={TONE_MARK_SVGS[tone]} stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const VOWEL_MARKS: Record<string, Record<ToneMark, string>> = {
  a: { 1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à' },
  o: { 1: 'ō', 2: 'ó', 3: 'ǒ', 4: 'ò' },
  e: { 1: 'ē', 2: 'é', 3: 'ě', 4: 'è' },
  i: { 1: 'ī', 2: 'í', 3: 'ǐ', 4: 'ì' },
  u: { 1: 'ū', 2: 'ú', 3: 'ǔ', 4: 'ù' },
  ü: { 1: 'ǖ', 2: 'ǘ', 3: 'ǚ', 4: 'ǜ' },
};

/** Returns standard toned pinyin string using official Hanyu Pinyin tone placement rules. */
export function applyToneToFinal(finalPart: string, tone: ToneMark): string {
  const lower = finalPart.toLowerCase();
  let targetIdx = lower.indexOf('a');
  if (targetIdx === -1) targetIdx = lower.indexOf('o');
  if (targetIdx === -1) targetIdx = lower.indexOf('e');
  if (targetIdx === -1) {
    const iu = lower.indexOf('iu');
    if (iu !== -1) {
      targetIdx = iu + 1;
    } else {
      for (let i = 0; i < lower.length; i += 1) {
        if ('iuü'.includes(lower[i])) {
          targetIdx = i;
          break;
        }
      }
    }
  }
  if (targetIdx === -1) return finalPart;
  const ch = finalPart[targetIdx];
  const mapped = VOWEL_MARKS[ch.toLowerCase()]?.[tone];
  if (!mapped) return finalPart;
  return finalPart.slice(0, targetIdx) + mapped + finalPart.slice(targetIdx + 1);
}

export function findToneVowelIndex(finalPart: string): number {
  const lower = finalPart.toLowerCase();
  for (const v of ['a', 'o', 'e']) {
    const idx = lower.indexOf(v);
    if (idx !== -1) return idx;
  }
  const iu = lower.indexOf('iu');
  if (iu !== -1) return iu + 1;
  for (let i = 0; i < lower.length; i += 1) {
    if ('iuü'.includes(lower[i])) return i;
  }
  return 0;
}

interface DecomposedSyllableProps {
  initial?: string;
  finalPart?: string;
  tone?: ToneMark | null;
  litIni?: boolean;
  litFin?: boolean;
  litTone?: boolean;
  hideToneMark?: boolean;
  dropDots?: boolean;
  onTapPart?: (part: 'ini' | 'fin' | 'tone') => void;
  sizeClass?: string;
  className?: string;
}

export function DecomposedSyllable({
  initial = '',
  finalPart = '',
  tone = null,
  litIni = false,
  litFin = false,
  litTone = false,
  hideToneMark = false,
  dropDots = false,
  onTapPart,
  sizeClass = 'text-[88px] md:text-[100px]',
  className,
}: DecomposedSyllableProps) {
  const renderedFinal = dropDots && finalPart.includes('ü') ? finalPart.replace(/ü/g, 'u') : finalPart;
  const toneIdx = renderedFinal ? findToneVowelIndex(renderedFinal) : 0;

  return (
    <div
      className={cn(
        'flex items-end justify-center font-extrabold leading-[1.15] text-ui-ink-strong select-none',
        sizeClass,
        className,
      )}
    >
      {initial && (
        <span
          role={onTapPart ? 'button' : undefined}
          tabIndex={onTapPart ? 0 : undefined}
          onClick={onTapPart ? () => onTapPart('ini') : undefined}
          onKeyDown={
            onTapPart
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTapPart('ini');
                  }
                }
              : undefined
          }
          style={{ color: litIni ? 'var(--sh-ini)' : undefined }}
          className={cn('transition-colors duration-200', onTapPart && 'cursor-pointer')}
        >
          {initial}
        </span>
      )}
      {renderedFinal && (
        <span className="inline-flex items-end">
          {Array.from(renderedFinal).map((ch, idx) => {
            const isToneHost = idx === toneIdx && tone !== null && !hideToneMark;
            if (!isToneHost) {
              return (
                <span
                  key={`${ch}-${idx}`}
                  role={onTapPart ? 'button' : undefined}
                  onClick={onTapPart ? () => onTapPart('fin') : undefined}
                  style={{ color: litFin ? 'var(--sh-fin)' : undefined }}
                  className={cn('transition-colors duration-200', onTapPart && 'cursor-pointer')}
                >
                  {ch === 'i' ? 'ı' : ch}
                </span>
              );
            }
            const baseChar = ch === 'i' ? 'ı' : ch;
            return (
              <span key={`${ch}-${idx}`} className="relative inline-flex flex-col items-center">
                {tone && (
                  <span
                    role={onTapPart ? 'button' : undefined}
                    onClick={
                      onTapPart
                        ? (e) => {
                            e.stopPropagation();
                            onTapPart('tone');
                          }
                        : undefined
                    }
                    style={{ color: litTone ? 'var(--sh-tone)' : undefined }}
                    // Sits just above the vowel's x-height, the way a printed tone mark does (above the dots of ü).
                    className={cn(
                      'relative z-10 block h-[0.16em] w-[0.34em] transition-colors duration-200',
                      ch === 'ü' ? '-mb-[0.4em]' : '-mb-[0.52em]',
                      onTapPart && 'cursor-pointer',
                    )}
                  >
                    <ToneMarkGlyph tone={tone} className="h-full w-full" />
                  </span>
                )}
                <span
                  role={onTapPart ? 'button' : undefined}
                  onClick={onTapPart ? () => onTapPart('fin') : undefined}
                  style={{ color: litFin ? 'var(--sh-fin)' : undefined }}
                  className={cn('block transition-colors duration-200', onTapPart && 'cursor-pointer')}
                >
                  {baseChar}
                </span>
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
