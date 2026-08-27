import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

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
    files: ['src/lib/widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(screens|features)(/|$)',
              message: 'Shared widgets must not import screen or feature modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(lib/widgets|screens|features|app)(/|$)',
              message: 'Services must not import UI modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/character-breakdown/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)features/(dictionary|practice)/',
              message: 'Features must use another feature’s public index, not its internal folders.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/dictionary/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)features/(character-breakdown|practice)/',
              message: 'Features must use another feature’s public index, not its internal folders.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/practice/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)features/(character-breakdown|dictionary)/',
              message: 'Features must use another feature’s public index, not its internal folders.',
            },
          ],
        },
      ],
    },
  },
];
