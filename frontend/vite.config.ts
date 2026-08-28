import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function precacheServiceWorker(): Plugin {
  return {
    name: 'precache-service-worker',
    closeBundle() {
      const output = resolve(new URL('.', import.meta.url).pathname, 'dist');
      const manifest = JSON.parse(readFileSync(resolve(output, '.vite/manifest.json'), 'utf8')) as Record<string, {
        file: string;
        css?: string[];
      }>;
      const entry = manifest['index.html'];
      if (!entry) throw new Error('The Vite manifest is missing the application entry.');
      const shell = [
        '/', '/demo', '/favicon.svg', '/manifest.webmanifest',
        '/art/relay-clearing-720.webp', '/art/relay-clearing-1280.webp',
        `/${entry.file}`, ...(entry.css ?? []).map((file) => `/${file}`),
      ];
      writeFileSync(resolve(output, 'sw.js'), `const CACHE = 'haptic-beat-relay-v2';\nconst SHELL = ${JSON.stringify(shell)};\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));\n  self.clients.claim();\n});\n\nself.addEventListener('fetch', (event) => {\n  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;\n  event.respondWith((async () => {\n    try {\n      const response = await fetch(event.request);\n      if (response.ok) {\n        const cache = await caches.open(CACHE);\n        cache.put(event.request, response.clone());\n      }\n      return response;\n    } catch {\n      const cached = await caches.match(event.request);\n      if (cached) return cached;\n      if (event.request.mode === 'navigate') return (await caches.match('/')) || new Response('Offline', { status: 503 });\n      return new Response('', { status: 504, statusText: 'Offline asset unavailable' });\n    }\n  })());\n});\n`);
    },
  };
}

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    manifest: true,
  },
  plugins: [precacheServiceWorker()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
});
