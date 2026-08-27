import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), decompositionRuntimeDevPackPlugin()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'motion', 'lucide-react'],
            // Supabase client is heavy (~200 kB) and only needed for auth/sync paths.
            supabase: ['@supabase/supabase-js'],
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
