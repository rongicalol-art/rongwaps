import { debugLogger } from './debug/debugLogger';

export interface FolderColorOption {
  id: string;
  name: string;
  front: string;
  back: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  lightBg: string;
  /** Text colour for content sitting on the accent fill (e.g. the Study button). */
  onAccent: string;
}

export const FOLDER_COLOR_PALETTE: FolderColorOption[] = [
  {
    id: 'blue',
    name: 'Sky Blue',
    front: '#3A7CA5',
    back: '#2C6385',
    accent: 'text-brand-primary',
    accentBg: 'bg-brand-primary',
    accentBorder: 'border-brand-primary-edge',
    lightBg: 'bg-brand-primary-soft',
    onAccent: 'text-white',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    front: '#B58AD6',
    back: '#9568B8',
    accent: 'text-palette-purple-text',
    accentBg: 'bg-palette-purple',
    accentBorder: 'border-palette-purple-edge',
    lightBg: 'bg-palette-purple-soft',
    onAccent: 'text-ui-ink-strong',
  },
  {
    id: 'green',
    name: 'Fresh Green',
    front: '#4F9F2A',
    back: '#3F8420',
    accent: 'text-feedback-success',
    accentBg: 'bg-feedback-success',
    accentBorder: 'border-feedback-success-edge',
    lightBg: 'bg-feedback-success-surface',
    onAccent: 'text-white',
  },
  {
    id: 'orange',
    name: 'Tangerine',
    front: '#D4793A',
    back: '#B05F27',
    accent: 'text-brand-secondary',
    accentBg: 'bg-brand-secondary',
    accentBorder: 'border-brand-secondary-edge',
    lightBg: 'bg-brand-secondary-soft',
    onAccent: 'text-white',
  },
  {
    id: 'coral',
    name: 'Coral Red',
    front: '#D9605A',
    back: '#B84842',
    accent: 'text-feedback-danger',
    accentBg: 'bg-feedback-danger',
    accentBorder: 'border-feedback-danger-edge',
    lightBg: 'bg-feedback-danger-surface',
    onAccent: 'text-white',
  },
  {
    id: 'teal',
    name: 'Mint Teal',
    front: '#3FB59A',
    back: '#2F9580',
    accent: 'text-palette-teal-text',
    accentBg: 'bg-palette-teal',
    accentBorder: 'border-palette-teal-edge',
    lightBg: 'bg-palette-teal-soft',
    onAccent: 'text-ui-ink-strong',
  },
  {
    id: 'yellow',
    name: 'Amber Gold',
    front: '#E3B23C',
    back: '#C4952A',
    accent: 'text-feedback-warning-text',
    accentBg: 'bg-feedback-warning',
    accentBorder: 'border-feedback-warning-edge',
    lightBg: 'bg-feedback-warning-surface',
    onAccent: 'text-ui-ink-strong',
  },
  {
    id: 'pink',
    name: 'Blush Pink',
    front: '#DB74A6',
    back: '#BC5688',
    accent: 'text-palette-pink-text',
    accentBg: 'bg-palette-pink',
    accentBorder: 'border-palette-pink-edge',
    lightBg: 'bg-palette-pink-soft',
    onAccent: 'text-ui-ink-strong',
  },
];

export const STARRED_FOLDER_COLOR: FolderColorOption = FOLDER_COLOR_PALETTE.find(c => c.id === 'yellow')!;

export function getFolderColorOption(idOrColor?: string): FolderColorOption | undefined {
  if (!idOrColor) return undefined;
  const lower = idOrColor.toLowerCase();
  return FOLDER_COLOR_PALETTE.find(
    (c) => c.id.toLowerCase() === lower || c.front.toLowerCase() === lower
  );
}

/**
 * Resolves a folder's color definition into a comprehensive FolderColorOption.
 * Handles palette IDs, raw hex codes, legacy JSON structures, and provides
 * a cyclic fallback so distinct folders receive distinct colors.
 */
export function resolveFolderColor(colorStr: string | undefined, index = 0): FolderColorOption {
  // Cyclic fallback: offsets by 1 so the first custom folder defaults to Purple (index 0 -> Purple)
  // (kept so existing folders keep the colours they already show).
  const fallbackIndex = (index + 1) % FOLDER_COLOR_PALETTE.length;
  const defaultFallback = FOLDER_COLOR_PALETTE[fallbackIndex];

  if (!colorStr) return defaultFallback;
  // Runtime guard: legacy/cloud data has held non-string color payloads.
  if (typeof colorStr !== 'string') return defaultFallback;

  // 1. Direct palette ID match (e.g. 'purple', 'teal')
  const directMatch = getFolderColorOption(colorStr);
  if (directMatch) return directMatch;

  // 2. Parse JSON if applicable
  try {
    const parsed = JSON.parse(colorStr);
    if (parsed && typeof parsed === 'object') {
      if (parsed.colorId) {
        const byId = getFolderColorOption(parsed.colorId);
        if (byId) return byId;
      }
      if (parsed.front && parsed.back) {
        const byFront = getFolderColorOption(parsed.front);
        if (byFront) return byFront;
        return {
          id: 'custom',
          name: 'Custom',
          front: parsed.front,
          back: parsed.back,
          accent: parsed.accent || 'text-brand-primary',
          accentBg: parsed.accentBg || 'bg-brand-primary',
          accentBorder: parsed.accentBorder || 'border-brand-primary-edge',
          lightBg: parsed.lightBg || 'bg-ui-canvas',
          onAccent: parsed.onAccent || 'text-white',
        };
      }
      if (parsed.accentBg) {
        // If it was the legacy hardcoded 'bg-brand-primary', assign a distinct cyclic color
        if (parsed.accentBg === 'bg-brand-primary') {
          return defaultFallback;
        }
        const byBg = FOLDER_COLOR_PALETTE.find(
          (c) =>
            c.accentBg === parsed.accentBg ||
            parsed.accentBg.includes(c.id) ||
            parsed.accentBg.includes(c.front)
        );
        if (byBg) return byBg;
      }
    }
  } catch (error) {
    // Intentional fallback: colorStr is not a JSON object, continue to string match
    debugLogger.warn('App', 'Folder color value is not a JSON object; continuing with string match', error);
  }

  // 3. Hex code match (e.g. '#B58AD6')
  if (colorStr.startsWith('#')) {
    const byHex = getFolderColorOption(colorStr);
    if (byHex) return byHex;
  }

  return defaultFallback;
}

/** The persisted JSON string for a folder's chosen palette color. */
export function serializeFolderColor(colorId: string): string {
  const { id, front, back, accentBg, accentBorder, accent } = resolveFolderColor(colorId);
  return JSON.stringify({ colorId: id, front, back, accentBg, accentBorder, accent });
}
