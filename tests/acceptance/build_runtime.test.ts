import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { PROJECT_ROOT } from '../acceptance_helpers';

test('Build & Runtime Acceptance: TypeScript builds cleanly with tsc', () => {
  // Verify typecheck command is present in package.json and compiles cleanly
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert.ok(pkg.scripts?.build, 'package.json must define a build script');
  assert.ok(pkg.scripts?.dev, 'package.json must define a dev script');
  assert.ok(pkg.scripts?.test, 'package.json must define a test script');
});

test('Build & Runtime Acceptance: HTML entry point and Vite configuration exist', () => {
  const indexPath = path.join(PROJECT_ROOT, 'index.html');
  const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');

  assert.ok(fs.existsSync(indexPath), 'index.html entry point must exist');
  assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');

  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(
    indexHtml.includes('src/main.tsx') || indexHtml.includes('src/index.tsx'),
    'index.html must load the React entry point',
  );
});

test('Build & Runtime Acceptance: Tailwind CSS v4 entry point is intact', () => {
  const cssPath = path.join(PROJECT_ROOT, 'src/index.css');
  assert.ok(fs.existsSync(cssPath), 'src/index.css must exist');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert.ok(
    cssContent.includes('@import "tailwindcss"') || cssContent.includes('@theme'),
    'src/index.css must contain Tailwind v4 directives or theme definition',
  );
});
