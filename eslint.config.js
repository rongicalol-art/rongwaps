import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Cross-screen feature packages (`src/features/<name>/`), each exposing one
 * public `index.ts`. Kept as data so the isolation rules below cannot drift
 * from the package list: adding a package here is the only edit needed
 * (see docs/ARCHITECTURE.md § Enforced boundaries).
 */
const FEATURE_PACKAGES = [
  'character-breakdown',
  'character-decomposition',
  'character-memory-hooks',
  'dictionary',
  'practice',
];

const FEATURE_ISOLATION_MESSAGE =
  'Features must use another feature’s public index, not its internal folders.';

/**
 * A cross-feature import is forbidden in both spellings: the explicit
 * `features/<other>/...` form and the relative `../<other>/...` form.
 * `no-restricted-imports` matches the raw import specifier, so the relative
 * form needs its own alternative — without it the rule silently matched
 * nothing, because every real in-`src` import is written relatively.
 */
function otherFeatureInternals(self) {
  const others = FEATURE_PACKAGES.filter((name) => name !== self).join('|');
  return [`(^|/)features/(${others})/`, `(^|/)(\\.\\./)+(${others})/`].map((regex) => ({
    regex,
    message: FEATURE_ISOLATION_MESSAGE,
  }));
}

/** Shared widgets are consumed through the `src/lib/widgets` barrel only. */
const WIDGET_BARREL_PATTERN = {
  regex: '(^|/)lib/widgets/(?!index)',
  message: 'Import shared widgets from the `src/lib/widgets` barrel, not their internal modules.',
};

/** Feature packages are consumed through their public `index.ts` only. */
const FEATURE_BARREL_PATTERN = {
  regex: `(^|/)features/(${FEATURE_PACKAGES.join('|')})/(?!index(\\.tsx?)?$)`,
  message: 'Import feature packages through their public index, not their internal files.',
};

/**
 * Consumers of the feature/widget layers. Feature files get their own rules
 * below; tests are deliberately excluded so unit tests can still reach the
 * internals they exercise. `src/lib/widgets` and `src/services` are excluded
 * too: both carry a stricter rule of their own, and a later config replaces
 * (never merges) the `no-restricted-imports` setting for the same file.
 */
const CONSUMER_LAYERS = [
  'src/app/**/*.{ts,tsx}',
  'src/screens/**/*.{ts,tsx}',
  'src/hooks/**/*.{ts,tsx}',
  'src/store/**/*.{ts,tsx}',
  'src/utils/**/*.{ts,tsx}',
  'src/data/**/*.{ts,tsx}',
  'src/types/**/*.{ts,tsx}',
];

const restricted = (patterns) => ['error', { patterns }];

export default [
  {
    ignores: [
      '.vite/**/*',
      'dist/**/*',
      'node_modules/**/*',
      'output/**/*',
      'public/**/*',
      'tmp/**/*',
      '*.config.js',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restricted([
        {
          regex: '(^|/)src/(app|screens|features|lib|hooks|store|services/supabaseClient)(/|$)',
          message: 'Server code must not import browser application infrastructure; use server-owned modules.',
        },
      ]),
    },
  },
  {
    files: ['src/lib/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restricted([
        {
          regex: '(^|/)(screens|features)(/|$)',
          message: 'Shared widgets must not import screen or feature modules.',
        },
        WIDGET_BARREL_PATTERN,
      ]),
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restricted([
        {
          regex: '(^|/)(lib/widgets|screens|features|app)(/|$)',
          message: 'Services must not import UI modules.',
        },
      ]),
    },
  },
  {
    files: CONSUMER_LAYERS,
    rules: {
      'no-restricted-imports': restricted([FEATURE_BARREL_PATTERN, WIDGET_BARREL_PATTERN]),
    },
  },
  // One isolation override per feature package: no other feature's internals,
  // and shared widgets only through the barrel.
  ...FEATURE_PACKAGES.map((pkg) => ({
    files: [`src/features/${pkg}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': restricted([...otherFeatureInternals(pkg), WIDGET_BARREL_PATTERN]),
    },
  })),
];
