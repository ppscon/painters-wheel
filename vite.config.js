import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'

/* Emits /sw.js at build time with the real hashed asset names injected,
   so a fresh install precaches the complete app (every lazy tab chunk
   included) and works fully offline afterwards. The cache version is a
   hash of the precache list: unchanged builds keep their caches. */
function serviceWorkerPlugin() {
  return {
    name: 'pw-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/'))
        .map((f) => '/' + f)
      const statics = [
        '/', '/munsell.json', '/manifest.webmanifest', '/favicon.svg',
        '/lessons/contrast.webp', '/lessons/value.webp', '/lessons/hue.webp', '/lessons/chroma.webp',
      ]
      const precache = [...statics, ...built]
      const version = createHash('sha256').update(JSON.stringify(precache)).digest('hex').slice(0, 12)
      const source = [
        `const CACHE = "pw-${version}";`,
        `const PRECACHE = ${JSON.stringify(precache)};`,
        `self.addEventListener("install", (e) => {`,
        `  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));`,
        `});`,
        `self.addEventListener("activate", (e) => {`,
        `  e.waitUntil(caches.keys()`,
        `    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pw-") && k !== CACHE).map((k) => caches.delete(k))))`,
        `    .then(() => self.clients.claim()));`,
        `});`,
        `self.addEventListener("fetch", (e) => {`,
        `  const req = e.request;`,
        `  if (req.method !== "GET") return;`,
        `  const url = new URL(req.url);`,
        `  if (req.mode === "navigate") {`,
        `    e.respondWith(fetch(req).then((res) => {`,
        `      const copy = res.clone();`,
        `      caches.open(CACHE).then((c) => c.put("/", copy));`,
        `      return res;`,
        `    }).catch(() => caches.match("/")));`,
        `    return;`,
        `  }`,
        `  const sameOrigin = url.origin === location.origin;`,
        `  if (sameOrigin && url.pathname.startsWith("/assets/")) {`,
        `    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {`,
        `      const copy = res.clone();`,
        `      caches.open(CACHE).then((c) => c.put(req, copy));`,
        `      return res;`,
        `    })));`,
        `    return;`,
        `  }`,
        `  const isFont = url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com");`,
        `  if (sameOrigin || isFont) {`,
        `    e.respondWith(caches.match(req).then((hit) => {`,
        `      const net = fetch(req).then((res) => {`,
        `        if (res && (res.ok || res.type === "opaque")) {`,
        `          const copy = res.clone();`,
        `          caches.open(CACHE).then((c) => c.put(req, copy));`,
        `        }`,
        `        return res;`,
        `      }).catch(() => hit);`,
        `      return hit || net;`,
        `    }));`,
        `  }`,
        `});`,
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// Ports pinned away from 5173/4173 to avoid collisions with other local projects.
export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  build: {
    rollupOptions: {
      output: {
        // React in its own chunk: it changes only on dependency bumps,
        // so it stays cached across app deploys (assets are immutable).
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    port: 5280,
    strictPort: true,
  },
  preview: {
    port: 5281,
    strictPort: true,
  },
})
