import { useEffect, useState } from 'react';

/**
 * Glyph-support probes rasterize pixels, which is far too expensive to repeat
 * for every CharacterGlyph on screen (one list can mount dozens at once).
 * Results are memoized per unique character + Chinese font stack so every
 * character costs at most one probe per page load, shared by all instances.
 */
const glyphSupportCache = new Map<string, boolean>();

let sharedProbeContext: CanvasRenderingContext2D | null | undefined;

function getSharedProbeContext(): CanvasRenderingContext2D | null {
  if (sharedProbeContext === undefined) {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 72;
    sharedProbeContext = canvas.getContext('2d', { willReadFrequently: true });
  }
  return sharedProbeContext;
}

function renderSignature(context: CanvasRenderingContext2D, glyph: string): Uint8ClampedArray {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.fillText(glyph, 4, 4);
  return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
}

function signaturesMatch(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function supportCacheKey(chineseFonts: string, character: string): string {
  return `${chineseFonts}\u0000${character}`;
}

/** Cache-only lookup; undefined means "not probed yet this page load". */
function peekGlyphSupport(character: string): boolean | undefined {
  if (typeof document === 'undefined') return undefined;
  const chineseFonts = getComputedStyle(document.documentElement).getPropertyValue('--font-chinese').trim();
  return glyphSupportCache.get(supportCacheKey(chineseFonts, character));
}

function resolveGlyphSupport(character: string): boolean {
  if (typeof document === 'undefined') return true;
  const chineseFonts = getComputedStyle(document.documentElement).getPropertyValue('--font-chinese').trim();
  const cacheKey = supportCacheKey(chineseFonts, character);
  const cached = glyphSupportCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const context = getSharedProbeContext();
  let supported = true;
  if (context) {
    context.font = `52px ${chineseFonts || 'serif'}`;
    context.textBaseline = 'top';
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-ui-ink').trim() || 'black';
    const target = renderSignature(context, character);
    const missingA = renderSignature(context, '\u0378');
    const missingB = renderSignature(context, '\u0380');
    supported = !signaturesMatch(target, missingA) && !signaturesMatch(target, missingB);
  }
  glyphSupportCache.set(cacheKey, supported);
  return supported;
}

export function CharacterGlyph({ character, className = '' }: { character: string; className?: string }) {
  // Optimistically render the real glyph; flip to the Rare fallback only once a
  // probe proves this device cannot render it. Nothing blocks first paint.
  const [probeResult, setProbeResult] = useState<boolean | null>(() => peekGlyphSupport(character) ?? null);

  useEffect(() => {
    setProbeResult(peekGlyphSupport(character) ?? null);
    let active = true;
    const check = async () => {
      if (typeof document !== 'undefined' && 'fonts' in document) await document.fonts.ready;
      if (active) setProbeResult(resolveGlyphSupport(character));
    };
    void check();
    return () => { active = false; };
  }, [character]);

  if (probeResult !== false) {
    return <span className={`font-chinese ${className}`}>{character}</span>;
  }

  // The Rare fallback keeps the caller's layout classes (slot width, centering)
  // but not its typography, so the label sits centered in the glyph slot.
  const layoutClasses = className
    .split(' ')
    .filter((c) => c && !c.startsWith('text-') && !c.startsWith('font-'))
    .join(' ');
  return (
    <span
      className={`inline-flex min-w-10 items-center justify-center font-sans text-[10px] font-black uppercase tracking-wide text-ui-muted ${layoutClasses}`}
      aria-label="Rare character; glyph unavailable on this device"
      title="Rare character — glyph unavailable on this device"
    >
      Rare
    </span>
  );
}
