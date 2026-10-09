/**
 * DEV-only visual-instability monitor. Records layout shifts and late font
 * loads so perf scripts (output/perf) can read them from `window`.
 *   window.__rwShifts  layout-shift entries with source elements
 *   window.__rwFonts   font faces as they finish loading
 *   window.__rwMark(l) push a labelled marker into both lists (segments runs)
 */

interface RectLike { x: number; y: number; w: number; h: number }
interface ShiftSource { node: string; prev: RectLike; curr: RectLike }
interface ShiftRecord { type: 'shift'; t: number; value: number; hadInput: boolean; sources: ShiftSource[] }
interface FontRecord { type: 'font'; t: number; family: string; weight: string; style: string; status: string }
interface MarkRecord { type: 'mark'; t: number; label: string }

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[];
}

declare global {
  interface Window {
    __rwShifts?: (ShiftRecord | MarkRecord)[];
    __rwFonts?: (FontRecord | MarkRecord)[];
    __rwMark?: (label: string) => void;
  }
}

const rect = (r: DOMRectReadOnly): RectLike => ({
  x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
});

function describe(node: Node | null): string {
  if (!node) return '(removed)';
  const el = node instanceof Element ? node : node.parentElement;
  if (!el) return '(detached)';
  const cls = typeof el.className === 'string'
    ? el.className.trim().split(/\s+/).slice(0, 3).join('.')
    : '';
  const text = (el.textContent ?? '').trim().slice(0, 20);
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}${text ? ` "${text}"` : ''}`;
}

export function startLayoutShiftMonitor(): void {
  if (window.__rwShifts) return;
  const shifts: (ShiftRecord | MarkRecord)[] = (window.__rwShifts = []);
  const fonts: (FontRecord | MarkRecord)[] = (window.__rwFonts = []);

  window.__rwMark = (label) => {
    const rec: MarkRecord = { type: 'mark', t: performance.now(), label };
    shifts.push(rec);
    fonts.push(rec);
  };

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as LayoutShiftEntry[]) {
        shifts.push({
          type: 'shift',
          t: e.startTime,
          value: e.value,
          hadInput: e.hadRecentInput,
          sources: (e.sources ?? []).map((s) => ({
            node: describe(s.node), prev: rect(s.previousRect), curr: rect(s.currentRect),
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* layout-shift unsupported (Safari/Firefox) */ }

  document.fonts?.addEventListener('loadingdone', (ev) => {
    const t = performance.now();
    for (const f of (ev as FontFaceSetLoadEvent).fontfaces) {
      fonts.push({ type: 'font', t, family: f.family, weight: f.weight, style: f.style, status: f.status });
    }
  });
}
