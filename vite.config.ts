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

function decompositionRuntimeDevPackPlugin(): Plugin {
  const configuredPackRoot = process.env.DECOMPOSITION_RUNTIME_PACK_DIR
    || process.env.VITE_DECOMPOSITION_RUNTIME_PACK_DIR;
  const fullCoveragePack = 'output/decomposition-runtime/phase4-full-coverage-candidate';
  const defaultPackRoot = existsSync(path.resolve(__dirname, fullCoveragePack, 'manifest.json'))
    ? fullCoveragePack
    : 'output/decomposition-runtime/phase4-candidate';
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

const pwaPlugin = VitePWA({
  // Reuse the existing hand-written public/manifest.json; do not generate a
  // second manifest from the plugin.
  manifest: false,
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  strategies: 'generateSW',
  includeAssets: ['icons/*'],
  devOptions: { enabled: false },
  workbox: {
    // Precache only the app shell. Large authored data packs (public/data,
    // public/videos, public/hanzi-data) already load offline through IndexedDB
    // (staticContentService) and the audio Cache Storage, and must not be
    // precached here.
    globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
    globIgnores: [
      'data/**',
      'videos/**',
      'hanzi-data/**',
      '**/sw.js',
      '**/workbox-*.js',
    ],
    // Run the app shell (including the local TW-EduKai Chinese font) fully
    // offline; it must be in the precache even though it is larger than the
    // 2 MiB default.
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
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
    plugins: [react(), tailwindcss(), decompositionRuntimeDevPackPlugin(), pwaPlugin],
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
