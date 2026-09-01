export interface FolderColorOption {
  id: string;
  name: string;
  front: string;
  back: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  lightBg: string;
}

export const FOLDER_COLOR_PALETTE: FolderColorOption[] = [
  {
    id: 'blue',
    name: 'Sky Blue',
    front: '#1CB0F6',
    back: '#1899D6',
    accent: 'text-brand-primary',
    accentBg: 'bg-brand-primary',
    accentBorder: 'border-brand-primary-edge',
    lightBg: 'bg-brand-primary-soft',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    front: '#CE82FF',
    back: '#A855F7',
    accent: 'text-purple-600',
    accentBg: 'bg-[#CE82FF]',
    accentBorder: 'border-[#A855F7]',
    lightBg: 'bg-purple-50',
  },
  {
    id: 'green',
    name: 'Fresh Green',
    front: '#58CC02',
    back: '#46A302',
    accent: 'text-feedback-success',
    accentBg: 'bg-feedback-success',
    accentBorder: 'border-feedback-success-edge',
    lightBg: 'bg-feedback-success-surface',
  },
  {
    id: 'orange',
    name: 'Tangerine',
    front: '#FF9600',
    back: '#E58700',
    accent: 'text-brand-secondary',
    accentBg: 'bg-brand-secondary',
    accentBorder: 'border-brand-secondary-edge',
    lightBg: 'bg-[#FFEFDC]',
  },
  {
    id: 'coral',
    name: 'Coral Red',
    front: '#FF4B4B',
    back: '#EA2B2B',
    accent: 'text-feedback-danger',
    accentBg: 'bg-feedback-danger',
    accentBorder: 'border-feedback-danger-edge',
    lightBg: 'bg-feedback-danger-surface',
  },
  {
    id: 'teal',
    name: 'Mint Teal',
    front: '#00CD9C',
    back: '#00A880',
    accent: 'text-teal-600',
    accentBg: 'bg-[#00CD9C]',
    accentBorder: 'border-[#00A880]',
    lightBg: 'bg-teal-50',
  },
  {
    id: 'yellow',
    name: 'Amber Gold',
    front: '#FFC800',
    back: '#E0A900',
    accent: 'text-feedback-warning-edge',
    accentBg: 'bg-feedback-warning',
    accentBorder: 'border-feedback-warning-edge',
    lightBg: 'bg-[#FFF9E8]',
  },
  {
    id: 'pink',
    name: 'Blush Pink',
    front: '#FF64B4',
    back: '#E04090',
    accent: 'text-pink-600',
    accentBg: 'bg-[#FF64B4]',
    accentBorder: 'border-[#E04090]',
    lightBg: 'bg-pink-50',
  },
];

export const STARRED_FOLDER_COLOR: FolderColorOption = FOLDER_COLOR_PALETTE.find(c => c.id === 'yellow')!;
export const CUSTOM_CARDS_FOLDER_COLOR: FolderColorOption = FOLDER_COLOR_PALETTE.find(c => c.id === 'blue')!;

// Options presented to the user when creating custom folders (all 8 palette choices)
export const CUSTOM_FOLDER_OPTIONS = FOLDER_COLOR_PALETTE;

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
  // since Blue is already the default for built-in Custom Cards.
  const fallbackIndex = (index + 1) % FOLDER_COLOR_PALETTE.length;
  const defaultFallback = FOLDER_COLOR_PALETTE[fallbackIndex];

  if (!colorStr) return defaultFallback;

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
        };
      }
      if (parsed.accentBg) {
        // If it was the legacy hardcoded 'bg-brand-primary', assign a distinct cyclic color
        if (parsed.accentBg === 'bg-brand-primary') {
          return defaultFallback;
        }
        const byBg = FOLDER_COLOR_PALETTE.find(c => c.accentBg === parsed.accentBg);
        if (byBg) return byBg;
      }
    }
  } catch {
    // Not JSON, continue to string match
  }

  // 3. Hex code match (e.g. '#CE82FF')
  if (colorStr.startsWith('#')) {
    const byHex = getFolderColorOption(colorStr);
    if (byHex) return byHex;
  }

  return defaultFallback;
}
