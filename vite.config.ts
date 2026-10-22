import { studyPacksPlugin } from './scripts/performance/studyPacks';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Keep font definitions in their canonical generated source, parse only the chosen family at runtime. */
function chineseFontStylesPlugin(): Plugin {
  const families = new Set(['Huninn', 'Rounded-SC', 'TW-EduKai', 'LXGW-WenKai']);
  return {
    name: 'rongwaps-chinese-font-styles',
    enforce: 'pre',
    async load(id) {
      const [file, query] = id.split('?');
      const family = new URLSearchParams(query).get('family');
      if (!family || file !== path.resolve(__dirname, 'src/styles/fonts.generated.css')) return;
      if (!families.has(family)) throw new Error('Unknown Chinese font family');
      this.addWatchFile(file);
      const source = await readFile(file, 'utf8');
      return [...source.matchAll(/@font-face\s*\{[^}]+\}/g)]
        .map(([face]) => face).filter((face) => face.includes(`font-family: '${family}'`)).join('\n');
    },
  };
}

function decompositionRuntimeDevPackPlugin(): Plugin {
  const configuredPackRoot = process.env.DECOMPOSITION_RUNTIME_PACK_DIR
    || process.env.VITE_DECOMPOSITION_RUNTIME_PACK_DIR;
  const packCandidates = [
    'output/decomposition-runtime/production',
    'output/decomposition-runtime/phase4-full-coverage-candidate',
    'output/decomposition-runtime/phase4-candidate',
  ];
  const defaultPackRoot = packCandidates.find((dir) => (
    existsSync(path.resolve(__dirname, dir, 'manifest.json'))
  )) ?? packCandidates[0];
  const packRoot = path.resolve(
    __dirname,
    configuredPackRoot ?? defaultPackRoot,
  );
  return {
    name: 'rongwaps-decomposition-runtime-dev-pack',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__decomposition-runtime', async (request, response, next) => {
        const requestPath = decodeURIComponent((request.url || '/manifest.json').split('?')[0]);
        if (!requestPath.endsWith('.json')) {
          next();
          return;
        }
        const target = path.resolve(packRoot, `.${requestPath}`);
        if (target !== packRoot && !target.startsWith(`${packRoot}${path.sep}`)) {
          next();
          return;
        }
        try {
          const contents = await readFile(target);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(contents);
        } catch {
          next();
        }
      });
    },
  };
}

// Precache the actual entry graph. Unopened screens and animations are cached
// on first use instead of downloading the whole application after every update.
const shellAssets = new Set<string>();
const shellPrecachePlugin: Plugin = {
  name: 'rongwaps-shell-precache',
  generateBundle(_options, bundle) {
    shellAssets.clear();
    const visit = (name: string) => {
      if (shellAssets.has(name)) return;
      shellAssets.add(name);
      const chunk = bundle[name];
      if (chunk?.type === 'chunk') {
        chunk.imports.forEach(visit);
        const metadata = (chunk as typeof chunk & { viteMetadata?: { importedCss: Set<string> } }).viteMetadata;
        metadata?.importedCss.forEach((style) => shellAssets.add(style));
      }
    };
    for (const item of Object.values(bundle)) if (item.type === 'chunk' && item.isEntry) visit(item.fileName);
  },
};

const pwaPlugin = VitePWA({
  // Reuse the existing hand-written public/manifest.json; do not generate a
  // second manifest from the plugin.
  manifest: false,
  // 'prompt': a new service worker waits until the user taps Refresh
  // (src/app/components/PwaUpdatePrompt.tsx) instead of swapping mid-session.
  registerType: 'prompt',
  // Registration goes through virtual:pwa-register/react (single path).
  injectRegister: false,
  strategies: 'generateSW',
  devOptions: { enabled: false },
  workbox: {
    // Precache only the app shell. Large authored data packs (public/data,
    // public/videos) already load offline through IndexedDB
    // (staticContentService) and the audio Cache Storage, and must not be
    // precached here.
    globPatterns: ['index.html', 'icons/*.{svg,png,ico}', 'assets/*.{js,css}'],
    manifestTransforms: [async (entries) => ({
      manifest: entries.filter((entry) => !/\.(js|css)$/.test(entry.url) || shellAssets.has(entry.url)),
      warnings: [],
    })],
    globIgnores: [
      'data/**',
      'videos/**',
      // Chinese font slices (public/fonts/<family>/<family>.<n>.woff2): only the first
      // core slice (.0) is precached; the rest are
      // runtime-cached on first use (see the /fonts rule below).
      'fonts/*/*.[1-9].woff2',
      'fonts/*/*.[1-9][0-9].woff2',
      '**/sw.js',
      '**/workbox-*.js',
    ],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'rongwaps-assets',
          expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Self-hosted fonts excluded from the precache above: cached on first
        // fetch, then served from cache for a year.
        urlPattern: ({ url }) => url.pathname.startsWith('/fonts/') && url.pathname.endsWith('.woff2'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // LXGW WenKai TC (Chinese fallback behind the local TW-EduKai) is the
        // only remaining remote font. Cache it stale-while-revalidate.
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rongwaps-fonts',
          expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default defineConfig(() => {
  return {
    plugins: [studyPacksPlugin(), chineseFontStylesPlugin(), react(), tailwindcss(), decompositionRuntimeDevPackPlugin(), shellPrecachePlugin, pwaPlugin],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('hanzi-writer')) {
                return 'hanzi-writer';
              }
              if (id.includes('lottie-web') || id.includes('lottie-react')) {
                return 'vendor-lottie';
              }
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
            }
            // The part-id manifest (~10 KB) is the only grammar module the
            // curriculum dashboard, the activity wrapper and the dictionary
            // screens import — they just need to know which parts exist. Keep
            // it OUT of the authored-lesson chunk: while the two were grouped
            // together, every one of those statically-imported screens pulled
            // the whole ~2.4 MB lesson corpus (7 MB of raw JSON) onto its
            // critical path. The lesson corpus must stay reachable only
            // through dynamic import().
            if (id.includes('src/data/interactiveGrammarManifest')) {
              return 'data-grammar-manifest';
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
