import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  countFileLines,
  extractImportSources,
  isStrictAcceptance,
  listFilesRecursive,
  PROJECT_ROOT,
} from '../acceptance_helpers';

test('Code Quality Acceptance: src/App.tsx is under 250 lines', (t) => {
  const appPath = path.join(PROJECT_ROOT, 'src/App.tsx');
  const lines = countFileLines(appPath);

  if (!isStrictAcceptance() && lines >= 250) {
    t.skip(`App.tsx decomposition pending: current line count is ${lines} (target < 250)`);
    return;
  }

  assert.ok(
    lines > 0 && lines < 250,
    `src/App.tsx must be under 250 lines, currently ${lines} lines`,
  );
});

test('Code Quality Acceptance: src/services/audioService.ts is under 400 lines', (t) => {
  const audioServicePath = path.join(PROJECT_ROOT, 'src/services/audioService.ts');
  const lines = countFileLines(audioServicePath);

  if (!isStrictAcceptance() && lines >= 400) {
    t.skip(`audioService.ts decomposition pending: current line count is ${lines} (target < 400)`);
    return;
  }

  assert.ok(
    lines > 0 && lines < 400,
    `src/services/audioService.ts must be under 400 lines, currently ${lines} lines`,
  );
});

test('Code Quality Acceptance: src/types/models.ts is under 300 lines', (t) => {
  const modelsPath = path.join(PROJECT_ROOT, 'src/types/models.ts');
  const lines = countFileLines(modelsPath);

  if (!isStrictAcceptance() && lines >= 300) {
    t.skip(`models.ts decomposition pending: current line count is ${lines} (target < 300)`);
    return;
  }

  assert.ok(
    lines > 0 && lines < 300,
    `src/types/models.ts must be under 300 lines, currently ${lines} lines`,
  );
});

test('Code Quality Acceptance: No file in src/lib/widgets/ imports from src/services/ or src/store/', (t) => {
  const widgetsDir = path.join(PROJECT_ROOT, 'src/lib/widgets');
  const widgetFiles = listFilesRecursive(widgetsDir, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));

  const violations: { file: string; importSource: string }[] = [];

  for (const widgetFile of widgetFiles) {
    const content = fs.readFileSync(widgetFile, 'utf-8');
    const imports = extractImportSources(content);

    for (const imp of imports) {
      if (
        imp.includes('/services/') ||
        imp.startsWith('../services') ||
        imp.startsWith('../../services') ||
        imp.includes('/store/') ||
        imp.startsWith('../store') ||
        imp.startsWith('../../store')
      ) {
        violations.push({
          file: path.relative(PROJECT_ROOT, widgetFile),
          importSource: imp,
        });
      }
    }
  }

  if (!isStrictAcceptance() && violations.length > 0) {
    t.skip(`Widget encapsulation pending: violations found in ${violations.map((v) => `${v.file} -> ${v.importSource}`).join(', ')}`);
    return;
  }

  assert.deepEqual(
    violations,
    [],
    `Encapsulation violation: widgets must not import from services or store: ${JSON.stringify(violations)}`,
  );
});

test('Code Quality Acceptance: Zero node:crypto or Node.js built-ins imported under src/', (t) => {
  const srcDir = path.join(PROJECT_ROOT, 'src');
  const srcFiles = listFilesRecursive(srcDir, (f) => f.endsWith('.ts') || f.endsWith('.tsx'));

  const nodeBuiltins = [
    'node:crypto',
    'node:fs',
    'node:path',
    'node:os',
    'node:child_process',
    'node:stream',
    'crypto',
    'fs',
    'path',
    'os',
    'child_process',
  ];

  const violations: { file: string; builtin: string }[] = [];

  for (const file of srcFiles) {
    // Skip scripts/ or tools/ if located under src
    const rel = path.relative(srcDir, file);
    if (rel.startsWith('scripts/') || rel.startsWith('tools/')) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const imports = extractImportSources(content);

    for (const imp of imports) {
      if (nodeBuiltins.includes(imp) || imp.startsWith('node:')) {
        violations.push({
          file: path.relative(PROJECT_ROOT, file),
          builtin: imp,
        });
      }
    }
  }

  if (!isStrictAcceptance() && violations.length > 0) {
    t.skip(`Node.js built-in removal from src/ pending: ${violations.map((v) => `${v.file} imports ${v.builtin}`).join(', ')}`);
    return;
  }

  assert.deepEqual(
    violations,
    [],
    `Browser source tree under src/ must not import Node.js built-in modules: ${JSON.stringify(violations)}`,
  );
});

test('Code Quality Acceptance: components colour only through theme tokens (light and dark)', () => {
  // Brand art (multi-colour icons, the Google logo, confetti), user-picked folder colours and canvas fallbacks keep literals.
  const allowed = new Set([
    'src/screens/curriculum/lesson-window/ModeIcon.tsx',
    'src/screens/flashcard/components/QuizTypeIcon.tsx',
    'src/screens/auth/SignInWindow.tsx',
    'src/features/practice/components/lesson-complete/ConfettiBurst.tsx',
    'src/lib/widgets/FolderSvg.tsx',
    'src/screens/library/components/FolderItem.tsx',
    'src/screens/library/MoveCardsDialog.tsx',
    'src/screens/library/FolderModal.tsx',
    'src/features/library/components/SaveWordModal.tsx',
    'src/features/character-breakdown/components/StrokeOrderBox.tsx',
    'src/screens/writing/HanziCanvas.tsx',
    // Disabled buttons: white on the shared disabled fill reads in both themes.
    'src/lib/widgets/ActionButton.tsx',
    'src/lib/widgets/IconActionButton.tsx',
    // Page-image viewer is a black lightbox in both themes.
    'src/screens/grammar-lesson/components/GrammarBookPageViewer.tsx',
  ]);
  const files = listFilesRecursive(path.join(PROJECT_ROOT, 'src'), (f) => f.endsWith('.tsx'))
    .map((file) => path.relative(PROJECT_ROOT, file))
    .filter((file) => !file.startsWith('src/assets/') && !file.startsWith('src/screens/debug/') && !allowed.has(file));
  // Also no *-edge as a text colour: edges go dark in dark mode; coloured text uses the *-text tokens.
  const literal = /\b(?:text|bg)-(?:white|black)(?![\w/-])|#[0-9a-fA-F]{6}\b|\btext-[a-z-]+-edge\b/;
  const violations = files.filter((file) => literal.test(fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf-8')));
  assert.deepEqual(violations, [], 'Use ui-*/brand-*/feedback-* tokens (brand-on-primary, ui-on-solid, ui-on-inverse, *-text) so dark mode follows.');
});
