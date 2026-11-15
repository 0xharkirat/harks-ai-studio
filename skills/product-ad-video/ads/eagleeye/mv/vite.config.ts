import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Serve the sibling folders (music, plates, assets) next to the app without copying them.
const mounts: Record<string, string> = {
  '/music/': path.resolve(__dirname, '../music/out'),
  '/plates/': path.resolve(__dirname, '../plates/out'),
  '/assets/': path.resolve(__dirname, '../assets'),
};

const types: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.glb': 'model/gltf-binary', '.fbx': 'application/octet-stream', '.md': 'text/plain', '.ts': 'text/plain',
};

function serveMounts(req: any, res: any, next: () => void) {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        for (const [prefix, dir] of Object.entries(mounts)) {
          if (!url.startsWith(prefix)) continue;
          const file = path.join(dir, url.slice(prefix.length));
          if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) break;
          res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(file).pipe(res);
          return;
        }
        next();
}

function mountDirs(): Plugin {
  return {
    name: 'mount-dirs',
    configureServer(server) { server.middlewares.use(serveMounts); },
    configurePreviewServer(server) { server.middlewares.use(serveMounts); },
  };
}

export default defineConfig({
  plugins: [mountDirs()],
  // No HMR by default: capture pages must never reload mid-render when a scene file changes.
  server: { fs: { allow: ['..'] }, hmr: process.env.MV_HMR === '1' },
  build: { chunkSizeWarningLimit: 4000 },
});
