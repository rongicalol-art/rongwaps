import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  isStrictAcceptance,
  listEmptyDirsRecursive,
  listFilesRecursive,
  PROJECT_ROOT,
} from '../acceptance_helpers';

test('Dependencies Acceptance: Dead dependencies removed from package.json', (t) => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const deadPackages = [
    'lucide-react',
    'swiper',
    'axios',
    'autoprefixer',
    '@tanstack/react-virtual',
  ];

  const presentInDeps = deadPackages.filter(
    (p) => (pkg.dependencies && p in pkg.dependencies) || (pkg.devDependencies && p in pkg.devDependencies),
  );

  if (!isStrictAcceptance() && presentInDeps.length > 0) {
    t.skip(`Dead dependencies removal pending: ${presentInDeps.join(', ')} still in package.json`);
    return;
  }

  assert.deepEqual(
    presentInDeps,
    [],
    `Forbidden dead dependencies found in package.json: ${presentInDeps.join(', ')}`,
  );
});

test('Dependencies Acceptance: Zero imports of lucide-react, swiper, or axios in src/ and vite.config.ts', (t) => {
  const targetFiles = [
    path.join(PROJECT_ROOT, 'vite.config.ts'),
    ...listFilesRecursive(path.join(PROJECT_ROOT, 'src'), (f) => f.endsWith('.ts') || f.endsWith('.tsx')),
  ];

  const forbiddenNames = ['lucide-react', 'swiper', 'axios'];
  const matches: { file: string; match: string }[] = [];

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const name of forbiddenNames) {
      if (content.includes(name)) {
        matches.push({ file: path.relative(PROJECT_ROOT, filePath), match: name });
      }
    }
  }

  if (!isStrictAcceptance() && matches.length > 0) {
    t.skip(`Dead package references pending removal: ${matches.map((m) => `${m.file} (${m.match})`).join(', ')}`);
    return;
  }

  assert.deepEqual(
    matches,
    [],
    `Found forbidden package references: ${JSON.stringify(matches)}`,
  );
});

test('Dependencies Acceptance: No empty directories under src/screens/ or src/features/', (t) => {
  const screensDir = path.join(PROJECT_ROOT, 'src/screens');
  const featuresDir = path.join(PROJECT_ROOT, 'src/features');

  const emptyDirs = [
    ...listEmptyDirsRecursive(screensDir),
    ...listEmptyDirsRecursive(featuresDir),
  ];

  if (!isStrictAcceptance() && emptyDirs.length > 0) {
    t.skip(`Empty directories pending cleanup: ${emptyDirs.map((d) => path.relative(PROJECT_ROOT, d)).join(', ')}`);
    return;
  }

  assert.deepEqual(
    emptyDirs,
    [],
    `Found empty ghost directories: ${emptyDirs.map((d) => path.relative(PROJECT_ROOT, d)).join(', ')}`,
  );
});

test('Dependencies Acceptance: Phantom stores are deleted or imported by components', (t) => {
  const phantomStoreFiles = [
    'useAuthStore.ts',
    'useNavigationStore.ts',
    'useSrsStore.ts',
    'useUiStore.ts',
    'useLibraryStore.ts',
    'useSyncStore.ts',
  ];

  const storeDir = path.join(PROJECT_ROOT, 'src/store');
  const existingPhantomStores = phantomStoreFiles.filter((file) =>
    fs.existsSync(path.join(storeDir, file)),
  );

  // If phantom store files exist, check if they are imported by any component in src/screens/ or src/features/ or src/components/
  if (existingPhantomStores.length > 0) {
    const componentFiles = listFilesRecursive(
      path.join(PROJECT_ROOT, 'src'),
      (f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('/store/'),
    );

    const unintegrated: string[] = [];
    for (const storeFile of existingPhantomStores) {
      const baseName = path.basename(storeFile, '.ts');
      let isImported = false;
      for (const compFile of componentFiles) {
        const content = fs.readFileSync(compFile, 'utf-8');
        if (content.includes(baseName)) {
          isImported = true;
          break;
        }
      }
      if (!isImported) {
        unintegrated.push(storeFile);
      }
    }

    if (!isStrictAcceptance() && unintegrated.length > 0) {
      t.skip(`Phantom stores pending removal or integration: ${unintegrated.join(', ')}`);
      return;
    }

    assert.deepEqual(
      unintegrated,
      [],
      `Phantom store files exist but are not imported by any component: ${unintegrated.join(', ')}`,
    );
  }
});

test('Dependencies Acceptance: package.json name is not "react-example"', (t) => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  if (!isStrictAcceptance() && pkg.name === 'react-example') {
    t.skip('package.json name change pending (currently "react-example")');
    return;
  }

  assert.notEqual(
    pkg.name,
    'react-example',
    'package.json name must not be "react-example"',
  );
});

test('Dependencies Acceptance: @tailwindcss/vite and @vitejs/plugin-react are in devDependencies', (t) => {
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const inDeps = ['@tailwindcss/vite', '@vitejs/plugin-react'].filter(
    (p) => pkg.dependencies && p in pkg.dependencies,
  );

  if (!isStrictAcceptance() && inDeps.length > 0) {
    t.skip(`Vite plugins still in dependencies: ${inDeps.join(', ')}`);
    return;
  }

  assert.deepEqual(
    inDeps,
    [],
    `Vite plugins must not be in dependencies: ${inDeps.join(', ')}`,
  );
  assert.ok(
    pkg.devDependencies && '@tailwindcss/vite' in pkg.devDependencies,
    '@tailwindcss/vite must be in devDependencies',
  );
  assert.ok(
    pkg.devDependencies && '@vitejs/plugin-react' in pkg.devDependencies,
    '@vitejs/plugin-react must be in devDependencies',
  );
});
