import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const entry = html.match(/<script[^>]+src="([^" ]+\.js)"/)?.[1];
assert.ok(entry, 'Build the production app before checking budgets.');
const preload = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((match) => match[1]);
const files = [...new Set([entry, ...preload])];
const sizes = await Promise.all(files.map(async (path) => ({ path, bytes: (await stat(resolve(root, `dist${path}`))).size })));
const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
assert.ok(sizes[0].bytes <= 250_000, `Main entry exceeds 250 kB: ${sizes[0].bytes}`);
assert.ok(total <= 850_000, `Initial JS exceeds 850 kB: ${total}`);
const style = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
assert.ok(style);
const css = (await stat(resolve(root, `dist${style}`))).size;
assert.ok(css <= 260_000, `Critical CSS exceeds 260 kB: ${css}`);
const assets = await readdir(resolve(root, 'dist/assets'));
for (const worker of ['quizPlanner.worker-']) {
  assert.ok(assets.some((file) => file.startsWith(worker)), `Missing production worker: ${worker}`);
}
assert.ok(!assets.some(file => file.startsWith('dictionarySearch.worker-')), 'Dictionary indexing must stay on the server');
const studyManifest = JSON.parse(await readFile(resolve(root, 'dist/data/study/manifest.json'), 'utf8'));
for (const part of studyManifest.parts) {
  const bytes = (await stat(resolve(root, `dist${part.path}.br`))).size;
  assert.ok(bytes <= 30_000, `Study part exceeds 30 kB Brotli: ${part.path} (${bytes})`);
}
for (const book of await readdir(resolve(root, 'dist/data/book-pages'), { withFileTypes: true })) {
  if (!book.isDirectory()) continue;
  for (const page of (await readdir(resolve(root, 'dist/data/book-pages', book.name))).filter((file) => file.endsWith('.webp'))) {
    const bytes = (await stat(resolve(root, 'dist/data/book-pages', book.name, page))).size;
    assert.ok(bytes <= 250_000, `Book page exceeds 250 kB: ${book.name}/${page} (${bytes})`);
  }
}
const sw = await readFile(resolve(root, 'dist/sw.js'), 'utf8');
const precached = [...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((match) => match[1]);
assert.ok(precached.length > 0, 'Service-worker precache must contain the shell');
assert.equal(new Set(precached).size, precached.length, 'Service-worker precache must not repeat assets');
assert.ok(!precached.some((path) => /vendor-lottie|quizPlanner\.worker|dictionarySearch\.worker/.test(path)), 'Unused animation and workers must load on demand');
const precacheBytes = (await Promise.all(precached.map((path) => stat(resolve(root, 'dist', path))))).reduce((sum, entry) => sum + entry.size, 0);
assert.ok(precacheBytes <= 1_300_000, `Shell precache exceeds 1300 kB: ${precacheBytes}`);
console.log(JSON.stringify({ mainEntryBytes: sizes[0].bytes, initialJsBytes: total, criticalCssBytes: css, precacheBytes, budgets: 'pass' }, null, 2));
