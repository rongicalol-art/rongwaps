/**
 * Semantic lint rules for the Jev lint gate (`scripts/jev/lintRules.ts`).
 *
 * ESLint owns syntax; these rules own meaning — the AGENTS.md conventions that
 * regexes cannot decide. Each rule is one yes/no judgment over the changed
 * code. `trigger` is matched against added/removed lines only, so untouched
 * context lines do not fire questions. `threshold` is the minimum probability
 * that the rule HOLDS; answers below it are violations.
 *
 * Rule 9 (docs describe existing architecture) is intentionally absent: it
 * needs the whole change set plus the codebase, not one file's diff.
 */

export interface LintRule {
  id: string;
  title: string;
  appliesTo: string[];
  trigger: RegExp;
  instructions: string;
  trueCriteria: string;
  falseCriteria: string;
  threshold: number;
}

const UI_SOURCES = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.css'];

export const LINT_RULES: LintRule[] = [
  {
    id: 'no-hardcoded-color',
    title: 'No hardcoded colors',
    appliesTo: UI_SOURCES,
    trigger: /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bcolor-mix\(/,
    instructions:
      'Does the code changed in `file.diff` avoid introducing hardcoded colors? Hardcoded colors are literal hex codes, rgb()/hsl() values, or Tailwind arbitrary values such as `bg-[#fff]`. The project rule is semantic tokens only (`ui-*`, `brand-*`, `feedback-*`; see docs/DESIGN_TOKENS.md). Existing hardcoded colors that the changed lines do not touch are not violations.',
    trueCriteria: 'The changed lines introduce no hardcoded color.',
    falseCriteria: 'The changed lines add or move a hardcoded color into scope.',
    threshold: 0.35,
  },
  {
    id: 'semantic-token-palette',
    title: 'Semantic tokens over raw Tailwind palette',
    appliesTo: UI_SOURCES,
    trigger:
      /\b(?:text|bg|border|ring|divide|from|via|to|outline|decoration|accent|caret|fill|stroke)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    instructions:
      'Do the UI changes in `file.diff` use the project semantic tokens instead of raw Tailwind palette classes? Neutral surfaces, ink, and borders belong to `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`; accents belong to `brand-*` or `feedback-*` (docs/DESIGN_TOKENS.md). Raw palette classes such as `text-gray-500` or `bg-blue-600` are violations. Untouched existing classes are not violations.',
    trueCriteria: 'Changed UI code uses semantic tokens, not raw palette classes.',
    falseCriteria: 'Changed UI code uses raw Tailwind palette classes.',
    threshold: 0.35,
  },
  {
    id: 'no-arbitrary-pixel',
    title: 'No arbitrary pixel values',
    appliesTo: UI_SOURCES,
    trigger: /-\[[0-9.]+(?:px|rem|em)\]|\bstyle=\{\{[^}]*(?:px|rem)/,
    instructions:
      'Does the changed code avoid arbitrary pixel/size values where the project scale or a token exists? Arbitrary Tailwind values like `w-[347px]` and inline `style={{ height: 213 }}` are violations, unless the diff shows the value must match an external asset or measurement (for example hanzi stroke data or media dimensions).',
    trueCriteria: 'Changed code uses the scale or a token, or the arbitrary value is required by external data.',
    falseCriteria: 'Changed code introduces an avoidable arbitrary pixel/size value.',
    threshold: 0.3,
  },
  {
    id: 'tactile-button-architecture',
    title: 'Tactile two-layer architecture',
    appliesTo: UI_SOURCES,
    trigger: /translate-y|border-b-0|--depth-|tactile|ActionButton/,
    instructions:
      'Do the changed interactive/tactile elements follow the two-layer architecture? A tactile action pairs an immovable base layer (`absolute inset-x-0 bottom-0 top-[length:var(--depth-md)] rounded-[inherit]`) with a moving front surface (`relative mb-[length:var(--depth-md)] group-active:translate-y-[length:var(--depth-md)]`). Violations: `active:border-b-0`, translating the whole outer button container, or mutating the bottom border on press. If the diff touches no tactile/primary action element, the rule holds.',
    trueCriteria: 'Changed tactile elements use the two-layer architecture, or none changed.',
    falseCriteria: 'Changed tactile elements break the stationary-base contract.',
    threshold: 0.35,
  },
  {
    id: 'focus-ring-usage',
    title: 'Standard focus ring',
    appliesTo: UI_SOURCES,
    trigger: /focus:|focus-visible:|ring-\d|outline-/,
    instructions:
      'Do interactive elements changed in `file.diff` use the standard `.focus-ring` (or `.focus-ring-inline`) class instead of manual focus ring utilities? Manual `focus-visible:ring-*` stacks, `outline-none` with no replacement, or ad-hoc focus styles are violations. NOTE: `ring-*` classes used WITHOUT a `focus-visible:` prefix as decorative open-state indicators (e.g. `ring-2 ring-white/40` on an open submenu button) are NOT a violation — only focus-visible-prefixed ring stacks replacing `.focus-ring` are flagged. If no focusable element changed, the rule holds.',
    trueCriteria: 'Changed focusable elements use .focus-ring, or none changed, or changed ring-* are decorative (no focus-visible: prefix).',
    falseCriteria: 'Changed focusable elements use ad-hoc focus-visible:ring-* stacks or outline-none with no replacement.',
    threshold: 0.35,
  },
  {
    id: 'no-direct-data-access',
    title: 'No direct data access in screens/widgets',
    appliesTo: [
      'src/screens/**/*.ts',
      'src/screens/**/*.tsx',
      'src/lib/widgets/**/*.ts',
      'src/lib/widgets/**/*.tsx',
    ],
    trigger: /supabase|createClient|fetch\(|axios|from ['"][^'"]*services\//,
    instructions:
      'Do the screens and shared widgets changed in `file.diff` avoid direct data access? These layers must not import Supabase clients, call `fetch`, or reach into `src/services/*`; fetching belongs in services called by hooks (features may own feature hooks/services). Importing types or pure utilities is fine.',
    trueCriteria: 'Changed screens/widgets contain no direct data access.',
    falseCriteria: 'Changed screens/widgets fetch or import data clients directly.',
    threshold: 0.4,
  },
  {
    id: 'no-hardcoded-font',
    title: 'Fonts through font-sans / font-chinese',
    appliesTo: UI_SOURCES,
    trigger: /font-\[|fontFamily|font-family/,
    instructions:
      'Does the changed code use `font-sans` for UI copy and `font-chinese` for Chinese glyphs instead of hardcoded font families? Inline `fontFamily`, `font-family`, or `font-[...]` arbitrary families are violations.',
    trueCriteria: 'Changed code uses the project font utilities.',
    falseCriteria: 'Changed code hardcodes a font family.',
    threshold: 0.35,
  },
  {
    id: 'no-platform-flag-emoji',
    title: 'Flags through CountryFlag',
    appliesTo: UI_SOURCES,
    trigger: /[\u{1F1E6}-\u{1F1FF}]/u,
    instructions:
      'Does the changed code avoid platform flag emoji? Flags must render through the `CountryFlag` component so platforms without emoji flag fonts still show them.',
    trueCriteria: 'Changed code uses CountryFlag or no flag at all.',
    falseCriteria: 'Changed code adds platform flag emoji.',
    threshold: 0.4,
  },
];
