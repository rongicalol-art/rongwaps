/**
 * Chinese webfonts are split into unicode-range slices (see
 * scripts/fonts/split-chinese-fonts.py). These helpers make sure the slice a
 * study window needs is already loaded before it paints.
 */

// Any glyph in slice 0 pulls the whole core slice.
const WARMUP_SAMPLE = '的一是不人我在有他中大上你好天';

/** First webfont of the active `--font-chinese` stack (skips the Latin UI face and the glyph-extras face). */
function resolvedChineseFamily(): string {
  const stack = getComputedStyle(document.documentElement).getPropertyValue('--font-chinese');
  const families = stack.split(',').map(f => f.trim()).filter(Boolean);
  return families.find(f => !/^["']?(Nunito|RW-Extras)["']?$/.test(f)) ?? '"Huninn"';
}

function loadFor(text: string): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  return document.fonts.load(`1em ${resolvedChineseFamily()}`, text);
}

/** After study intent, warm the selected font without competing with app startup. */
export function warmChineseFont(): void {
  if (typeof window === 'undefined' || !document.fonts?.load) return;
  const run = () => {
    loadFor(WARMUP_SAMPLE).catch(() => undefined);
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, {timeout: 3000});
  else setTimeout(run, 1500);
}

/** Resolves when the slice(s) for `text` are loaded, or after `timeoutMs`. Never rejects. */
export function whenFontReady(text: string, timeoutMs = 300): Promise<void> {
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    try {
      loadFor(text).then(done, done);
    } catch {
      done();
    }
  });
}
