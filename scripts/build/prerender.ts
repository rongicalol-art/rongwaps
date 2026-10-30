/**
 * After `vite build`: renders the public pages (landing, About, Sources, Privacy, Terms) to
 * static HTML so search engines and link previews see real content and per-page tags.
 *
 * Writes dist/index.html (landing) and dist/<page>.html; server/index.ts serves those for
 * their paths. The app removes `#prerender` once it has rendered (src/utils/browser/prerender.ts).
 */
import { readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { build } from 'vite';
import type { PrerenderedPage } from './prerenderEntry';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SITE_ORIGIN = 'https://ronsmandarin.com';

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function setTag(html: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) throw new Error(`prerender: index.html is missing ${pattern}`);
  return html.replace(pattern, replacement);
}

/**
 * In SSR, `new URL('../assets/x.webp', import.meta.url)` stays a file:// source path. Swap each
 * for the hashed file the client build emitted (dist/.vite/manifest.json).
 */
function mapAssetUrls(html: string, manifest: Record<string, { file: string }>): string {
  return html.replace(/file:\/\/[^"')\s]*?\/assets\/([^"')\s?]+)(\?[^"')\s]*)?/g, (match, rest: string) => {
    const entry = manifest[`src/assets/${rest}`];
    if (!entry) throw new Error(`prerender: no built asset for ${match}`);
    return `/${entry.file}`;
  });
}

function pageHtml(template: string, page: PrerenderedPage): string {
  const url = `${SITE_ORIGIN}${page.path}`;
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const socialDescription = escapeAttr(page.socialDescription ?? page.description);
  let html = template;
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${escapeText(page.title)}</title>`);
  html = setTag(html, /<meta name="title" content="[^"]*"\s*\/?>/, `<meta name="title" content="${title}" />`);
  html = setTag(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`);
  html = setTag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`);
  html = setTag(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${socialDescription}" />`);
  html = setTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${socialDescription}" />`);
  html = setTag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`);
  if (page.jsonLd) {
    html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>\n</head>`);
  }
  // A cached shell (service worker fallback) may serve this file for another path: show it only where it belongs.
  const guard = `<script>(function(){var p=document.getElementById('prerender');var here=location.pathname.replace(/\\/+$/,'')||'/';if(p&&p.getAttribute('data-path')!==here)document.documentElement.classList.remove('prerendered');})();</script>`;
  return setTag(html, /<div id="root"><\/div>/, `<div id="prerender" data-path="${page.path}">${page.html}</div>${guard}<div id="root"></div>`);
}

async function main() {
  // Inside the project so the SSR bundle resolves react and friends from node_modules.
  const outDir = path.join(ROOT, 'node_modules/.cache/rongwaps-prerender');
  try {
    await build({
      configFile: false,
      logLevel: 'warn',
      publicDir: false,
      build: {
        ssr: path.join(ROOT, 'scripts/build/prerenderEntry.tsx'),
        outDir,
        emptyOutDir: true,
        // The client build already wrote the assets; source URLs are mapped to them below.
        ssrEmitAssets: false,
        rollupOptions: { output: { entryFileNames: 'prerender.mjs' } },
      },
    });
    const { renderPages } = await import(pathToFileURL(path.join(outDir, 'prerender.mjs')).href) as typeof import('./prerenderEntry');
    const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
    const manifest = JSON.parse(await readFile(path.join(DIST, '.vite/manifest.json'), 'utf8')) as Record<string, { file: string }>;
    for (const rendered of renderPages()) {
      const page = { ...rendered, html: mapAssetUrls(rendered.html, manifest) };
      const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
      await writeFile(path.join(DIST, file), pageHtml(template, page));
      console.log(`prerender: ${page.path} -> dist/${file} (${Math.round(page.html.length / 1024)} kB)`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
